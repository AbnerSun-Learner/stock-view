#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
单个指数历史日线收盘价，TuShare。

用法:
  python scripts/fetch_index_daily.py 000300.SH

输出 stdout JSON:
  { "symbol": "000300.SH", "points": [{ "date": "YYYY-MM-DD", "close": 1234.56 }] }
"""

from __future__ import annotations

import json
import re
import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(_ROOT))

CODE_REGEX = re.compile(r"^\d{6}\.(SH|SZ|CSI)$")
MARKET_TZ = ZoneInfo("Asia/Shanghai")
MARKET_CLOSE_TIME = time(15, 0)


def _to_iso_date(raw: object) -> str:
    td = str(raw or "").strip()
    if len(td) == 8:
        return f"{td[:4]}-{td[4:6]}-{td[6:]}"
    return td


def effective_query_end_date() -> date:
    """盘中查询上一自然日；盘后查询当天。非交易日由 TuShare 自动回落到最近交易日。"""
    now = datetime.now(MARKET_TZ)
    if now.time() < MARKET_CLOSE_TIME:
        return now.date() - timedelta(days=1)
    return now.date()


def fetch_index_daily(code: str) -> dict:
    symbol = code.strip().upper()
    if not CODE_REGEX.match(symbol):
        raise ValueError(f"invalid index code: {code}")

    from tushare_client import create_pro

    pro = create_pro()
    df = pro.index_daily(
        ts_code=symbol,
        start_date="20000101",
        end_date=effective_query_end_date().strftime("%Y%m%d"),
        fields="ts_code,trade_date,close",
    )

    if df is None or getattr(df, "empty", True):
        return {"symbol": symbol, "points": []}

    df = df.sort_values("trade_date").reset_index(drop=True)
    points = []
    for _, row in df.iterrows():
        try:
            close = float(row["close"])
        except (TypeError, ValueError, KeyError):
            continue
        if close <= 0:
            continue
        points.append({"date": _to_iso_date(row.get("trade_date")), "close": round(close, 4)})

    return {"symbol": symbol, "points": points}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "missing index code"}), file=sys.stderr)
        sys.exit(2)

    code = sys.argv[1].strip()
    try:
        result = fetch_index_daily(code)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(
            json.dumps({"error": str(e), "symbol": code, "points": []}, ensure_ascii=False),
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
