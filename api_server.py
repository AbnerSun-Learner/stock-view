"""
AKShare 数据服务 API
提供指数和股票历史数据查询接口
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import akshare as ak  # type: ignore[import]
import pandas as pd  # type: ignore[import]
from datetime import datetime, timedelta
import os
import pytz

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 北京时间时区
BEIJING_TZ = pytz.timezone("Asia/Shanghai")


def get_beijing_time():
    """获取北京时间"""
    return datetime.now(BEIJING_TZ)


def is_trading_hours():
    """判断是否在交易时间内（9:30-11:30, 13:00-15:00）"""
    beijing_time = get_beijing_time()
    day = beijing_time.weekday()  # 0=周一, 6=周日
    
    # 周末不交易
    if day >= 5:  # 周六或周日
        return False
    
    hour = beijing_time.hour
    minute = beijing_time.minute
    time_in_minutes = hour * 60 + minute
    
    # 上午：9:30-11:30
    morning_start = 9 * 60 + 30
    morning_end = 11 * 60 + 30
    # 下午：13:00-15:00
    afternoon_start = 13 * 60
    afternoon_end = 15 * 60
    
    return (
        (morning_start <= time_in_minutes <= morning_end) or
        (afternoon_start <= time_in_minutes <= afternoon_end)
    )


def is_after_market_close():
    """判断是否在收盘之后（15:00之后）"""
    beijing_time = get_beijing_time()
    hour = beijing_time.hour
    minute = beijing_time.minute
    time_in_minutes = hour * 60 + minute
    
    return time_in_minutes >= 15 * 60


def get_target_trade_date():
    """
    获取目标交易日
    - 如果在交易时间内，返回上一个交易日
    - 如果在收盘后，返回当天交易日
    """
    beijing_time = get_beijing_time()
    target_date = beijing_time
    
    # 如果在交易时间内，使用上一个交易日
    if is_trading_hours():
        target_date = target_date - timedelta(days=1)
    
    # 如果是周末，往前推到周五
    while target_date.weekday() >= 5:  # 周六或周日
        target_date = target_date - timedelta(days=1)
    
    return target_date.strftime("%Y-%m-%d")


@app.route("/api/akshare/index", methods=["GET"])
def get_index_data():
    """
    获取指数历史数据
    参数：
    - symbol: 指数代码（如 000300, 399001, 930955）
    - period: 数据周期（daily/weekly/monthly），默认 daily
    - start_date: 开始日期（YYYYMMDD），可选
    - end_date: 结束日期（YYYYMMDD），可选
    """
    symbol = request.args.get("symbol", "")
    period = request.args.get("period", "daily")
    
    if not symbol:
        return jsonify({"error": "缺少参数 symbol"}), 400
    
    try:
        # 使用 AKShare 获取指数历史数据
        # 根据 AKShare 文档，使用 index_zh_a_hist 接口
        end_date = datetime.now().strftime("%Y%m%d")
        start_date = (datetime.now() - timedelta(days=365)).strftime("%Y%m%d")
        
        # 调用 AKShare 接口
        df = ak.index_zh_a_hist(
            symbol=symbol,
            period=period,
            start_date=start_date,
            end_date=end_date
        )
        
        if df.empty:
            return jsonify({"error": "未获取到数据"}), 404
        
        # 转换为 JSON 格式
        daily_data = []
        for _, row in df.iterrows():
            daily_data.append({
                "date": row["日期"].strftime("%Y-%m-%d") if hasattr(row["日期"], "strftime") else str(row["日期"]),
                "open": float(row["开盘"]) if pd.notna(row["开盘"]) else None,
                "high": float(row["最高"]) if pd.notna(row["最高"]) else None,
                "low": float(row["最低"]) if pd.notna(row["最低"]) else None,
                "close": float(row["收盘"]) if pd.notna(row["收盘"]) else None,
                "volume": float(row["成交量"]) if pd.notna(row["成交量"]) else None,
            })
        
        # 获取指数名称（从第一行数据或通过其他方式）
        name = None
        if len(df) > 0:
            # 尝试从 AKShare 获取名称
            try:
                # 可以通过其他接口获取名称
                name = symbol  # 暂时使用代码，后续可以优化
            except:
                pass
        
        # 根据交易日规则过滤数据
        target_date = get_target_trade_date()
        in_trading_hours = is_trading_hours()
        
        # 如果在交易时间内，过滤掉今天的数据
        filtered_data = daily_data
        if in_trading_hours:
            today_str = datetime.now().strftime("%Y-%m-%d")
            filtered_data = [d for d in daily_data if d["date"] != today_str]
        
        return jsonify({
            "name": name,
            "daily": filtered_data,
            "target_trade_date": target_date,
            "in_trading_hours": in_trading_hours
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/akshare/stock", methods=["GET"])
def get_stock_data():
    """
    获取股票历史数据
    参数：
    - symbol: 股票代码（如 000001, 600000）
    - period: 数据周期（daily/weekly/monthly），默认 daily
    """
    symbol = request.args.get("symbol", "")
    period = request.args.get("period", "daily")
    
    if not symbol:
        return jsonify({"error": "缺少参数 symbol"}), 400
    
    try:
        # 使用 AKShare 获取股票历史数据
        end_date = datetime.now().strftime("%Y%m%d")
        start_date = (datetime.now() - timedelta(days=365)).strftime("%Y%m%d")
        
        # 调用 AKShare 接口
        df = ak.stock_zh_a_hist(
            symbol=symbol,
            period=period,
            start_date=start_date,
            end_date=end_date,
            adjust="qfq"  # 前复权
        )
        
        if df.empty:
            return jsonify({"error": "未获取到数据"}), 404
        
        # 转换为 JSON 格式
        daily_data = []
        for _, row in df.iterrows():
            date_val = row["日期"]
            if hasattr(date_val, "strftime"):
                date_str = date_val.strftime("%Y-%m-%d")
            elif isinstance(date_val, str):
                date_str = date_val
            else:
                date_str = str(date_val)
            
            daily_data.append({
                "date": date_str,
                "open": float(row["开盘"]) if pd.notna(row["开盘"]) else None,
                "high": float(row["最高"]) if pd.notna(row["最高"]) else None,
                "low": float(row["最低"]) if pd.notna(row["最低"]) else None,
                "close": float(row["收盘"]) if pd.notna(row["收盘"]) else None,
                "volume": float(row["成交量"]) if pd.notna(row["成交量"]) else None,
            })
        
        # 根据交易日规则过滤数据
        target_date = get_target_trade_date()
        in_trading_hours = is_trading_hours()
        
        # 如果在交易时间内，过滤掉今天的数据
        filtered_data = daily_data
        if in_trading_hours:
            today_str = datetime.now().strftime("%Y-%m-%d")
            filtered_data = [d for d in daily_data if d["date"] != today_str]
        
        return jsonify({
            "name": None,  # 股票名称可以通过其他接口获取
            "daily": filtered_data,
            "target_trade_date": target_date,
            "in_trading_hours": in_trading_hours
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    debug = os.environ.get("DEBUG", "False").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)

