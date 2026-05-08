# ETF 相关性工具实现计划

日期：2026-05-08
对应规格：`docs/superpowers/specs/2026-05-08-etf-correlation-tool-design.md`

## 总体策略

按 6 个阶段递进。每个阶段都能独立验收，前一阶段不通过不进入下一阶段。核心计算优先于数据接入，数据接入优先于页面，页面优先于落地集成。

## 现状盘点

可以直接复用：

- `scripts/fetch_holdings.py` 已能用 AKShare 拉 ETF 前十大持仓，并附带申万一级行业。
- `scripts/fetch_valuation.py` 中的 `fetch_etf` 已能拉 ETF 历史日线收盘价。
- `src/app/api/holdings/route.ts` 已展示 Next.js 调用 Python 脚本的模式（同时存在 code-review 指出的命令注入风险，新接口需要规避）。
- `src/app/api/valuation/route.ts` 展示了内存缓存、错误降级和分级响应的模式，可以借鉴。

需要新建：

- 计算核心模块（纯 TS 函数 + Jest 测试）。
- 一个用于探测国内 ETF 代码补全规则的小脚本。
- 拉取 ETF 行情和成分股的统一入口（如果现有脚本接口不够用）。
- `/api/correlation` 路由。
- `/correlation` 页面与组件。

## 阶段拆解

### 阶段 0 · AKShare 接口探测

目标：在动手实现前，确认对一组样本 ETF 能稳定拿到行情和成分。

- 编写 `scripts/probe_etf_correlation.py`，对样本 ETF（510300、510500、512880、513100、518880、159915）逐个调用：
  - 收盘价历史接口
  - 前十大持仓接口
- 输出：每个 ETF 是否成功、数据起始日期、可用记录条数、成分股数量。
- 用探测结果回填 spec 中的“开放问题”：市场后缀补全规则、前十大权重总和分布。
- 探测脚本不进入运行时调用链，仅作为离线工具，可放在 `scripts/` 下并加到 README 工具说明。

验收标准：探测脚本能在 60 秒内跑完，输出 JSON 结果，并写一份简短的探测笔记到 `docs/superpowers/notes/akshare-etf-probe.md`。

### 阶段 1 · 计算核心（纯函数 + Jest）

目标：所有评分逻辑做成可测试的纯函数，不依赖 fetch、不依赖 React。

新增文件：

- `src/types/correlation.ts`
  - `EtfCode`、`EtfPriceSeries`、`EtfHolding`、`PairResult`、`CorrelationResponse`、`AdviceLevel` 等类型。
- `src/lib/correlation/etf-code.ts`
  - `normalizeEtfCode(input: string)`：去空格、识别 6 位代码、识别带后缀代码、推断市场。
  - `splitInputCodes(raw: string)`：处理逗号、空格、中文逗号、换行分隔。
- `src/lib/correlation/return-correlation.ts`
  - `pairDailyReturns(seriesA, seriesB)`：按共同交易日内连接，剔除非正价格和停牌。
  - `pearson(returns)`：Pearson 相关系数。
  - `computeReturnCorrelation(seriesA, seriesB, period)`：返回 `{ score, status, reason }`，包含最少样本数判断。
- `src/lib/correlation/holding-overlap.ts`
  - `normalizeHoldingWeights(holdings)`：百分比转 0-1，不重新缩放总和。
  - `computeHoldingOverlap(holdingsA, holdingsB)`：返回 `{ score, confidence, reason }`，区分完整成分与前十大估算。
- `src/lib/correlation/score.ts`
  - `computeFinalScore(a, b)`：`a/b` 都可用才生成 `finalScore`，否则生成 `partialScore` 和 `availableSignals`。
  - `getAdviceLevel(finalScore)`：按 `[0, 0.3) [0.3, 0.6) [0.6, 0.8) [0.8, 1]` 区间归类。
  - `buildAdvice(pair)`：根据 A、B 高低组合生成解释文案。

测试：

- `__tests__/correlation/return-correlation.test.ts`
- `__tests__/correlation/holding-overlap.test.ts`
- `__tests__/correlation/score.test.ts`
- `__tests__/correlation/etf-code.test.ts`

覆盖 spec 中列出的全部单元测试条目。

验收标准：`pnpm test` 可以跑通，所有新增用例通过；外部数据相关代码尚未写入。

### 阶段 2 · 数据获取脚本

目标：为相关性工具提供一份明确的 Python 入口，避开命令注入。

- 新增 `scripts/fetch_etf_kline.py`：参数为单个 6 位 ETF 代码，输出 JSON `{date, close}`。可以直接复用 `fetch_valuation.py` 的 `fetch_etf` 逻辑。
- 复用 `scripts/fetch_holdings.py` 的 `etf` 模式，不另写。如果探测发现申万行业映射构建过慢，再考虑分离脚本，但第一版接受现状。
- 所有脚本都打印 stderr 的错误堆栈，stdout 只输出干净 JSON。

验收标准：手工命令行调用脚本能稳定拿到结果。脚本不依赖网络代理，且对非法代码返回非零退出码。

### 阶段 3 · API 路由 `/api/correlation`

目标：把数据拉取和计算串起来，按 spec 输出结构化响应。

- 新增 `src/app/api/correlation/route.ts`：
  - 接收 `POST` 或 `GET`，参数为 `codes`（数组）和 `period`（`1y` / `3y`）。
  - 校验代码并去重，限制最多 10 个。
  - 用 `execFile` 而不是 `execSync` 调用 Python 脚本，参数走数组传递（落实 code-review 中关于命令注入的修正）。
  - 增加内存缓存：`{symbol -> kline}` 和 `{symbol -> holdings}`，TTL 与 valuation API 对齐。
  - 同一请求内并发限速：行情、成分股最多 5 个并发，避免一次性把 Python 子进程打满。
  - 单只 ETF 数据失败不会让整体失败，会按 spec 的 `status / confidence / missingReason` 模型返回部分结果。
- 新增 `src/lib/correlation/build-response.ts`：组合 pair 结果、整体摘要、缺失说明，返回前端所需结构。
- 类型放在阶段 1 已建好的 `src/types/correlation.ts`。

验收标准：用 curl 或 Postman 命中 `/api/correlation?codes=510300,510500&period=1y` 能拿到结构化结果；故意混入一个无效代码或失败代码不会让整体 500。

### 阶段 4 · 前端页面 `/correlation`

目标：在 Stillwell 现有视觉规范下完成可交互的相关性分析页。

- 新增 `src/app/correlation/page.tsx`，使用 `AntdProvider`，整体布局与 `src/app/grid/page.tsx`、`src/app/valuation/page.tsx` 风格保持一致。
- 新增 `src/components/correlation/`：
  - `correlation-navbar.tsx`：仿照 `GridNavbar`、`ValuationNavbar`。
  - `correlation-input.tsx`：多 ETF 输入、时间窗口切换、分析按钮、错误提示。
  - `correlation-summary.tsx`：整体分散度结论（明确表述为“两两重复度参考”）。
  - `correlation-matrix.tsx`：两两矩阵，颜色梯度按建议区间映射，缺失/部分单元格给 tooltip。
  - `correlation-detail-table.tsx`：使用 antd Table，支持按综合分降序，缺失项显示状态标签。
  - `correlation-explanation.tsx`：列出最高风险组合及原因、数据缺失说明。
- 可选样式：复用 `src/app/globals.css` 中已存在的 CSS 变量，沿用 stillwell-ui 的极简风格。

验收标准：

- 输入合法 ETF 代码、点击分析后，页面 5 秒内出现结果或明确加载状态。
- 含数据缺失的组合不会让页面崩，明显标记为部分或不可用。
- 切换 1 年 / 3 年会触发重新分析。

### 阶段 5 · 集成与导航

- `src/app/page.tsx` 工具卡片增加“ETF 相关性”，序号、文案、链接补齐；对应位置可以替换原本意义重复的 `06 持仓分析` 卡片，或单独追加一项，按当前总数据决定。
- 如果有共享导航/页脚链接，同步更新。
- README 增加 `/correlation` 工具说明，与现有 `/grid`、`/valuation` 段落保持格式一致。

验收标准：从首页点击新工具能进入 `/correlation`；从 `/correlation` 能返回首页；移动端宽度下页面不破版。

### 阶段 6 · 验证与回看

- 用 spec 中样本测试列表跑一次：
  - 510300 + 510310（同类沪深 300）：预期偏高。
  - 510300 + 510050（沪深 300 vs 上证 50）：预期 A 或 B 偏高。
  - 510300 + 513100（A 股 vs 纳指）：预期偏低。
  - 512880 + 一只证券主题 ETF：预期偏高。
  - 故意输入一只罕见或停牌 ETF：预期降级输出。
- 把人工回看结论记到 `docs/superpowers/notes/etf-correlation-validation.md`。
- 如果某条预期方向对不上，回到阶段 1 / 阶段 3 调整，不要在前端层做兜底。

验收标准：所有样本组合在 1 年和 3 年窗口下方向都符合预期，并且页面解释文案与分数能对得上号。

## 风险与缓解

- AKShare 接口偶发不稳定：通过缓存、并发限制、部分失败模型缓解。
- Python 子进程冷启动慢：第一阶段接受 1-3 秒延迟，必要时把行业映射缓存固化为 JSON。
- 前十大成分容易高估 B 风险：spec 中已禁止重新缩放权重，实现时严格按这个口径写。
- 用户输入大量 ETF 导致 pair 数量爆炸：前端校验最多 10 个，API 也做硬限制。

## 不在第一版做的事

- 行业分布重叠评分。
- 用户持仓权重输入与组合层面风险贡献。
- 保存常用 ETF 组合或本地持久化。
- A/B 权重自定义调节。
- 把整体分散度表述为“组合风险”——只能表述为“两两重复度参考”。

## 提交节奏

阶段 0、1 各成一个独立 commit；阶段 2 + 3 合并一个 commit；阶段 4 拆成 2-3 个 commit（页面骨架、矩阵与表格、解释区）；阶段 5 一个 commit；阶段 6 文档一个 commit。每个 commit 前都跑 `pnpm lint` 和 `pnpm test`。
