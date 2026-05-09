#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ETF 相关性工具阶段探测：TuShare（与 fetch_etf_* 一致）。

抽样检查：
  - pro_bar 前复权日线的起止日期与条数；
  - fund_portfolio Top10 权重与 stk_mkv_ratio。

用法:
  python scripts/probe_etf_correlation.py
  python scripts/probe_etf_correlation.py 510300 510500 159915

输出:
  stdout: JSON；stderr：进度与小节
"""

from __future__ import annotations

import json
import sys
import time
import traceback
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(_ROOT))

DEFAULT_SAMPLES = [
    ("510300", "沪深300ETF"),
    ("510050", "上证50ETF"),
    ("510500", "中证500ETF"),
    ("512880", "证券ETF"),
    ("513100", "纳指ETF"),
    ("518880", "黄金ETF"),
    ("159915", "创业板ETF"),
    ("159949", "创业板50"),
]


def log(msg: str):
    print(msg, file=sys.stderr, flush=True)


def probe_kline(code: str) -> dict:
    from fetch_etf_kline import fetch_kline

    started = time.time()
    try:
        data = fetch_kline(code)
        pts = data.get("points") or []
        elapsed = round(time.time() - started, 2)
        if len(pts) < 10:
            return {
                "ok": False,
                "elapsed_s": elapsed,
                "reason": "insufficient_points",
                "rows": len(pts),
            }
        first = pts[0]
        last = pts[-1]
        return {
            "ok": True,
            "elapsed_s": elapsed,
            "rows": len(pts),
            "first_date": first.get("date"),
            "last_date": last.get("date"),
            "sample_close_first": first.get("close"),
            "sample_close_last": last.get("close"),
        }
    except Exception as e:
        return {
            "ok": False,
            "elapsed_s": round(time.time() - started, 2),
            "reason": str(e),
        }


def probe_holdings(code: str) -> dict:
    from fetch_etf_holdings import fetch_holdings

    started = time.time()
    try:
        data = fetch_holdings(code)
        items = data.get("items") or []
        elapsed = round(time.time() - started, 2)
        if not items:
            return {
                "ok": False,
                "elapsed_s": elapsed,
                "reason": data.get("reason") or data.get("last_error") or "empty",
            }
        top_weights = [float(i["weight"]) for i in items if "weight" in i]
        return {
            "ok": True,
            "elapsed_s": elapsed,
            "quarter": data.get("quarter"),
            "top10_rows": len(items),
            "top10_weight_sum": round(sum(top_weights), 4),
            "top10_weight_unit_hint": "percent"
            if max(top_weights, default=0) > 1.5
            else "fraction",
            "first_holding": items[0].get("name"),
        }
    except Exception as e:
        return {
            "ok": False,
            "elapsed_s": round(time.time() - started, 2),
            "reason": str(e),
        }


def probe_one(code: str, name: str) -> dict:
    log(f"[probe] {code} {name}")
    record = {"code": code, "name": name}
    try:
        record["kline"] = probe_kline(code)
    except Exception as e:
        record["kline"] = {"ok": False, "reason": str(e)}
        log(f"  kline failed: {e}")
        traceback.print_exc(file=sys.stderr)
    try:
        record["holdings"] = probe_holdings(code)
    except Exception as e:
        record["holdings"] = {"ok": False, "reason": str(e)}
        log(f"  holdings failed: {e}")
        traceback.print_exc(file=sys.stderr)
    return record


def summarize(records: list) -> dict:
    kline_ok = sum(1 for r in records if r.get("kline", {}).get("ok"))
    holdings_ok = sum(1 for r in records if r.get("holdings", {}).get("ok"))
    weight_sums = [
        r["holdings"]["top10_weight_sum"]
        for r in records
        if r.get("holdings", {}).get("ok")
        and isinstance(r["holdings"].get("top10_weight_sum"), (int, float))
    ]
    weight_summary = None
    if weight_sums:
        weight_summary = {
            "min": round(min(weight_sums), 4),
            "max": round(max(weight_sums), 4),
            "avg": round(sum(weight_sums) / len(weight_sums), 4),
            "samples": len(weight_sums),
        }
    return {
        "total": len(records),
        "kline_ok": kline_ok,
        "holdings_ok": holdings_ok,
        "top10_weight_sum_summary": weight_summary,
    }


def main():
    args = sys.argv[1:]
    samples = [(c, c) for c in args] if args else DEFAULT_SAMPLES

    log(f"[probe] TuShare, {len(samples)} ETF(s)")
    started = time.time()
    records = [probe_one(code, name) for code, name in samples]
    elapsed = round(time.time() - started, 2)

    summary = summarize(records)
    log("")
    log(
        f"[probe] done in {elapsed}s. kline_ok={summary['kline_ok']}/{summary['total']} "
        f"holdings_ok={summary['holdings_ok']}/{summary['total']}"
    )
    if summary["top10_weight_sum_summary"]:
        ws = summary["top10_weight_sum_summary"]
        log(
            f"[probe] top10 weight sum range: min={ws['min']} max={ws['max']} "
            f"avg={ws['avg']} (n={ws['samples']})"
        )

    print(
        json.dumps(
            {"elapsed_s": elapsed, "summary": summary, "records": records},
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
