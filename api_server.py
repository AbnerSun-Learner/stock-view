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
@cache.memoize(timeout=21600)  # 缓存相同参数的查询结果
def get_index_data():
    symbol = request.args.get("symbol", "")
    print(f"收到请求 symbol: {symbol}")
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
            daily_history.append({
                "date": str(row["日期"]),
                "close": float(row["收盘"]),
                "high": float(row["最高"])
            })

        print(f"返回数据 symbol: {symbol}，是否命中缓存: {request.path in cache.cache._cache}")
        return jsonify({
            "symbol": symbol,
            "name": f"指数 {symbol}",
            "current_point": current_val,
            "ath_point": ath_value,
            "ath_date": ath_date_str,
            "drawdown_percent": f"{drawdown}%",
            "last_update": last_update,
            "daily": daily_history
        })
        
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