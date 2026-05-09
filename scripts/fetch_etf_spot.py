#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ETF 场内简称与总市值快照：TuShare。

- name：`stock_basic`；若无则退回 `fund_basic`（场内 E）
- 总资产（资产规模）人民币元，按顺序尝试：
  1) `daily_basic.total_mv`（万元 ×10000 → 元）
  2) `fund_share.fd_share`（万份）× `fund_nav.unit_nav`（元/份）→ 元（不少环境下 `total_netasset` 最新行为空，此路最稳）
  3) `fund_nav.total_netasset`（多为万元 ×10000 → 元）

说明：`daily_basic` 面向股票日频指标，不少场内 ETF 的 `total_mv` 长期为空，故需基金端接口回补。

用法:
  python scripts/fetch_etf_spot.py 510300

输出 (stdout JSON)，字段 camelCase（与 Node 对齐）:
  symbol, name, totalMvYuan
  可选: trackingIndex, listedYear（上市年份），expenseRatio（0–1，管理费+托管费）
"""

from __future__ import annotations

import json
import re
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(_ROOT))

CODE_REGEX = re.compile(r"^\d{6}$")


def _year_from_compact_date(ds: Optional[str]) -> Optional[int]:
    if not ds or len(ds) < 4:
        return None
    try:
        y = int(ds[:4])
        return y if y > 1900 else None
    except ValueError:
        return None


def _wan_yuan_to_yuan(wan: float) -> float:
    """TuShare 常见「万元」口径 → 元。"""
    return wan * 10000.0


def _mv_yuan_from_daily_basic(pro, fts: str, start: str, end: str) -> Optional[float]:
    try:
        db = pro.daily_basic(
            ts_code=fts,
            start_date=start,
            end_date=end,
            fields="ts_code,trade_date,total_mv",
        )
    except Exception:
        return None
    if db is None or getattr(db, "empty", True):
        return None
    db = db.sort_values("trade_date").dropna(subset=["total_mv"])
    if getattr(db, "empty", True):
        return None
    try:
        last_mv_wan = float(db.iloc[-1]["total_mv"])
    except (TypeError, ValueError, KeyError):
        return None
    if last_mv_wan <= 0:
        return None
    return _wan_yuan_to_yuan(last_mv_wan)


def _mv_yuan_from_fund_nav_total(pro, fts: str, start: str, end: str) -> Optional[float]:
    """`fund_nav.total_netasset`：合计资产净值，TuShare 多与 `daily_basic.total_mv` 同为「万元」口径。"""
    try:
        fn = pro.fund_nav(
            ts_code=fts,
            start_date=start,
            end_date=end,
            fields="ts_code,nav_date,total_netasset",
        )
    except Exception:
        return None
    if fn is None or getattr(fn, "empty", True):
        return None
    fn = fn.sort_values("nav_date").dropna(subset=["total_netasset"])
    if getattr(fn, "empty", True):
        return None
    try:
        v = float(fn.iloc[-1]["total_netasset"])
    except (TypeError, ValueError, KeyError):
        return None
    if v <= 0:
        return None
    return _wan_yuan_to_yuan(v)


def _mv_yuan_from_share_and_unit_nav(
    pro, fts: str, start: str, end: str
) -> Optional[float]:
    """份额（万）× 单位净值（元/份）。"""
    try:
        fs = pro.fund_share(
            ts_code=fts,
            start_date=start,
            end_date=end,
            fields="ts_code,trade_date,fd_share",
        )
    except Exception:
        return None
    if fs is None or getattr(fs, "empty", True):
        return None
    fs = fs.sort_values("trade_date").dropna(subset=["fd_share"])
    if getattr(fs, "empty", True):
        return None
    try:
        last = fs.iloc[-1]
        fd_share = float(last["fd_share"])
    except (TypeError, ValueError, KeyError):
        return None
    if fd_share <= 0:
        return None
    shares = fd_share * 10000.0

    try:
        fn = pro.fund_nav(
            ts_code=fts,
            start_date=start,
            end_date=end,
            fields="ts_code,nav_date,unit_nav",
        )
    except Exception:
        return None
    if fn is None or getattr(fn, "empty", True):
        return None
    fn = fn.sort_values("nav_date").dropna(subset=["unit_nav"])
    if getattr(fn, "empty", True):
        return None
    try:
        unit = float(fn.iloc[-1]["unit_nav"])
    except (TypeError, ValueError, KeyError):
        return None
    if unit <= 0:
        return None
    return shares * unit


def _combined_expense_ratio(m_fee_n: object, c_fee_n: object) -> Optional[float]:
    """fund_basic：m_fee / c_fee 按 TuShare 常见口径为年化费率（百分比数字，如 0.15 表示 0.15%/年）。"""
    import math

    parts: list[float] = []

    def pick(v: object) -> Optional[float]:
        if v is None:
            return None
        if isinstance(v, float) and math.isnan(v):
            return None
        try:
            f = float(v)
            if f < 0:
                return None
            return f
        except (TypeError, ValueError):
            return None

    for v in (m_fee_n, c_fee_n):
        if v is not None:
            p = pick(v)
            if p is not None:
                parts.append(p)
    if not parts:
        return None
    s = sum(parts)
    if s > 20:
        return None
    return s / 100.0


def fetch_spot(code: str) -> dict:
    if not CODE_REGEX.match(code):
        raise ValueError(f"invalid etf code: {code}")

    from tushare_client import create_pro, etf_ts_candidates

    pro = create_pro()
    end = date.today().strftime("%Y%m%d")
    # 拉 total_mv / 份额 / 净值只需最近区间；过长窗口增大代理超时断连概率
    start = (date.today() - timedelta(days=150)).strftime("%Y%m%d")

    name_seen: Optional[str] = None
    mv_yuan: Optional[float] = None
    tracking_index: Optional[str] = None
    listed_year: Optional[int] = None
    expense_ratio: Optional[float] = None

    for fts in etf_ts_candidates(code):
        if not name_seen:
            try:
                sb = pro.stock_basic(ts_code=fts, fields="ts_code,name")
                if sb is not None and not sb.empty:
                    nm = str(sb.iloc[0].get("name", "") or "").strip()
                    if nm:
                        name_seen = nm
            except Exception:
                pass

        need_meta = (
            tracking_index is None
            or listed_year is None
            or expense_ratio is None
            or not name_seen
        )
        if need_meta:
            try:
                fb = pro.fund_basic(
                    ts_code=fts,
                    fields="ts_code,name,market,benchmark,list_date,found_date,m_fee,c_fee",
                )
                if fb is not None and not fb.empty:
                    row = fb.iloc[0]
                    if not name_seen:
                        nm = str(row.get("name", "") or "").strip()
                        if nm:
                            name_seen = nm
                    if not tracking_index:
                        bm = str(row.get("benchmark", "") or "").strip()
                        if bm:
                            tracking_index = bm
                    if not listed_year:
                        ld = str(row.get("list_date", "") or "").strip()
                        fd = str(row.get("found_date", "") or "").strip()
                        listed_year = _year_from_compact_date(
                            ld
                        ) or _year_from_compact_date(fd)
                    if expense_ratio is None:
                        er = _combined_expense_ratio(
                            row.get("m_fee"), row.get("c_fee")
                        )
                        if er is not None:
                            expense_ratio = er
            except Exception:
                pass

        if mv_yuan is None:
            mv_yuan = _mv_yuan_from_daily_basic(pro, fts, start, end)
        if mv_yuan is None:
            mv_yuan = _mv_yuan_from_share_and_unit_nav(pro, fts, start, end)
        if mv_yuan is None:
            mv_yuan = _mv_yuan_from_fund_nav_total(pro, fts, start, end)
        if mv_yuan is not None:
            break

    out: dict = {
        "symbol": code,
        "name": name_seen,
        "totalMvYuan": mv_yuan,
    }
    if tracking_index:
        out["trackingIndex"] = tracking_index
    if listed_year:
        out["listedYear"] = listed_year
    if expense_ratio is not None:
        out["expenseRatio"] = round(expense_ratio, 6)
    return out


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "missing etf code"}), file=sys.stderr)
        sys.exit(2)
    code = sys.argv[1].strip()
    try:
        result = fetch_spot(code)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(
            json.dumps(
                {"error": str(e), "symbol": code, "name": None, "totalMvYuan": None},
            ),
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
