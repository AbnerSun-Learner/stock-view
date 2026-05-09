# -*- coding: utf-8 -*-
"""
TuShare Pro 初始化（correlation 抓取脚本共用）。

环境与代理约定（对齐语雀《Tushare 代理使用教程》）：
https://www.yuque.com/a493465197/fl1fxx/ixwtsutxwaf0chdc

要点（勿在日志中打印 token / 完整网关）：
- `TUSHARE_TOKEN`：必选
- `DATA_API`：代理根地址；赋值 `pro._DataApi__http_url` 与教程一致
- 裸 `host:port`（无协议）时默认补 `http://`（教程与常见自建网关为 HTTP）；若你的网关只支持 TLS，
  请在 `.env.local` 写完整 `https://…`，或设环境变量 `DATA_API_SCHEME=https`
- 教程 §8 提到可对 `ts.pro_bar` 等设 `HTTP_PROXY`；但 `requests` 会对**所有**出站请求生效，和「直连 `_DataApi__http_url`」叠加时部分网关会连接异常。**默认不向环境注入代理变量**。
  若你按教程确需注入，请在 `.env.local` 设 **`TUSHARE_SYNC_PROXY_ENV=1`**（仍用 `setdefault`，不覆盖已有 `HTTP_PROXY`）。

未配置 `DATA_API` 时回退官方：`https://api.tushare.pro`（需官网有效 token）。
"""

from __future__ import annotations

import os

DEFAULT_TUSHARE_HTTPS_BASE = "https://api.tushare.pro"


def normalize_data_api(url: str) -> str:
    u = url.strip().rstrip("/")
    if not u:
        return DEFAULT_TUSHARE_HTTPS_BASE
    if "://" not in u:
        forced = (os.environ.get("DATA_API_SCHEME") or "").strip().lower()
        if forced in ("http", "https"):
            return f"{forced}://{u}"
        return f"http://{u}"
    return u


def _apply_yuque_proxy_env(gateway_normalized: str) -> None:
    if not gateway_normalized.strip():
        return
    flag = (os.environ.get("TUSHARE_SYNC_PROXY_ENV") or "0").strip().lower()
    if flag not in ("1", "true", "yes", "on"):
        return
    proxy = gateway_normalized.rstrip("/")
    os.environ.setdefault("HTTP_PROXY", proxy)
    os.environ.setdefault("HTTPS_PROXY", proxy)


def create_pro():  # noqa: ANN401 — tushare.DataApi instance
    token = (os.environ.get("TUSHARE_TOKEN") or "").strip()
    if not token:
        raise RuntimeError("TUSHARE_TOKEN is not set")

    gateway = (os.environ.get("DATA_API") or "").strip()
    base = normalize_data_api(gateway)
    if gateway:
        _apply_yuque_proxy_env(base)

    import tushare as ts

    pro = ts.pro_api(token)
    pro._DataApi__http_url = base
    return pro


def etf_ts_candidates(code6: str) -> tuple[str, str]:
    """交易所 ETF 的常见 ts_code 猜测顺序（TuShare fund_basic/stock_basic 场内多为 .SH / .SZ）。"""
    c = code6.strip()
    sh, sz = f"{c}.SH", f"{c}.SZ"
    if c.startswith(("15", "16", "18", "13", "12")):
        return sz, sh
    return sh, sz
