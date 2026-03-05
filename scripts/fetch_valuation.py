#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从 AKShare 拉取指数/ETF 估值历史数据，输出 JSON 供 Next.js API 使用。
支持两种模式：
  1. lg模式（乐咕乐股指数PE）: python scripts/fetch_valuation.py lg 沪深300
  2. etf模式（ETF行情）: python scripts/fetch_valuation.py etf 513050
"""
import json
import os
import sys

for k in ["ALL_PROXY", "all_proxy", "HTTP_PROXY", "http_proxy", "HTTPS_PROXY", "https_proxy"]:
    os.environ.pop(k, None)


def fetch_lg(symbol_name):
    """乐咕乐股指数 PE/PB 数据"""
    import akshare as ak
    import pandas as pd

    df_pe = ak.stock_index_pe_lg(symbol=symbol_name)
    df_pe = df_pe[["日期", "指数", "滚动市盈率"]].dropna()
    df_pe["日期"] = df_pe["日期"].astype(str)
    df_pe = df_pe.rename(columns={"指数": "close", "滚动市盈率": "pe"})

    df_pb = None
    try:
        df_pb = ak.stock_index_pb_lg(symbol=symbol_name)
        df_pb = df_pb[["日期", "市净率"]].dropna()
        df_pb["日期"] = df_pb["日期"].astype(str)
        df_pb = df_pb.rename(columns={"市净率": "pb"})
    except Exception:
        pass

    if df_pb is not None and len(df_pb) > 0:
        df = pd.merge(df_pe, df_pb, on="日期", how="left")
    else:
        df = df_pe.copy()
        df["pb"] = None

    data = []
    for _, row in df.iterrows():
        item = {
            "date": row["日期"],
            "value": round(float(row["pe"]), 2),
            "close": round(float(row["close"]), 2),
        }
        if pd.notna(row.get("pb")):
            item["pb"] = round(float(row["pb"]), 4)
        else:
            item["pb"] = None
        data.append(item)

    return {"symbol": symbol_name, "name": symbol_name, "data": data}


def fetch_etf(etf_code):
    """ETF 行情历史（收盘价作为 value 和 close）"""
    import akshare as ak

    df = ak.fund_etf_hist_em(symbol=etf_code, adjust="qfq")
    df = df[["日期", "收盘"]].dropna()
    df = df.sort_values("日期").reset_index(drop=True)
    data = [
        {
            "date": str(row["日期"]),
            "value": round(float(row["收盘"]), 4),
            "close": round(float(row["收盘"]), 4),
        }
        for _, row in df.iterrows()
    ]
    return {"symbol": etf_code, "name": etf_code, "data": data}


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "lg"
    symbol = sys.argv[2] if len(sys.argv) > 2 else "沪深300"
    try:
        if mode == "etf":
            result = fetch_etf(symbol)
        else:
            result = fetch_lg(symbol)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e), "data": []}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
