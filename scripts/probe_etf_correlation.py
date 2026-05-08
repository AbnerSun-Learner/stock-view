#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ETF 相关性工具阶段 0 接口探测脚本。

对一组样本 ETF 调用 AKShare 的行情和持仓接口，回答以下问题：
  1. fund_etf_hist_em 是否对纯 6 位代码稳定可用？是否需要市场后缀？
  2. 各 ETF 收盘价历史的起止日期、有效记录条数。
  3. fund_portfolio_hold_em 返回的成分行数与权重总和分布。

用法:
  python scripts/probe_etf_correlation.py
  python scripts/probe_etf_correlation.py 510300 510500 159915

输出:
  stdout: 干净的 JSON 探测结果，可被其他工具消费
  stderr: 人类可读的进度与小结
"""
import json
import os
import sys
import time
import traceback

for k in ["ALL_PROXY", "all_proxy", "HTTP_PROXY", "http_proxy", "HTTPS_PROXY", "https_proxy"]:
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"


DEFAULT_SAMPLES = [
    ("510300", "沪深300ETF", "SH"),
    ("510050", "上证50ETF", "SH"),
    ("510500", "中证500ETF", "SH"),
    ("512880", "证券ETF", "SH"),
    ("513100", "纳指ETF", "SH"),
    ("518880", "黄金ETF", "SH"),
    ("159915", "创业板ETF", "SZ"),
    ("159949", "创业板50", "SZ"),
]


def log(msg):
    print(msg, file=sys.stderr, flush=True)


def probe_kline(code):
    import akshare as ak

    started = time.time()
    df = ak.fund_etf_hist_em(symbol=code, adjust="qfq")
    df = df[["日期", "收盘"]].dropna()
    df = df.sort_values("日期").reset_index(drop=True)
    elapsed = round(time.time() - started, 2)

    if df.empty:
        return {
            "ok": False,
            "elapsed_s": elapsed,
            "reason": "empty kline dataframe",
        }

    first_date = str(df.iloc[0]["日期"])
    last_date = str(df.iloc[-1]["日期"])
    return {
        "ok": True,
        "elapsed_s": elapsed,
        "rows": int(len(df)),
        "first_date": first_date,
        "last_date": last_date,
        "sample_close_first": float(df.iloc[0]["收盘"]),
        "sample_close_last": float(df.iloc[-1]["收盘"]),
    }


def probe_holdings(code):
    import akshare as ak

    started = time.time()
    last_error = None
    for year in ["2024", "2023"]:
        try:
            df = ak.fund_portfolio_hold_em(symbol=code, date=year)
            if df is None or df.empty:
                continue
            elapsed = round(time.time() - started, 2)
            weight_col = "占净值比例"
            df_top = df.head(10)
            top_weights = [float(v) for v in df_top[weight_col].tolist()]
            return {
                "ok": True,
                "elapsed_s": elapsed,
                "year_used": year,
                "raw_rows": int(len(df)),
                "top10_rows": int(len(df_top)),
                "top10_weight_sum": round(sum(top_weights), 4),
                "top10_weight_unit_hint": "percent" if max(top_weights, default=0) > 1.5 else "fraction",
                "first_holding": str(df_top.iloc[0]["股票名称"]) if len(df_top) else None,
            }
        except Exception as e:
            last_error = str(e)
            continue
    return {
        "ok": False,
        "elapsed_s": round(time.time() - started, 2),
        "reason": last_error or "no holdings returned",
    }


def probe_one(code, name, market):
    log(f"[probe] {code} {name} ({market})")
    record = {"code": code, "name": name, "market_hint": market}
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


def summarize(records):
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
    if args:
        samples = [(c, c, "?") for c in args]
    else:
        samples = DEFAULT_SAMPLES

    log(f"[probe] starting with {len(samples)} ETF(s)")
    started = time.time()
    records = [probe_one(code, name, market) for code, name, market in samples]
    elapsed = round(time.time() - started, 2)

    summary = summarize(records)
    log("")
    log(f"[probe] done in {elapsed}s. kline_ok={summary['kline_ok']}/{summary['total']} holdings_ok={summary['holdings_ok']}/{summary['total']}")
    if summary["top10_weight_sum_summary"]:
        ws = summary["top10_weight_sum_summary"]
        log(f"[probe] top10 weight sum range: min={ws['min']} max={ws['max']} avg={ws['avg']} (n={ws['samples']})")

    output = {
        "elapsed_s": elapsed,
        "summary": summary,
        "records": records,
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
