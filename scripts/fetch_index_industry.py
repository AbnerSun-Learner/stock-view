#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
单个指数行业暴露，TuShare。

通过 index_weight 获取最新可用成分权重，再用 index_member_all 映射成分股
的申万一级、二级、三级行业，按成分权重聚合为现有前端三层结构。
"""

from __future__ import annotations

import json
import re
import sys
from datetime import date, timedelta
from pathlib import Path
_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(_ROOT))

CODE_REGEX = re.compile(r"^\d{6}\.(SH|SZ|CSI)$")


def _candidate_index_codes(symbol: str) -> list[str]:
    if symbol == "000300.SH":
        return ["000300.SH", "399300.SZ"]
    return [symbol]


def _compact(dt: date) -> str:
    return dt.strftime("%Y%m%d")


def _format_trade_date(value: str) -> str | None:
    compact = value.strip()
    if not re.match(r"^\d{8}$", compact):
        return None
    return f"{compact[:4]}-{compact[4:6]}-{compact[6:8]}"


def _latest_weight_frame(pro, symbol: str):  # noqa: ANN001, ANN202
    today = date.today()
    start = _compact(today - timedelta(days=450))
    end = _compact(today)

    for index_code in _candidate_index_codes(symbol):
        try:
            df = pro.index_weight(
                index_code=index_code,
                start_date=start,
                end_date=end,
                fields="index_code,con_code,trade_date,weight",
            )
        except Exception:
            continue
        if df is None or getattr(df, "empty", True):
            continue
        df = df.dropna(subset=["con_code", "trade_date", "weight"])
        if getattr(df, "empty", True):
            continue
        latest_trade_date = str(df["trade_date"].max())
        latest = df[df["trade_date"].astype(str) == latest_trade_date].copy()
        if latest.empty:
            continue
        return latest
    return None


def _sw_member_by_l1(pro, l1_code: str) -> list[dict[str, str]]:  # noqa: ANN001
    try:
        df = pro.index_member_all(l1_code=l1_code)
    except Exception:
        return []
    if df is None or getattr(df, "empty", True):
        return []
    if "is_new" in df.columns:
        latest = df[df["is_new"].astype(str).str.upper() == "Y"]
        if not latest.empty:
            df = latest

    rows: list[dict[str, str]] = []
    for _, row in df.iterrows():
        ts_code = str(row.get("ts_code", "") or "").strip().upper()
        if not ts_code:
            continue
        item = {"ts_code": ts_code}
        for key in ("l1_name", "l2_name", "l3_name"):
            value = str(row.get(key, "") or "").strip()
            if value:
                item[key] = value
        rows.append(item)
    return rows


def _sw_industry_map(pro) -> dict[str, dict[str, str]]:  # noqa: ANN001
    try:
        classify = pro.index_classify(level="L1", src="SW2021")
    except Exception:
        classify = None
    if classify is None or getattr(classify, "empty", True):
        return {}

    out: dict[str, dict[str, str]] = {}
    for _, row in classify.iterrows():
        l1_code = str(row.get("index_code", "") or "").strip().upper()
        if not l1_code:
            continue
        for member in _sw_member_by_l1(pro, l1_code):
            ts_code = member.pop("ts_code", "")
            if ts_code and ts_code not in out:
                out[ts_code] = member
    return out


def _normalize_rows(weights: dict[str, float]) -> list[dict[str, float | str]]:
    total = sum(v for v in weights.values() if v > 0)
    if total <= 0:
        return []
    rows = [
        {"name": name, "weightPct": round(value * 100 / total, 1)}
        for name, value in weights.items()
        if value > 0
    ]
    rows.sort(key=lambda row: float(row["weightPct"]), reverse=True)
    return rows


def fetch_index_industry(code: str) -> dict:
    symbol = code.strip().upper()
    if not CODE_REGEX.match(symbol):
        raise ValueError(f"invalid index code: {code}")

    from tushare_client import create_pro

    pro = create_pro()
    weight_df = _latest_weight_frame(pro, symbol)
    if weight_df is None or getattr(weight_df, "empty", True):
        return {"symbol": symbol, "asOfDate": None, "sw1": [], "sw2": [], "sw3": []}

    latest_trade_date = str(weight_df["trade_date"].max())
    industry_by_stock = _sw_industry_map(pro)
    sw1_weights: dict[str, float] = {}
    sw2_weights: dict[str, float] = {}
    sw3_weights: dict[str, float] = {}

    for _, row in weight_df.iterrows():
        con_code = str(row.get("con_code", "") or "").strip().upper()
        industry = industry_by_stock.get(con_code)
        if not industry:
            continue
        try:
            weight = float(row.get("weight"))
        except (TypeError, ValueError):
            continue
        if weight <= 0:
            continue
        l1 = industry.get("l1_name")
        l2 = industry.get("l2_name")
        l3 = industry.get("l3_name")
        if l1:
            sw1_weights[l1] = sw1_weights.get(l1, 0.0) + weight
        if l2:
            sw2_weights[l2] = sw2_weights.get(l2, 0.0) + weight
        if l3:
            sw3_weights[l3] = sw3_weights.get(l3, 0.0) + weight

    return {
        "symbol": symbol,
        "asOfDate": _format_trade_date(latest_trade_date),
        "sw1": _normalize_rows(sw1_weights),
        "sw2": _normalize_rows(sw2_weights),
        "sw3": _normalize_rows(sw3_weights),
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "missing index code"}), file=sys.stderr)
        sys.exit(2)

    code = sys.argv[1].strip()
    try:
        result = fetch_index_industry(code)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(
            json.dumps(
                {"error": str(e), "symbol": code, "sw1": [], "sw2": [], "sw3": []},
                ensure_ascii=False,
            ),
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
