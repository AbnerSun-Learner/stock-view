#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
单只 ETF（场内）最新报告期重仓 Top10（按 stk_mkv_ratio 降序），TuShare：`fund_portfolio`。

返回 weight 单位为百分比尺度（与原 holding-overlap 启发式兼容：总和常 > 1）。

可选：对 Top10 标的调用 `stock_basic` 按 `industry` 聚合行业占比，`sectors[].weight` 为 0–1（仅基于本批持仓权重归一）。
"""
from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Optional

_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(_ROOT))

CODE_REGEX = re.compile(r"^\d{6}$")
A_SHARE_CODE_REGEX = re.compile(r"^\d{6}$")


def normalize_stock_code(symbol: str) -> str:
    s = symbol.strip().upper().replace('"', "").replace("'", "")
    if not s:
        return ""
    if s.endswith(".SH") or s.endswith(".SZ") or s.endswith(".BJ"):
        return s
    head = s[0] if len(s) >= 1 else ""
    if len(s) >= 6 and A_SHARE_CODE_REGEX.match(s[:6]):
        body = s[:6]
        if head == "6":
            return f"{body}.SH"
        if head in ("0", "3"):
            return f"{body}.SZ"
        if head in ("4", "8"):
            return f"{body}.BJ"
    return s


def period_label_from_end(end_date: str) -> str:
    if not end_date or len(end_date) < 8:
        return end_date or ""
    try:
        y = int(end_date[:4])
        m = int(end_date[4:6])
        q = (m - 1) // 3 + 1
        return f"{y}年{q}季度"
    except ValueError:
        return end_date


def _sector_weights_from_holdings(pro, items: list) -> list:
    """用 stock_basic.industry 对 Top10 披露权重分层汇总；weight 为 0–1（仅基于本批持仓权重归一）。"""
    if not items:
        return []

    codes: list[str] = []
    seen: set[str] = set()
    for it in items:
        k = str(it.get("key", "") or "").strip()
        if k and k not in seen:
            seen.add(k)
            codes.append(k)
    if not codes:
        return []

    try:
        joined = ",".join(codes)
        sb = pro.stock_basic(ts_code=joined, fields="ts_code,industry")
    except Exception:
        return []

    if sb is None or getattr(sb, "empty", True):
        return []

    ind_by_code: dict[str, str] = {}
    for _, r in sb.iterrows():
        ts = str(r.get("ts_code", "") or "").strip()
        ind = str(r.get("industry", "") or "").strip()
        if ts:
            ind_by_code[ts] = ind

    buckets: defaultdict[str, float] = defaultdict(float)
    for it in items:
        k = str(it.get("key", "") or "").strip()
        try:
            raw_w = float(it.get("weight", 0))
        except (TypeError, ValueError):
            continue
        lab = ind_by_code.get(k, "").strip()
        buckets[lab if lab else "未分类"] += raw_w

    total = sum(buckets.values())
    if total <= 0:
        return []

    ranked = sorted(buckets.items(), key=lambda kv: kv[1], reverse=True)
    out = []
    for nm, sum_w in ranked[:4]:
        if sum_w > 0:
            out.append({"name": nm, "weight": round(sum_w / total, 4)})
    return out


def fetch_holdings(code: str) -> dict:
    if not CODE_REGEX.match(code):
        raise ValueError(f"invalid etf code: {code}")

    from tushare_client import create_pro, etf_ts_candidates

    pro = create_pro()
    last_err: Optional[str] = None

    for fts in etf_ts_candidates(code):
        try:
            df = pro.fund_portfolio(ts_code=fts)
        except Exception as ex:
            last_err = str(ex)
            df = None
        if df is None or getattr(df, "empty", True):
            continue

        df = df.copy()
        if "stk_mkv_ratio" not in df.columns:
            last_err = "fund_portfolio missing stk_mkv_ratio"
            continue
        if "end_date" not in df.columns:
            continue

        df["end_date"] = df["end_date"].astype(str)
        latest_ed = df["end_date"].max()
        slab = df[df["end_date"] == latest_ed]
        slab = slab.sort_values("stk_mkv_ratio", ascending=False).head(10)

        items = []
        for _, row in slab.iterrows():
            sym = normalize_stock_code(str(row.get("symbol", "") or "").strip())
            if not sym:
                continue
            try:
                w = float(row["stk_mkv_ratio"])
            except (TypeError, ValueError):
                continue
            disp = (
                str(row.get("stock_name", "") or "").strip()
                or str(row.get("name", "") or "").strip()
                or sym
            )
            items.append({"key": sym, "name": disp, "weight": round(w, 4)})

        sectors = _sector_weights_from_holdings(pro, items) if items else []
        payload: dict = {
            "symbol": code,
            "source": "top10",
            "quarter": period_label_from_end(latest_ed),
            "items": items,
            "reason": "ok" if items else "empty-after-filter",
        }
        if sectors:
            payload["sectors"] = sectors
        return payload

    return {
        "symbol": code,
        "source": "top10",
        "quarter": None,
        "items": [],
        "reason": "non-equity-or-no-data",
        "last_error": last_err,
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "missing etf code"}), file=sys.stderr)
        sys.exit(2)
    code = sys.argv[1].strip()
    try:
        result = fetch_holdings(code)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(
            json.dumps({"error": str(e), "symbol": code, "items": []}),
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
