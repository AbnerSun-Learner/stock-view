#!/usr/bin/env python3
"""
Simple helper script to fetch stock data from Baostock.

Reads a JSON payload from stdin:
{
  "code": "000001.SZ",
  "startDate": "1990-12-19",
  "endDate": "2025-11-21"
}

Returns JSON with the stock name (if available) and an array of
daily candles (front-adjusted).
"""

from __future__ import annotations

import json
import sys
from typing import Any, Dict, List, Optional

import baostock as bs


def _fail(message: str) -> None:
    sys.stderr.write(message.strip() + "\n")
    sys.exit(1)


def _convert_code(ts_code: str) -> str:
    ts_code = ts_code.upper()
    if ts_code.endswith(".SZ"):
        return f"sz.{ts_code[:6]}"
    if ts_code.endswith(".SH"):
        return f"sh.{ts_code[:6]}"
    _fail(f"Unsupported ts_code format: {ts_code}")
    return ts_code  # Unreachable


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


def _query_basic(code: str) -> Optional[str]:
    rs = bs.query_stock_basic(code=code)
    if rs.error_code != "0":
        return None
    if rs.next():
        row = rs.get_row_data()
        try:
            code_name_index = rs.fields.index("code_name")
        except ValueError:
            return None
        name = row[code_name_index].strip()
        return name or None
    return None


def _query_history(code: str, start_date: str, end_date: str) -> List[Dict[str, Any]]:
    fields = "date,open,high,low,close,volume"
    rs = bs.query_history_k_data_plus(
        code,
        fields,
        start_date=start_date,
        end_date=end_date,
        frequency="d",
        adjustflag="2",  # 前复权
    )
    if rs.error_code != "0":
        _fail(f"Failed to query history: {rs.error_msg or rs.error_code}")

    field_index = {field: idx for idx, field in enumerate(rs.fields)}
    required = ["date", "open", "high", "low", "close", "volume"]
    for field in required:
        if field not in field_index:
            _fail(f"History data missing field: {field}")

    rows: List[Dict[str, Any]] = []
    while rs.next():
        data = rs.get_row_data()
        rows.append(
            {
                "date": data[field_index["date"]],
                "open": _safe_float(data[field_index["open"]]),
                "high": _safe_float(data[field_index["high"]]),
                "low": _safe_float(data[field_index["low"]]),
                "close": _safe_float(data[field_index["close"]]),
                "volume": _safe_float(data[field_index["volume"]]),
            }
        )
    return rows


def main() -> None:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        _fail(f"Invalid JSON input: {exc}")

    code = payload.get("code")
    start_date = payload.get("startDate")
    end_date = payload.get("endDate")

    if not isinstance(code, str) or not code:
        _fail("Missing `code` in payload")
    if not isinstance(start_date, str) or not start_date:
        _fail("Missing `startDate` in payload")
    if not isinstance(end_date, str) or not end_date:
        _fail("Missing `endDate` in payload")

    bs_code = _convert_code(code)

    login_result = bs.login()
    if login_result.error_code != "0":
        _fail(f"Baostock login failed: {login_result.error_msg or login_result.error_code}")

    try:
        name = _query_basic(bs_code)
        daily = _query_history(bs_code, start_date, end_date)
    finally:
        bs.logout()

    output = {
        "name": name,
        "daily": daily,
    }
    json.dump(output, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()

