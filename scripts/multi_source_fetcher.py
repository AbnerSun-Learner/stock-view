#!/usr/bin/env python3
"""
多数据源股票数据获取器 - 优先使用免费且稳定的数据源
支持多个数据源自动切换，确保稳定性

数据源优先级：
1. 东方财富网（eastmoney.com）- 最稳定
2. 新浪财经（sina.com.cn）- 备选
3. 腾讯财经（qq.com）- 备选
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import urllib3

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def _fail(message: str) -> None:
    sys.stderr.write(message.strip() + "\n")
    sys.exit(1)


def _safe_float(value: Any) -> Optional[float]:
    if value in (None, "", "None"):
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if parsed != parsed:  # NaN check
        return None
    return parsed


def _normalize_code(code: str) -> str:
    """标准化股票代码格式"""
    code = code.strip().upper()
    # 移除常见后缀
    code = code.replace(".SZ", "").replace(".SH", "").replace(".BJ", "")
    # 如果是 sz. 或 sh. 前缀，转换为纯数字
    if code.startswith("SZ.") or code.startswith("SH.") or code.startswith("BJ."):
        code = code.split(".", 1)[1]
    return code


def _get_market_prefix(code: str) -> str:
    """根据代码判断市场前缀"""
    code = _normalize_code(code)
    if code.startswith("6") or code.startswith("51"):
        return "sh"  # 上海（股票6开头，ETF 51开头）
    elif code.startswith("0") or code.startswith("3") or code.startswith("15"):
        return "sz"  # 深圳（股票0/3开头，ETF 15开头）
    elif code.startswith("8") or code.startswith("4"):
        return "bj"  # 北京
    else:
        # 默认尝试深圳
        return "sz"


def _get_market_code_for_api(code: str) -> str:
    """获取API需要的市场代码（数字格式）"""
    code = _normalize_code(code)
    if code.startswith("6") or code.startswith("51"):
        return "1"  # 上海（股票6开头，ETF 51开头）
    elif code.startswith("0") or code.startswith("3") or code.startswith("15"):
        return "0"  # 深圳（股票0/3开头，ETF 15开头）
    elif code.startswith("8") or code.startswith("4"):
        return "0"  # 北京（暂时用深圳代码）
    else:
        return "0"  # 默认深圳


def _create_session() -> requests.Session:
    """创建带重试策略的session"""
    session = requests.Session()
    retry_strategy = Retry(
        total=3,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/json,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    })
    return session


# ==================== 数据源 1: 东方财富 ====================
def _fetch_from_eastmoney(code: str) -> tuple[Optional[str], List[Dict[str, Any]]]:
    """从东方财富获取数据"""
    try:
        normalized_code = _normalize_code(code)
        market = _get_market_prefix(normalized_code)
        # 东方财富API格式: sh600000 或 sz000001
        eastmoney_code = f"{market}{normalized_code}"
        
        session = _create_session()
        
        # 优先使用K线数据API获取历史数据（可以获取更多历史数据用于计算最高价）
        kline_url = "http://push2his.eastmoney.com/api/qt/stock/kline/get"
        today = datetime.now().strftime("%Y%m%d")
        # 获取最近5年的数据（约1200个交易日）
        # API需要市场代码为数字：0=深圳，1=上海
        market_code = _get_market_code_for_api(normalized_code)
        kline_params = {
            "secid": f"{market_code}.{normalized_code}",
            "ut": "fa5fd1943c7b386f172d6893dbfba10b",
            "fields1": "f1,f2,f3,f4,f5,f6",
            "fields2": "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61",
            "klt": "101",  # 日K
            "fqt": "1",    # 前复权
            "beg": "0",
            "end": "20500000",
            "lmt": "1500",  # 增加限制以获取更多历史数据
        }
        
        response = session.get(kline_url, params=kline_params, timeout=15, verify=False)
        if response.status_code == 200:
            data = response.json()
            if data.get("data") and data["data"].get("klines"):
                klines = data["data"]["klines"]
                name = data["data"].get("name")
                daily = []
                
                for kline_str in klines:
                    parts = kline_str.split(",")
                    if len(parts) >= 11:
                        date_str = parts[0]  # YYYY-MM-DD
                        open_price = _safe_float(parts[1])
                        close_price = _safe_float(parts[2])
                        high_price = _safe_float(parts[3])
                        low_price = _safe_float(parts[4])
                        volume = _safe_float(parts[5])
                        
                        if date_str and close_price is not None:
                            daily.append({
                                "date": date_str,
                                "open": open_price,
                                "high": high_price,
                                "low": low_price,
                                "close": close_price,
                                "volume": volume,
                            })
                
                if daily:
                    return (str(name).strip() if name else None, daily)
        
    except Exception as e:
        pass
    
    return (None, [])


# ==================== 数据源 2: 新浪财经 ====================
# def _fetch_from_sina(code: str) -> tuple[Optional[str], List[Dict[str, Any]]]:
#     """从新浪财经获取数据"""
#     try:
#         normalized_code = _normalize_code(code)
#         market = _get_market_prefix(normalized_code)
#         # 新浪格式: sh600000 或 sz000001
#         sina_code = f"{market}{normalized_code}"
        
#         session = _create_session()
        
#         # 新浪实时行情API
#         url = f"http://hq.sinajs.cn/list={sina_code}"
#         response = session.get(url, timeout=10, verify=False)
        
#         if response.status_code == 200:
#             text = response.text
#             # 解析格式: var hq_str_sh600000="平安银行,12.34,12.35,...";
#             match = re.search(r'="([^"]+)"', text)
#             if match:
#                 data_str = match.group(1)
#                 parts = data_str.split(",")
                
#                 if len(parts) >= 32:
#                     name = parts[0]
#                     today_open = _safe_float(parts[1])
#                     yesterday_close = _safe_float(parts[2])
#                     current_price = _safe_float(parts[3])
#                     today_high = _safe_float(parts[4])
#                     today_low = _safe_float(parts[5])
#                     volume = _safe_float(parts[8])
#                     # 收盘价使用当前价（如果是收盘后）或昨日收盘价
#                     close_price = current_price if current_price else yesterday_close
                    
#                     if close_price is not None:
#                         today = datetime.now().strftime("%Y-%m-%d")
#                         daily = [{
#                             "date": today,
#                             "open": today_open,
#                             "high": today_high,
#                             "low": today_low,
#                             "close": close_price,
#                             "volume": volume,
#                         }]
#                         return (name.strip() if name else None, daily)
        
#     except Exception as e:
#         pass
    
#     return (None, [])


# # ==================== 数据源 3: 腾讯财经 ====================
# def _fetch_from_tencent(code: str) -> tuple[Optional[str], List[Dict[str, Any]]]:
    """从腾讯财经获取数据"""
    try:
        normalized_code = _normalize_code(code)
        market = _get_market_prefix(normalized_code)
        # 腾讯格式: sh600000 或 sz000001
        tencent_code = f"{market}{normalized_code}"
        
        session = _create_session()
        
        # 腾讯实时行情API
        url = f"http://qt.gtimg.cn/q={tencent_code}"
        response = session.get(url, timeout=10, verify=False)
        
        if response.status_code == 200:
            text = response.text
            # 解析格式: v_sh600000="1~平安银行~000001~12.34~12.35~...";
            match = re.search(r'="([^"]+)"', text)
            if match:
                data_str = match.group(1)
                parts = data_str.split("~")
                
                if len(parts) >= 6:
                    name = parts[1]
                    current_price = _safe_float(parts[3])
                    yesterday_close = _safe_float(parts[4])
                    today_open = _safe_float(parts[5])
                    today_high = _safe_float(parts[33]) if len(parts) > 33 else None
                    today_low = _safe_float(parts[34]) if len(parts) > 34 else None
                    volume = _safe_float(parts[6])
                    
                    close_price = current_price if current_price else yesterday_close
                    
                    if close_price is not None:
                        today = datetime.now().strftime("%Y-%m-%d")
                        daily = [{
                            "date": today,
                            "open": today_open,
                            "high": today_high,
                            "low": today_low,
                            "close": close_price,
                            "volume": volume,
                        }]
                        return (name.strip() if name else None, daily)
        
    except Exception as e:
        pass
    
    return (None, [])


# ==================== 主函数：多数据源尝试 ====================
def _fetch_realtime_daily(code: str) -> tuple[Optional[str], List[Dict[str, Any]]]:
    """
    从多个数据源获取数据，按优先级自动切换
    返回 (name, daily_data_list)
    """
    # 按优先级尝试各个数据源
    sources = [
        ("东方财富", _fetch_from_eastmoney),
        # ("新浪财经", _fetch_from_sina),
        # ("腾讯财经", _fetch_from_tencent),
    ]
    
    last_error = None
    for source_name, fetch_func in sources:
        try:
            name, daily = fetch_func(code)
            if daily and len(daily) > 0:
                # 确保至少有一条有效数据
                valid_data = [d for d in daily if d.get("close") is not None]
                if valid_data:
                    return (name, valid_data)
        except Exception as e:
            last_error = e
            continue
    
    # 如果所有数据源都失败
    if last_error:
        _fail(f"所有数据源获取失败，最后错误: {last_error}")
    else:
        _fail(f"所有数据源获取失败，未找到有效数据")


def get_etf_today_close_price(code: str) -> tuple[Optional[str], Optional[float], Optional[str]]:
    """
    专门获取ETF当天的收盘价格
    返回 (name, close_price, date)
    """
    try:
        name, daily = _fetch_realtime_daily(code)
        if not daily:
            return (name, None, None)
        
        # 获取今天的日期
        today = datetime.now().strftime("%Y-%m-%d")
        
        # 优先查找今天的数据
        for item in daily:
            if item.get("date") == today and item.get("close") is not None:
                close_price = round(float(item.get("close")), 3)
                return (name, close_price, today)
        
        # 如果没有今天的数据，返回最新的一条数据
        if daily:
            latest = daily[-1]
            close_price = round(float(latest.get("close")), 3) if latest.get("close") is not None else None
            return (name, close_price, latest.get("date"))
        
        return (name, None, None)
    except Exception as e:
        return (None, None, None)


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        _fail(f"Invalid JSON input: {exc}")

    code = payload.get("code")
    if code is None:
        code = ""
    
    # 如果指定了只获取当天收盘价（用于ETF）
    only_today_close = payload.get("only_today_close", False)

    try:
        if only_today_close:
            # 专门获取ETF当天收盘价格
            name, close_price, date = get_etf_today_close_price(code)
            output = {
                "name": name,
                "close_price": close_price,
                "date": date,
            }
        else:
            # 获取完整的历史数据
            name, daily = _fetch_realtime_daily(code)
            output = {
                "name": name,
                "daily": daily,
            }
    except Exception as e:
        _fail(f"Error fetching data: {e}")

    json.dump(output, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()

