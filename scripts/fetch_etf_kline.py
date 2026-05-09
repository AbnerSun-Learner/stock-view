#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
单个 ETF（场内）历史日线收盘价，TuShare。

优先 `fund_daily`（ETF 专用日线，≥5000 积分即可调，盘后入库，历史多年）；
部分代理对股票端 `daily` 返回空时，`fund_daily` 仍常有数据——见：
https://tushare.pro/document/2?doc_id=127

备选：`pro_bar`（asset=E, adj qfq→不复权），经 `api=pro` 走 DATA_API；
`pro_bar` 异常或空表时静默吞掉后继续尝试下一个 ts_code。
"""
from __future__ import annotations

import io
import json
import re
import sys
from datetime import date
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(_ROOT))

CODE_REGEX = re.compile(r"^\d{6}$")


def try_fund_daily(pro, ts_code: str):  # noqa: ANN401
    """TuShare ETF 盘后历史日线：https://tushare.pro/document/2?doc_id=127"""
    old_out = sys.stdout
    sys.stdout = io.StringIO()
    try:
        try:
            return pro.fund_daily(
                ts_code=ts_code,
                start_date="20000101",
                end_date=date.today().strftime("%Y%m%d"),
            )
        except Exception:
            return None
    finally:
        sys.stdout = old_out


def fetch_kline(code: str) -> dict:
    if not CODE_REGEX.match(code):
        raise ValueError(f"invalid etf code: {code}")
    import tushare as ts

    from tushare_client import create_pro, etf_ts_candidates

    pro = create_pro()
    cand = etf_ts_candidates(code)
    df = None

    for ts_code in cand:
        fd = try_fund_daily(pro, ts_code)
        if fd is not None and not getattr(fd, "empty", True):
            df = fd
            break

    def try_bar(ts_code_bar: str, adj_val: str | None) -> object:
        old_out = sys.stdout
        sys.stdout = io.StringIO()
        try:
            try:
                return ts.pro_bar(
                    ts_code=ts_code_bar,
                    api=pro,
                    start_date="20000101",
                    end_date="",
                    asset="E",
                    freq="D",
                    adj=adj_val,
                )
            except Exception:
                return None
        finally:
            sys.stdout = old_out

    if df is None or getattr(df, "empty", True):
        for ts_code_bar in cand:
            bar = try_bar(ts_code_bar, "qfq")
            if bar is not None and not getattr(bar, "empty", True):
                df = bar
                break

    if df is None or getattr(df, "empty", True):
        for ts_code_bar in cand:
            bar = try_bar(ts_code_bar, None)
            if bar is not None and not getattr(bar, "empty", True):
                df = bar
                break

    if df is None or df.empty:
        return {"symbol": code, "points": []}

    df = df.sort_values("trade_date").reset_index(drop=True)
    points = []
    for _, row in df.iterrows():
        td = str(row["trade_date"])
        if len(td) == 8:
            iso = f"{td[:4]}-{td[4:6]}-{td[6:]}"
        else:
            iso = td
        try:
            close = float(row["close"])
        except (TypeError, ValueError):
            continue
        if close <= 0:
            continue
        points.append({"date": iso, "close": round(close, 4)})
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
        print(
            json.dumps({"error": str(e), "symbol": code, "points": []}),
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
