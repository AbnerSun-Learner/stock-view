#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
单个指数 PE/PB 历史估值，TuShare。

优先使用 `index_dailybasic`。该接口不同网关/版本字段可能存在差异，
脚本只输出能稳定解析到的 pe_ttm / pb。

用法:
  python scripts/fetch_index_valuation.py 000300.SH

输出 stdout JSON:
  { "symbol": "000300.SH", "points": [{ "date": "YYYY-MM-DD", "peTtm": 12.3, "pb": 1.2 }] }
"""

from __future__ import annotations

import json
import math
import re
import sys
from datetime import date
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(_ROOT))

CODE_REGEX = re.compile(r"^\d{6}\.(SH|SZ|CSI)$")


def _to_iso_date(raw: object) -> str:
    td = str(raw or "").strip()
    if len(td) == 8:
        return f"{td[:4]}-{td[4:6]}-{td[6:]}"
    return td


def _pick_number(row, *names: str) -> float | None:  # noqa: ANN001
    for name in names:
        try:
            value = row.get(name)
        except AttributeError:
            continue
        if value is None:
            continue
        try:
            out = float(value)
        except (TypeError, ValueError):
            continue
        if math.isnan(out) or out <= 0:
            continue
        return out
    return None


def fetch_index_valuation(code: str) -> dict:
    symbol = code.strip().upper()
    if not CODE_REGEX.match(symbol):
        raise ValueError(f"invalid index code: {code}")

    from tushare_client import create_pro

    pro = create_pro()
    df = pro.index_dailybasic(
        ts_code=symbol,
        start_date="20000101",
        end_date=date.today().strftime("%Y%m%d"),
        fields="ts_code,trade_date,pe_ttm,pb",
    )

    if df is None or getattr(df, "empty", True):
        return {"symbol": symbol, "points": []}

    df = df.sort_values("trade_date").reset_index(drop=True)
    points = []
    for _, row in df.iterrows():
        pe_ttm = _pick_number(row, "pe_ttm", "pe")
        pb = _pick_number(row, "pb")
        if pe_ttm is None and pb is None:
            continue
        points.append(
            {
                "date": _to_iso_date(row.get("trade_date")),
                "peTtm": round(pe_ttm, 4) if pe_ttm is not None else None,
                "pb": round(pb, 4) if pb is not None else None,
            }
        )

    return {"symbol": symbol, "points": points}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "missing index code"}), file=sys.stderr)
        sys.exit(2)

    code = sys.argv[1].strip()
    try:
        result = fetch_index_valuation(code)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(
            json.dumps({"error": str(e), "symbol": code, "points": []}, ensure_ascii=False),
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
