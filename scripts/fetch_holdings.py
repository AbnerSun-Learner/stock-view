#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
获取 ETF/指数 前十大持仓（含申万一级行业），输出 JSON。
用法:
  python scripts/fetch_holdings.py etf 513050
  python scripts/fetch_holdings.py index 000300
"""
import json
import os
import sys

for k in ["ALL_PROXY", "all_proxy", "HTTP_PROXY", "http_proxy", "HTTPS_PROXY", "https_proxy"]:
    os.environ.pop(k, None)
os.environ["NO_PROXY"] = "*"


_industry_cache = None


def build_industry_map():
    """遍历申万一级行业，构建 股票代码 -> 一级行业名称 映射"""
    global _industry_cache
    if _industry_cache is not None:
        return _industry_cache
    import akshare as ak
    mapping = {}
    try:
        first = ak.sw_index_first_info()
        for _, row in first.iterrows():
            code = row["行业代码"].replace(".SI", "")
            name = row["行业名称"]
            try:
                df = ak.index_component_sw(symbol=code)
                for _, r in df.iterrows():
                    mapping[str(r["证券代码"])] = name
            except Exception:
                continue
    except Exception:
        pass
    _industry_cache = mapping
    return mapping


def get_industry(code):
    mapping = build_industry_map()
    return mapping.get(code.zfill(6), "")


def fetch_etf_holdings(code):
    import akshare as ak
    years = ["2024", "2023"]
    for year in years:
        try:
            df = ak.fund_portfolio_hold_em(symbol=code, date=year)
            if df is not None and len(df) > 0:
                df = df.head(10)
                holdings = []
                for _, row in df.iterrows():
                    stock_code = str(row["股票代码"])
                    holdings.append({
                        "rank": int(row["序号"]),
                        "name": str(row["股票名称"]),
                        "code": stock_code,
                        "weight": round(float(row["占净值比例"]), 2),
                        "industry": get_industry(stock_code),
                    })
                return holdings
        except Exception:
            continue
    return []


def fetch_index_holdings(code):
    import akshare as ak
    try:
        df = ak.index_stock_cons_weight_csindex(symbol=code)
        if df is not None and len(df) > 0:
            df = df.sort_values("权重", ascending=False).head(10).reset_index(drop=True)
            holdings = []
            for i, (_, row) in enumerate(df.iterrows()):
                stock_code = str(row["成分券代码"])
                holdings.append({
                    "rank": i + 1,
                    "name": str(row["成分券名称"]),
                    "code": stock_code,
                    "weight": round(float(row["权重"]), 2),
                    "industry": get_industry(stock_code),
                })
            return holdings
    except Exception:
        pass
    return []


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "etf"
    code = sys.argv[2] if len(sys.argv) > 2 else "513050"
    try:
        if mode == "etf":
            holdings = fetch_etf_holdings(code)
        else:
            holdings = fetch_index_holdings(code)
        print(json.dumps({"holdings": holdings}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e), "holdings": []}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
