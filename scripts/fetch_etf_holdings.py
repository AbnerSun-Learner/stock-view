#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
拉取单个 ETF 的最新季度前十大持仓快照，输出干净 JSON。

用法:
  python scripts/fetch_etf_holdings.py 510300

输出 (stdout):
  {
    "symbol": "510300",
    "source": "top10",
    "quarter": "2024年4季度",
    "items": [
      {"key": "600519.SH", "name": "贵州茅台", "weight": 5.89},
      ...
    ]
  }

  weight 单位为百分比（与 AKShare 原始字段一致），调用方负责单位转换。
  非股票成分 ETF（黄金、商品、债券等）会回退到 items=[] 并设置 reason。
  错误时退出码非 0，stderr 输出 JSON 错误信息。

约束（参考 spec § B 成分重叠风险）：
  - 取最新季度的快照，不直接 head 截取多季度叠加结果
  - 在最新季度内按权重降序排序后再取 top10
  - 成分股代码做最小标准化：A 股 6 位数字补市场后缀，其它原样保留
"""
import json
import os
import re
import sys
from typing import Optional

for k in ["ALL_PROXY", "all_proxy", "HTTP_PROXY", "http_proxy", "HTTPS_PROXY", "https_proxy"]:
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"


ETF_CODE_REGEX = re.compile(r"^\d{6}$")
A_SHARE_CODE_REGEX = re.compile(r"^\d{6}$")
QUARTER_REGEX = re.compile(r"(\d{4})\s*年\s*(\d)\s*季度")


def normalize_a_share_code(code: str) -> str:
    """6 位数字 A 股代码补市场后缀；其它原样返回。"""
    if not isinstance(code, str):
        return str(code)
    if not A_SHARE_CODE_REGEX.match(code):
        return code
    head = code[0]
    if head == "6":
        return f"{code}.SH"
    if head in ("0", "3"):
        return f"{code}.SZ"
    if head in ("4", "8"):
        return f"{code}.BJ"
    return code


def parse_quarter_key(quarter_label: str) -> Optional[tuple]:
    if not isinstance(quarter_label, str):
        return None
    m = QUARTER_REGEX.search(quarter_label)
    if not m:
        return None
    return (int(m.group(1)), int(m.group(2)))


def short_quarter_label(quarter_label: str) -> str:
    """从 '2024年4季度股票投资明细' 抽出 '2024年4季度'。"""
    m = QUARTER_REGEX.search(quarter_label or "")
    if not m:
        return quarter_label or ""
    return f"{m.group(1)}年{m.group(2)}季度"


def fetch_holdings(code: str) -> dict:
    if not ETF_CODE_REGEX.match(code):
        raise ValueError(f"invalid etf code: {code}")
    import akshare as ak

    last_error = None
    for year in ["2024", "2023"]:
        try:
            df = ak.fund_portfolio_hold_em(symbol=code, date=year)
        except Exception as e:
            last_error = str(e)
            continue
        if df is None or df.empty:
            continue
        if "季度" not in df.columns:
            continue

        # 找最新季度
        df = df.copy()
        df["__qkey"] = df["季度"].map(parse_quarter_key)
        df = df[df["__qkey"].notna()]
        if df.empty:
            continue

        latest_q = max(df["__qkey"].tolist())
        latest_df = df[df["__qkey"] == latest_q].copy()
        latest_df["__weight"] = latest_df["占净值比例"].apply(
            lambda v: float(v) if v is not None and str(v) != "" else 0.0
        )
        latest_df = latest_df.sort_values("__weight", ascending=False).head(10)

        items = []
        for _, row in latest_df.iterrows():
            try:
                weight = float(row["占净值比例"])
            except (TypeError, ValueError):
                continue
            stock_code = str(row.get("股票代码", "")).strip()
            stock_name = str(row.get("股票名称", "")).strip()
            key = normalize_a_share_code(stock_code) if stock_code else stock_name
            if not key:
                continue
            items.append(
                {
                    "key": key,
                    "name": stock_name,
                    "weight": round(weight, 4),
                }
            )

        quarter_label = short_quarter_label(str(latest_df.iloc[0]["季度"]))
        return {
            "symbol": code,
            "source": "top10",
            "quarter": quarter_label,
            "items": items,
            "reason": "ok" if items else "empty-after-filter",
        }

    return {
        "symbol": code,
        "source": "top10",
        "quarter": None,
        "items": [],
        "reason": "non-equity-or-no-data",
        "last_error": last_error,
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
