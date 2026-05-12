# 指数目录功能 PRD — 按页面归类索引

本目录将 **`doc/2026-05-11-index-hub-prd-analysis.md`**（纲要）与 **`doc/2026-05-11-market-center-prd.md`**（行情中心：指数列表 / 详情需求，Markdown）对照使用；其它路由仍保留轻量 `page-*.md` 摘录。

## 页面 ↔ 文档映射

| 路由 / 页面                      | 归类文档                                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| 落地页 `/`                       | [`page-home.md`](./page-home.md)                                                         |
| 指数列表 `/indices`              | [`2026-05-11-market-center-prd.md` §列表](../2026-05-11-market-center-prd.md#sec-list)   |
| 指数详情 `/indices/[code]`       | [`2026-05-11-market-center-prd.md` §详情](../2026-05-11-market-center-prd.md#sec-detail) |
| 网格计算 `/grid`                 | [`page-grid.md`](./page-grid.md)                                                         |
| 指数对比 `/correlation`          | [`page-correlation.md`](./page-correlation.md)                                           |
| 跨页面（背景、导流、竞品、迭代） | [`cross-cutting.md`](./cross-cutting.md)                                                 |

## 权威全文位置

| 文档                                   | 路径                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------- |
| PRD 纲要                               | `/doc/2026-05-11-index-hub-prd-analysis.md`                             |
| 行情中心 · 列表 / 详情 PRD（Markdown） | `/doc/2026-05-11-market-center-prd.md`                                  |
| 线框示意图（SVG）                      | `/doc/assets/market-center-prd/`                                        |
| 与 ETF.run 技术对照（工程参考）        | `/doc/2026-05-11-stock-view-vs-etfrun-architecture-and-optimization.md` |

## 说明

- 列表与详情的字段、交互与示意图以 **`market-center-prd.md`** 为准；纲要 §8 迭代切片仍适用宏观排期。
- `page-home.md`、`page-grid.md`、`page-correlation.md` 为摘录；冲突时以纲要 + 行情中心 PRD 为准。

---

**目录路径**：`/doc/index-hub-prd/`
