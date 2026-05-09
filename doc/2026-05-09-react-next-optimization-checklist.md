# React / Next.js 优化核对清单

> 依据 Vercel React 最佳实践与当前 `src/` 代码扫描整理，便于逐条核实。**不适用项请打叉说明原因**（例如依赖在脚本/其他目录使用）。

**生成日期**：2026-05-09  
**范围**：稳定性、页面性能、可读性与可维护性

**落地更新**：2026-05-09 — 已实现 P0、P1 与 P2 中的 1.2 / 2.3（未改 3.x）。详见 **§6 落地记录**。

---

## 一、稳定性（建议优先）

| #   | 项目                                  | 说明                                                                                                     | 建议动作                                                                           | 已核实 |
| --- | ------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------ |
| 1.1 | 相关性页请求竞态                      | `/correlation` 中 `fetchPairData` 快速切换周期或连点重试时，后发请求可能先返回，导致 UI 与当前选项不一致 | 使用 `AbortController` 取消上一次请求，或递增 `requestId` 仅最新一次允许 `setData` | ☑      |
| 1.2 | `fetchPairData` 的 `useCallback` 依赖 | `useCallback(..., [message])` 依赖 `App.useApp()` 的 `message`；若引用不稳定会导致 callback 频繁重建     | 查阅 antd 版本行为；不稳定时用 ref 持有 `message` 或稳定封装                       | ☑      |
| 1.3 | API 并发策略                          | `pair` 路由故意将两只 ETF 串行拉取（并发 1），避免 TuShare 断连                                          | **保留现状**；若改并发需在 `fetch-data` 层复测代理稳定性                           | ☑ 保持 |

---

## 二、页面性能与包体积

| #   | 项目                       | 说明                                                                                                                                                                        | 建议动作                                                                                                                                        | 已核实 |
| --- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2.1 | 整页 `"use client"`        | `app/page.tsx`、`grid/page.tsx`、`correlation/page.tsx` 均为客户端组件，整页 JS 与 hydration 偏大                                                                           | 落地页以 RSC 为主，仅交互块设 `use client`；重型页亦可拆分 layout 为 RSC                                                                        | 部分 ☑ |
| 2.2 | 图表代码分割               | Recharts 体积较大                                                                                                                                                           | 对 `PairPerformanceChart` / `PairRollingChart` / `StrategyComparisonChart` 等使用 `next/dynamic`（按需 `ssr: false`，与现有 `ChartShell` 协调） | ☑      |
| 2.3 | `next.config.ts` 为空      | 未启用框架层 package 优化等                                                                                                                                                 | 按 Next 16 文档评估 `experimental.optimizePackageImports`（仅对确认有效的包名启用）                                                             | ☑      |
| 2.4 | 未使用依赖（待你全仓确认） | 在 `src/` 内未检索到引用：`@supabase/supabase-js`、`@vercel/kv`、`echarts`、`echarts-for-react`、`lightweight-charts`、`framer-motion`、`html2canvas`、`@ant-design/charts` | 全仓库搜索；若无引用可从 `package.json` 移除或注明仅某脚本使用                                                                                  | ☑      |

---

## 三、可维护性与小优化

| #   | 项目                            | 说明                                              | 建议动作                                               | 已核实 |
| --- | ------------------------------- | ------------------------------------------------- | ------------------------------------------------------ | ------ |
| 3.1 | `theme-provider` 双 `useEffect` | 一读 `localStorage`、一写 DOM + storage，逻辑可读 | 可选：合并或减少首帧抖动（非必须）                     | ☐ 未改 |
| 3.2 | 网格计算器 `useCallback` 依赖   | `useGridCalculator` 依赖整个 `params` 对象        | 当前「点击生成」模式通常足够；若改为实时计算再 Profile | ☐ 未改 |

---

## 四、已做得较好（核对时可标记「保持」）

| #   | 项目                          | 说明                                                               |
| --- | ----------------------------- | ------------------------------------------------------------------ |
| 4.1 | 服务端串行拉数                | `pair` API 与 `fetch-data` 注释明确 TuShare 并发风险，属有意识取舍 |
| 4.2 | `chart-shell.tsx`             | 挂载后再渲染子节点，缓解 Recharts 首帧尺寸问题                     |
| 4.3 | 无 `src` 内 barrel `index.ts` | 利于 tree-shaking，避免桶文件 re-export                            |
| 4.4 | Ant Design 命名导入           | `antd` 组件按需引入，利于打包拆分                                  |

---

## 五、建议执行顺序（可参考）

1. **P0**：1.1 竞态（改动面小、收益明确）— **已完成**
2. **P1**：2.4 依赖审计 → 2.1 RSC 拆分（落地页）→ 2.2 图表 dynamic — **已完成**（2.1 仅 `/`）
3. **P2**：1.2、2.3 — **已完成**；3.x — **未改**（避免首帧行为变化）

---

## 六、落地记录（2026-05-09）

| 条目 | 实现要点                                                                                                    |
| ---- | ----------------------------------------------------------------------------------------------------------- |
| 1.1  | `src/app/correlation/page.tsx`：`requestId` + `AbortController` + 卸载清理                                  |
| 1.2  | 同上：`messageRef` + `useEffect` 同步，`fetchPairData` 稳定依赖                                             |
| 2.1  | `src/app/page.tsx` 去除 `"use client"`（仅首页 RSC）；`/grid`、`/correlation` 仍为全页 client               |
| 2.2  | `src/components/correlation/lazy-pair-charts.tsx`、`src/components/grid/lazy-strategy-comparison-chart.tsx` |
| 2.3  | `next.config.ts`：`experimental.optimizePackageImports`（`lucide-react`、`@ant-design/icons`）              |
| 2.4  | `package.json` 移除未使用依赖；`README.md` 图表栈同步为 recharts                                            |
| 附带 | Recharts Tooltip 类型放宽：`pair-rolling-chart.tsx`、`strategy-comparison-chart.tsx`（`pnpm build` 通过）   |

**回归**：本地建议再手动点测 `/correlation` 切周期与重试、`/grid` 生成后图表加载。

---

## 七、核实记录模板（可复制）

**本次已核实示例（2026-05-09 落地后）：**

```text
[x] 1.1 相关性竞态
[x] 1.2 message / useCallback 稳定
[x] 1.3 API 并发保持串行
[x] 2.1 RSC — 仅落地页 /
[ ] 2.1 续 — /grid、/correlation 全页 client（可选后续）
[x] 2.2 图表 dynamic
[x] 2.3 optimizePackageImports
[x] 2.4 未使用依赖移除
[ ] 3.1 theme-provider 双 effect（未改）
[ ] 3.2 网格 calculator 依赖（未改）
备注：pnpm build 通过；回归点测 /correlation、/grid
```

**空白模板（新任务时用）：**

```text
[ ] 1.1
[ ] 1.2
...
备注：
```

如需把某条拆成独立 PR，可在备注里写 PR 链接或分支名。
