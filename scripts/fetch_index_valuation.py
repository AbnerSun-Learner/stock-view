#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
单个指数 PE/PB 历史估值，TuShare。

优先使用 `index_dailybasic`。若 TuShare 未覆盖某些行业/主题指数，
回退到最新指数成分权重 + 成分股 `daily_basic` 合成一个当前估值点。

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
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(_ROOT))

CODE_REGEX = re.compile(r"^\d{6}\.(SH|SZ|CSI)$")
INDEX_WEIGHT_LOOKBACK_DAYS = 450
DAILY_BASIC_LOOKBACK_DAYS = 20
MARKET_TZ = ZoneInfo("Asia/Shanghai")
MARKET_CLOSE_TIME = time(15, 0)


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


def _compact(dt: date) -> str:
    return dt.strftime("%Y%m%d")


def effective_query_end_date() -> date:
    """盘中查询上一自然日；盘后查询当天。非交易日由 TuShare 自动回落到最近交易日。"""
    now = datetime.now(MARKET_TZ)
    if now.time() < MARKET_CLOSE_TIME:
        return now.date() - timedelta(days=1)
    return now.date()


def _latest_weight_frame(pro, symbol: str, end_date: date):  # noqa: ANN001, ANN202
    start = _compact(end_date - timedelta(days=INDEX_WEIGHT_LOOKBACK_DAYS))
    end = _compact(end_date)

    try:
        df = pro.index_weight(
            index_code=symbol,
            start_date=start,
            end_date=end,
            fields="index_code,con_code,trade_date,weight",
        )
    except Exception:
        return None

    if df is None or getattr(df, "empty", True):
        return None

    df = df.dropna(subset=["con_code", "trade_date", "weight"])
    if getattr(df, "empty", True):
        return None

    latest_trade_date = str(df["trade_date"].max())
    latest = df[df["trade_date"].astype(str) == latest_trade_date].copy()
    if latest.empty:
        return None
    return latest


def _weighted_harmonic_ratio(rows: list[tuple[float, float]]) -> float | None:
    """用权重调和平均合成指数 PE/PB，避免高估亏损或极端估值成分的影响。"""
    denom = 0.0
    weight_sum = 0.0
    for weight, ratio in rows:
        if weight <= 0 or ratio <= 0:
            continue
        denom += weight / ratio
        weight_sum += weight
    if denom <= 0 or weight_sum <= 0:
        return None
    return weight_sum / denom


def _batched(values: list[str], size: int) -> list[list[str]]:
    return [values[i : i + size] for i in range(0, len(values), size)]


def _latest_daily_basic(pro, codes: list[str], end_date: date):  # noqa: ANN001, ANN202
    frames = []
    start = _compact(end_date - timedelta(days=DAILY_BASIC_LOOKBACK_DAYS))
    end = _compact(end_date)
    for batch in _batched(codes, 80):
        try:
            df = pro.daily_basic(
                ts_code=",".join(batch),
                start_date=start,
                end_date=end,
                fields="ts_code,trade_date,pe_ttm,pb",
            )
        except Exception:
            continue
        if df is not None and not getattr(df, "empty", True):
            frames.append(df)
    if not frames:
        return None

    import pandas as pd

    df = pd.concat(frames, ignore_index=True)
    if df.empty:
        return None
    df = df.sort_values(["ts_code", "trade_date"]).drop_duplicates("ts_code", keep="last")
    return df


def _fallback_current_valuation_from_members(pro, symbol: str, end_date: date) -> dict:
    weight_df = _latest_weight_frame(pro, symbol, end_date)
    if weight_df is None or getattr(weight_df, "empty", True):
        return {"symbol": symbol, "points": []}

    weights: dict[str, float] = {}
    for _, row in weight_df.iterrows():
        con_code = str(row.get("con_code", "") or "").strip().upper()
        if not con_code:
            continue
        weight = _pick_number(row, "weight")
        if weight is None:
            continue
        weights[con_code] = weights.get(con_code, 0.0) + weight

    if not weights:
        return {"symbol": symbol, "points": []}

    basic_df = _latest_daily_basic(pro, list(weights.keys()), end_date)
    if basic_df is None or getattr(basic_df, "empty", True):
        return {"symbol": symbol, "points": []}

    latest_trade_date = str(basic_df["trade_date"].max())
    pe_rows: list[tuple[float, float]] = []
    pb_rows: list[tuple[float, float]] = []
    for _, row in basic_df.iterrows():
        ts_code = str(row.get("ts_code", "") or "").strip().upper()
        weight = weights.get(ts_code)
        if weight is None:
            continue
        pe_ttm = _pick_number(row, "pe_ttm", "pe")
        pb = _pick_number(row, "pb")
        if pe_ttm is not None:
            pe_rows.append((weight, pe_ttm))
        if pb is not None:
            pb_rows.append((weight, pb))

    pe_ttm = _weighted_harmonic_ratio(pe_rows)
    pb = _weighted_harmonic_ratio(pb_rows)
    if pe_ttm is None and pb is None:
        return {"symbol": symbol, "points": []}

    return {
        "symbol": symbol,
        "points": [
            {
                "date": _to_iso_date(latest_trade_date),
                "peTtm": round(pe_ttm, 4) if pe_ttm is not None else None,
                "pb": round(pb, 4) if pb is not None else None,
            }
        ],
    }


def fetch_index_valuation(code: str) -> dict:
    symbol = code.strip().upper()
    if not CODE_REGEX.match(symbol):
        raise ValueError(f"invalid index code: {code}")

    from tushare_client import create_pro

    pro = create_pro()
    query_end_date = effective_query_end_date()
    df = pro.index_dailybasic(
        ts_code=symbol,
        start_date="20000101",
        end_date=query_end_date.strftime("%Y%m%d"),
        fields="ts_code,trade_date,pe_ttm,pb",
    )

    if df is None or getattr(df, "empty", True):
        return _fallback_current_valuation_from_members(pro, symbol, query_end_date)

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

    if points:
        latest_point_date = points[-1]["date"]
        if latest_point_date < _to_iso_date(query_end_date.strftime("%Y%m%d")):
            fallback = _fallback_current_valuation_from_members(pro, symbol, query_end_date)
            fallback_points = fallback.get("points", [])
            if fallback_points:
                latest_fallback = fallback_points[-1]
                if latest_fallback.get("date", "") > latest_point_date:
                    points.append(latest_fallback)
        return {"symbol": symbol, "points": points}
    return _fallback_current_valuation_from_members(pro, symbol, query_end_date)


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
