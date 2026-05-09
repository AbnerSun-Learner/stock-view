# TuShare ETF 接口探测笔记

日期：2026-05-09（数据源由 AKShare 切换为 TuShare 后整理）
对应阶段：ETF 相关性工具 · 数据层
脚本：`scripts/probe_etf_correlation.py`（调用 `fetch_etf_kline.py` / `fetch_etf_holdings.py` 同等逻辑）

说明：2026-05-08 针对 AKShare 的样本跑数与表格已归档在 Git 历史中；切换到 TuShare 后请以本脚本实时输出为准并重跑归档 JSON。

## 环境与客户端

- 环境变量：`TUSHARE_TOKEN`（必填）、`DATA_API`（可选代理根地址）。
- `DATA_API` 若仅填写 `host:port`，常见自建代理为 **HTTP**（与 [语雀教程](https://www.yuque.com/a493465197/fl1fxx/ixwtsutxwaf0chdc) TradingAgents 示例一致）；若为 TLS，请写成 `https://...` 或设 `DATA_API_SCHEME=https`。误用 `https` 访问仅支持 `http` 的网关可能导致 `daily` 等返回「空 DataFrame」。教程 §8：`HTTP_PROXY` 注入**默认关闭**，需设 `TUSHARE_SYNC_PROXY_ENV=1` 才由 `tushare_client` 做 `setdefault`。
- 初始化：`scripts/tushare_client.py` — `ts.pro_api(token)` + `pro._DataApi__http_url`；若 `DATA_API` 未写协议则自动补上 `https://`；未配置网关时默认为 `https://api.tushare.pro`。
- 行情：优先 **`fund_daily`**（[ETF 日线 doc_id=127](https://tushare.pro/document/2?doc_id=127)，≥5000 积分、盘后历史）；失败再试 `pro_bar`/`daily`。许多代理下 `fund_daily` 有数据而 `daily` 空。

## 样本（与旧版探测一致）

8 只覆盖宽基、主题、跨市场和商品的 ETF：

| 代码   | 名称        | 市场 |
| ------ | ----------- | ---- |
| 510300 | 沪深 300ETF | SH   |
| 510050 | 上证 50ETF  | SH   |
| 510500 | 中证 500ETF | SH   |
| 512880 | 证券 ETF    | SH   |
| 513100 | 纳指 ETF    | SH   |
| 518880 | 黄金 ETF    | SH   |
| 159915 | 创业板 ETF  | SZ   |
| 159949 | 创业板 50   | SZ   |

## 与 AKShare 相比的关键差异

### 1. `ts_code` 与市场后缀

- TuShare Pro 场内 ETF 使用 `510300.SH` / `159915.SZ` 等形式。
- 用户输入仍为 **6 位数字**；Python 侧用 `etf_ts_candidates(code)`：常见深交所 ETF（如 `159*`、`15*`、`16*` 等）优先 `.SZ`，其余优先 `.SH`，**若第一条无数据则自动尝试另一条**。

### 2. 行情

- 接口：`pro_bar`，前复权 `adj='qfq'`，与日收益率计算公式不变：
  `dailyReturn[i] = close[i] / close[i - 1] - 1`

### 3. 持仓

- 接口：`fund_portfolio(ts_code=...)`。
- 权重列：`stk_mkv_ratio`（与旧版「占净值比例」同量级，多为百分比尺度）；按 **最新 `end_date`** 切片后按权重 **降序** 取 Top10 —— 对应设计文档中「最新披露季度 + 按权重降序」的约束。
- 名称：优先列 `stock_name`。

### 4. 非股票成分 ETF

- 518880 等仍以 **缺少股票持仓快照** 为典型：B 侧可能为空；产品上按「成分数据不足 / 非股票成分」语义处理。

## 重跑探测

```bash
python3 scripts/probe_etf_correlation.py > /tmp/etf_probe.json 2> /tmp/etf_probe.err
```

## 后续动作（维护）

- [x] Python 抓取脚本迁至 TuShare，`probe_etf_correlation.py` 与之一致。
- [ ] 在具备有效 token / 网关的环境重新跑全系样本，把「总体结果」小节中的成功条数与时间补回本文或附 JSON。
