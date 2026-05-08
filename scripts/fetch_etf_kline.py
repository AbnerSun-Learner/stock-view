#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拉取单个 ETF 的前复权收盘价历史，输出干净 JSON。

用法:
  python scripts/fetch_etf_kline.py 510300

输出 (stdout):
  {
    "symbol": "510300",
    "points": [{"date": "YYYY-MM-DD", "close": float}, ...]
  }

错误时退出码非 0，stderr 输出 JSON 形式的错误信息。
"""
import json
import os
import re
import sys

for k in ["ALL_PROXY", "all_proxy", "HTTP_PROXY", "http_proxy", "HTTPS_PROXY", "https_proxy"]:
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"


CODE_REGEX = re.compile(r"^\d{6}$")


def fetch_kline(code: str) -> dict:
    if not CODE_REGEX.match(code):
        raise ValueError(f"invalid etf code: {code}")
    import akshare as ak

    df = ak.fund_etf_hist_em(symbol=code, adjust="qfq")
    if df is None or df.empty:
        return {"symbol": code, "points": []}

    df = df[["日期", "收盘"]].dropna()
    df = df.sort_values("日期").reset_index(drop=True)

    points = []
    for _, row in df.iterrows():
        try:
            close = float(row["收盘"])
        except (TypeError, ValueError):
            continue
        if close <= 0:
            continue
        date = str(row["日期"])
        points.append({"date": date, "close": round(close, 4)})
    return {"symbol": code, "points": points}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "missing etf code"}), file=sys.stderr)
        sys.exit(2)
    code = sys.argv[1].strip()
    try:
        result = fetch_kline(code)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e), "symbol": code, "points": []}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
