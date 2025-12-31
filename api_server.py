"""
AKShare 数据服务 API - 优化版
1. 支持历史最高点 (ATH) 计算
2. 增加缓存机制，防止频繁爬取导致被封及响应慢
3. 适配 Render 部署，解决 404 及端口绑定问题
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_caching import Cache
import akshare as ak
import pandas as pd
from datetime import datetime, timedelta
import os
import pytz

app = Flask(__name__)
CORS(app)

# --- 缓存配置 (重要：解决加载慢的问题) ---
# 缓存时间设为 6 小时 (21600秒)，因为指数历史数据不需要实时更新
cache = Cache(app, config={
    'CACHE_TYPE': 'simple', 
    'CACHE_DEFAULT_TIMEOUT': 21600
})

BEIJING_TZ = pytz.timezone("Asia/Shanghai")

def get_beijing_time():
    return datetime.now(BEIJING_TZ)

def is_trading_hours():
    """判断是否在交易时间内（A股：9:30-11:30, 13:00-15:00）"""
    beijing_time = get_beijing_time()
    day = beijing_time.weekday()  # 0=周一, 6=周日
    hour = beijing_time.hour
    minute = beijing_time.minute
    time_in_minutes = hour * 60 + minute
    
    # 周末不交易
    if day >= 5:  # 周六(5)或周日(6)
        return False
    
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

def get_target_trade_date():
    """获取应该使用的交易日日期字符串（YYYY-MM-DD格式）"""
    beijing_time = get_beijing_time()
    hour = beijing_time.hour
    minute = beijing_time.minute
    time_in_minutes = hour * 60 + minute
    
    target_date = beijing_time
    
    # 如果在交易时间内（9:30-11:30 或 13:00-15:00），使用上一个交易日
    morning_start = 9 * 60 + 30
    morning_end = 11 * 60 + 30
    afternoon_start = 13 * 60
    afternoon_end = 15 * 60
    
    in_trading_hours = (
        (morning_start <= time_in_minutes <= morning_end) or
        (afternoon_start <= time_in_minutes <= afternoon_end)
    )
    
    if in_trading_hours:
        # 在交易时间内，往前推一天
        target_date = target_date - timedelta(days=1)
    
    # 如果是周末，往前推到周五
    while target_date.weekday() >= 5:  # 周六(5)或周日(6)
        target_date = target_date - timedelta(days=1)
    
    return target_date.strftime("%Y-%m-%d")

# --- 路由 1: 根路径 (解决 Render 的 404 问题) ---
@app.route("/")
def health_check():
    return jsonify({
        "status": "online",
        "message": "Stock Data API is running",
        "beijing_time": get_beijing_time().strftime("%Y-%m-%d %H:%M:%S")
    })

# --- 路由 2: 获取指数数据 (含历史最高点) ---
@app.route("/api/akshare/index", methods=["GET"])
def get_index_data():
    symbol = request.args.get("symbol", "")
    print(f"收到请求 symbol: {symbol}")
    
    # 使用缓存键，确保不同 symbol 的缓存是独立的
    cache_key = f"index_data_{symbol}"
    cached_result = cache.get(cache_key)
    if cached_result is not None:
        print(f"命中缓存: {symbol}")
        return jsonify(cached_result)
    if not symbol:
        return jsonify({"error": "缺少参数 symbol"}), 400
    
    try:
        # 获取全量历史数据 (从1990年开始，确保覆盖历史最高点)
        # 注意：akshare 内部会打印进度条，缓存后只有第一次会慢
        df = ak.index_zh_a_hist(
            symbol=symbol,
            period="daily",
            start_date="19900101",
            end_date=datetime.now().strftime("%Y%m%d")
        )
        print(f"df: {df}")
        
        if df.empty:
            return jsonify({"error": "未获取到数据"}), 404

        # 计算历史最高点 (ATH)
        ath_value = float(df["最高"].max())
        ath_date = df.loc[df["最高"].idxmax(), "日期"]
        if hasattr(ath_date, "strftime"):
            ath_date_str = ath_date.strftime("%Y-%m-%d")
        else:
            ath_date_str = str(ath_date)
            
        # 获取当前最新点位
        current_val = float(df["收盘"].iloc[-1])
        last_update = str(df["日期"].iloc[-1])
        
        # 计算距离最高点的回撤
        drawdown = round(((current_val - ath_value) / ath_value) * 100, 2)

        # 准备给前端绘图用的最近 1 年 K 线数据
        recent_df = df.tail(250)
        daily_history = []
        for _, row in recent_df.iterrows():
            date_val = row["日期"]
            if hasattr(date_val, "strftime"):
                date_str = date_val.strftime("%Y-%m-%d")
            else:
                date_str = str(date_val)
            
            daily_history.append({
                "date": date_str,
                "open": float(row["开盘"]) if pd.notna(row["开盘"]) else None,
                "high": float(row["最高"]) if pd.notna(row["最高"]) else None,
                "low": float(row["最低"]) if pd.notna(row["最低"]) else None,
                "close": float(row["收盘"]) if pd.notna(row["收盘"]) else None,
                "volume": float(row["成交量"]) if pd.notna(row["成交量"]) else None,
            })

        result = {
            "symbol": symbol,
            "name": f"指数 {symbol}",
            "current_point": current_val,
            "ath_point": ath_value,
            "ath_date": ath_date_str,
            "drawdown_percent": f"{drawdown}%",
            "last_update": last_update,
            "daily": daily_history,
            "target_trade_date": get_target_trade_date(),
            "in_trading_hours": is_trading_hours()
        }
        
        # 缓存结果
        cache.set(cache_key, result, timeout=21600)
        print(f"返回数据 symbol: {symbol}, 当前点位: {current_val}")
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- 路由 3: 股票数据 (逻辑同上) ---
@app.route("/api/akshare/stock", methods=["GET"])
@cache.memoize(timeout=21600)
def get_stock_data():
    symbol = request.args.get("symbol", "")
    if not symbol:
        return jsonify({"error": "缺少参数 symbol"}), 400
    
    try:
        # 股票获取全量历史进行前复权
        df = ak.stock_zh_a_hist(
            symbol=symbol,
            period="daily",
            start_date="19900101",
            end_date=datetime.now().strftime("%Y%m%d"),
            adjust="qfq"
        )
        
        if df.empty:
            return jsonify({"error": "未获取到数据"}), 404
            
        ath_value = float(df["最高"].max())
        current_val = float(df["收盘"].iloc[-1])
        
        return jsonify({
            "symbol": symbol,
            "current_point": current_val,
            "ath_point": ath_value,
            "drawdown_percent": f"{round(((current_val - ath_value) / ath_value) * 100, 2)}%",
            "last_update": str(df["日期"].iloc[-1])
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # 支持环境变量 PORT，默认使用 5001（与前端配置一致）
    port = int(os.environ.get("PORT", 5001))
    # 本地开发时开启 debug，生产环境通过环境变量控制
    debug = os.environ.get("DEBUG", "False").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)