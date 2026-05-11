# stock-view 与 ETF.run：数据链路、技术取舍与优化方案（技术文档）

**文档日期**：2026-05-11  
**适用范围**：本仓库「Stillwell / stock-view」与第三方站点 ETF.run（[etf.run](https://www.etf.run/)）在 **数据如何进入浏览器**、**Next.js 渲染模型**上的对比；文末给出 **可落地方案级别** 的改造说明（不等于已实施）。

**前置阅读**：`/doc/2026-05-09-react-next-optimization-checklist.md`（本仓库已定稿的一批性能与稳定性项）。

---

## 1. 对比目标与边界

### 1.1 为何要对比 ETF.run？

ETF.run 一类站点的核心是 **只读估值与指数信息**：列表、分位、PE/PB 等数据 **大批量、低频变更、SEO 友好**，天然适合「服务端组装 → HTML / RSC 直出」。

本仓库的核心是 **工具**：网格在浏览器本地计算；相关性在后端聚合 TuShare（经 `scripts/` 与子进程链路）再通过 **Route Handler** 暴露给前端。两者的 **交互强度、数据源形态、是否需要用户输入** 不同，因此 **技术选型不必相同**，但仍可借鉴其对 **首包、缓存、爬虫可见性** 的处理方式。

### 1.2 信息来源说明（避免过度断言）

- **ETF.run**：前文通过响应头（Next.js、Vercel、预渲染标记）、HTML 中出现 `self.__next_f`、首屏数值内联于文档等 **可观测行为** 归纳；未审计其私服或第三方采购合同。
- **stock-view**：以本仓库 `src/app/**`、`src/lib/correlation/**`、`src/app/api/**` 为准。

---

## 2. 产品形态与「数据从何而来」——对照总表

| 维度           | ETF.run（可观测推断）                                                                        | stock-view（本仓库）                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 主要用户任务   | 浏览全市场/指数估值、跳转详情                                                                | 配置参数并生成网格；输入两只 ETF 做相关性分析                                                         |
| 输入           | mostly 导航/点击链接                                                                         | 显式表单（代码、周期、网格参数等）                                                                    |
| 主要数据敏感度 | 公开展示的行情/估值摘要                                                                      | 相关性：服务端代表用户拉取聚合数据                                                                    |
| 首屏数据来源   | **服务端渲染/预渲染** 将结果写入响应体（Flight/RSC），**浏览器侧少见独立 JSON 「估值 API」** | 首页 **RSC**，无业务 API；`/correlation` **CSR 后发** `/api/correlation/pair`；`/grid` **纯前端计算** |
| 服务端角色     | 「内容生产」——定时或按需生成可读页面                                                         | 「BFF + 可选本地脚本数据」——`fetch-data` / `fetchAllEtfData`（并发策略受 TuShare 稳定性约束）         |
| CDN / 缓存     | 可见多级缓存（Vercel + 上游 CDN）；`stale-time` 类指示与页面更新节奏说明（站点文案）         | 依赖 Next/Vercel 默认；`/api/correlation/pair` **当前未见**短时 HTTP 分段缓存或服务端 `cache()` 封装  |

---

## 3. 技术方案分项对比

### 3.1 渲染模型：RSC / SSR / CSR

| 方案         | ETF.run（归纳）                                                                              | stock-view                                                                  |
| ------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 列表与估值页 | 以文档响应为主，`self.__next_f` 表明 **App Router + RSC/Flight**；数据与 UI 骨架在服务端组合 | `/`：**Server Component**。`/grid`、`/correlation`：**整页 `"use client"`** |
| 含义         | Crawler 与首屏往往能直接读到数字与表格结构                                                   | 工具页更注重交互；但需要更多 **JS 下载与 hydration**                        |

### 3.2 浏览器可见的「接口」形态

| 方案       | ETF.run（归纳）                                                                      | stock-view                                                          |
| ---------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| XHR/Fetch  | 首屏大多为 **文档 + 静态 chunk**；不依赖浏览器再拉一队 REST 才能完成首屏文案与主表格 | `/correlation` **强依赖** `GET /api/correlation/pair?a=&b=&period=` |
| 隐私与逆向 | URL 上不直接暴露上游数据商 Endpoint                                                  | `/api/*` 为自有契约；上游细节封装在服务端                           |

### 3.3 缓存与失效

| 方案   | ETF.run（归纳）                                                   | stock-view                                                        |
| ------ | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| 页面层 | `X-Nextjs-Prerender`、`stale-time` 等——偏 **ISR/按需再验证** 思路 | 页面未对所有路由统一配置 ISR；相关性 **按请求计算**为主           |
| API 层 | 公开站点未在用户视角暴露明确 JSON Cache Key                       | **可做**：对 `(codeA, codeB, period)` 维度的短时缓存或服务端 memo |

---

## 4. 优缺点分析（架构视角）

### 4.1 ETF.run 式：**服务端组装 + 文档直出（RSC/SSR）为主**

**优点**

- **首屏快（弱网观感）**：首包 HTML 已含可读内容；不等待 hydration 后再打 API。
- **SEO / 预览友好**：估值数字与标题在服务端即可进入 `<title>`、`<meta>` 与正文（其指数详情页的 meta 描述即为一例）。
- **接口面小**：爬虫与普通用户只看到页面 URL；减少对「公开 REST」的直接依赖。
- **集中式限速与合规**：数据源访问集中在服务端，便于统一熔断、日志与密钥管理（若要扩展登录或付费层也更自然）。

**缺点**

- **个性化与强交互**：每用户差异化大时，服务端渲染成本高，需要 **流式、Partial Prerendering、edge 个性化** 等更复杂栈。
- **缓存失效复杂度**：全行业/宽基估值更新时，要面对 **大批量页面再验证** 与数据源延迟一致性说明（站点已通过「更新时间」文案管理预期）。
- **调试心智**：Flight \_PAYLOAD 对传统「打开 Network 就看到 JSON」的调试路径不直观。

### 4.2 stock-view 当前：**首页 RSC + 工具页整页 CSR + `/api` BFF**

**优点**

- **工具交互极致灵活**：`/grid` 侧参数变化密集，**前端即时重算**比往返服务端更合适。
- **相关性计算与数据源解耦**：`buildPairResponse`、错误码（422 vs 500）集中在服务端，前端只消费 JSON。
- **错误与限流可操作**：可对 `/api/correlation/*` 单独做 rate limit、日志、熔断，而不绑架整页 SSR。

**缺点**

- **首屏链路更长**：`/correlation` 需等待 **JS → hydration → fetch**；弱网下「白屏/骨架」时间体感更明显。
- **整页 Client 的包体积**：Ant Design + Recharts（虽已 lazy 图表）still 偏大；与「仅用 RSC 输出静态说明」相比 TTI 压力更高。
- **服务端算力易被重复击打**：在无缓存前提下，同类查询多次命中会 **重复拉 TuShare**，成本与抖动均上升。

---

## 5. 用户视角的体验差异（具象场景）

### 5.1 首次打开 / SEO / 社交分享

| 场景           | ETF.run                                       | stock-view                                                                                                                         |
| -------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 第一次打开首页 | HTML 即有估值块与文案，观感「秒开内容」概率高 | 首页亦为 RSC，体验接近——**这一部分已对齐参照系**                                                                                   |
| 搜索结果摘要   | 容易展示「最新 PE」「更新时间」摘要           | `/` 为元数据齐备的落地页；**工具结果页若不 SSR 则爬虫难抓「两只 ETF 的对比结论」**（若未来需要分享链接预览，应考虑服务端注入摘要） |

### 5.2 弱网与移动端

- **ETF.run**：读完 HTML 就看见数；脚本失败时仍可能有 **可读静态层**（视具体 hydrate 容错）。
- **`/correlation`**：脚本或 API 任一环节失败，用户感知为 **较长时间空白或仅存壳**；虽已存在骨架（`SkeletonChart` 等），但 **首轮请求仍需等 API**。

### 5.3 重复操作与高阶用户

- 用户短时间重复同一对 ETF、同一周期：**ETF.run** 可利用边缘与页面缓存减载；**stock-view** 若无 API 缓存，则 **体感「每次一样慢」**。
- **网格**：用户拖拽参数 — **前端计算更符合预期**，不输 ETF.run 模式。

---

## 6. 可优化点的详细方案（stock-view）

以下每条均给出：**问题陈述 → 拟议方案 → 实现要点 → 风险与回滚 → 验收标准**。优先级为建议顺序，可按迭代切片实施。

---

### O1. `/api/correlation/pair` 短时与服务端缓存

**问题陈述**：同 `(a,b,period)` 在短时间内重复命中会重复触发 `fetchAllEtfData`（并发已限制为 1 以保护 TuShare，但仍有 **端到端耗时**）。

**拟议方案**（可多选并存，由易到难）：

1. **HTTP 层**：对成功响应施加 `Cache-Control: s-maxage=60~300, stale-while-revalidate=…`（视数据新鲜度容忍度）。
2. **Next 数据缓存**：使用 `cache()` / `unstable_cache`（以 Next 16 文档为准）包装「规范化后的 `(codeA, codeB, period)` → `PairCorrelationPayload`」，并定义 **tags**（如 `corr:${codeA}:${codeB}`）以便后续扩展主动失效接口。
3. **进程内 LRU**（低配替代）：单机 dev 或非分布式部署可用简单 Map + TTL（注意内存与多实例一致性）。

**实现要点**

- Key 必须使用 **规范化后代码**（与 `dedupeNormalizedCodes` 一致），避免因大小写或空格击穿缓存。
- **错误响应默认不缓存**（避免把 500 固定住）。
- 与现有 **`fetchAllEtfData(..., 1)` 串行策略** 保持不变，缓存应包在最外层以降低重复调用。

**风险**

- **陈旧数据**：需在产品文案或与「更新时间」同源字段提示用户。
- **多租户环境**：若在将来引入登录或个性化因子，缓存 Key 必须纳入用户维度。

**验收标准**

- 同一 URL 短时间连续刷新：**服务端 TuShare 子进程触发次数明显下降**（通过日志计数）。
- 变更 period 仍可得到正确分立结果。
- **压力测试**：并发 50 合法不同 pair 不出现内存暴涨（若使用进程内 LRU，需上限）。

---

### O2. 相关性路由：服务端首包携带「可确定」的数据（选择性对齐 ETF.run）

**问题陈述**：当 URL 或通过 `searchParams` 已确定 `a`、`b`、`period` 时，仍走「整页 hydration 后再 fetch」，**多一跳 RTT**。

**拟议方案**

- **方案 A**：`app/correlation/page.tsx` 拆为 **`page.tsx`（默认 Server Component）** + **`CorrelationWorkbench.tsx`（client）**。Server 在无敏感前提条件下 `await fetch` **同源内部 API**（或直调 lib 层函数）得到初始 payload，作为 **initialData** 传入 client；后续用户改周期再在客户端 `fetch`。
- **方案 B**：使用 **React `cache()` / Server Action** 封装 `loadPairCorrelation(...)`（注意 Next 16 Server Action 语义与只允许 POST mutation 的惯例，读操作仍可读 RSC）。

**实现要点**

- 避免 **服务端与客户端两份解析逻辑**：参数校验应复用 `dedupeNormalizedCodes`、`parsePeriod` 等导出函数。
- 注意 **服务端请求自身**：服务端 `fetch` 本机时注意 **绝对 URL / request headers**（开发环境 localhost / 部署环境）。

**风险**

- 误把 **只对浏览器开放** 的 cookie 语义搬到服务端调用链（本项目当前大多为公开 API，但仍需检视）。
- 若将来加 **人机验证或配额**，服务端预取必须与鉴权对齐。

**验收标准**

- 带 query 的深度链接：**LCP/FCP** 较前版本改善（可在 Lighthouse 复测）。
- 无 query：**行为与现状一致**，无重复请求风暴。

---

### O3. 缩小 `"use client"` 边界（布局 RSC + 岛屿式 Client）

**问题陈述**：`/grid`、`/correlation` 整页 Client 会将 **antd 与页面壳**打进首包 hydration。

**拟议方案**

- 抽出 **`GridPageShell`** / **`CorrelationPageShell`** 为 Server Component：**导航、Markdown 式说明、页脚免责声明**留在服务端。
- 仅 **表单面板、图表、message 容器、`App` Provider** 为 client subtree。
- （落地页已实现 RSC：`checklist` 中记载。）

**实现要点**

- `AntdProvider` 与使用 `App.useApp()` 的组件同属 client 边界内需 **单棵子树**；避免在两个 island 各自包一层过大的 Provider。
- 主题与 `ThemeProvider` 若在 layout 已为 client，可考虑 **上移或合并**以减少水合抖动（非必须）。

**风险**

- 拆分不彻底时 **props drilling**；可用 **组合组件**模式（slots）缓解。

**验收标准**

- `pnpm analyze`（若启用）或 build 报告的 **/`/correlation` 首包体积**相较基线下降。
- **无功能性回归**：网格生成、相关性切周期、`AbortController` 行为保持不变。

---

### O4. 路由级 `loading.tsx` 与跳转预取

**问题陈述**：从 `/` 跳到 `/correlation` 时，用户可能在 **bundle 与水合未完成**前感到「卡顿无反馈」。

**拟议方案**

- 新增 `src/app/correlation/loading.tsx`：与设计系统一致的 skeleton。
- `Link prefetch`：`next/link` 默认 prefetch 视配置而定；可对高频入口开启 `prefetch`（或对用户 hover 预热）。

**验收标准**

- 硬刷新与 client 跳转 **均有可见占位**。
- CLS 不因 skeleton → 内容的切换抖动超过可接受阈值（人工 + Lighthouse）。

---

### O5. 文案与契约一致性（产品与工程）

**问题陈述**：落地页 FACTS 中「计算方式：**100% 本地，无服务依赖**」与 **相关性走 `/api`** 存在歧义。

**拟议方案**

- 将该条改为：**「网格：**100% 浏览器本地计算」**「相关性：**经站内接口聚合行情与持仓**」** 分列；或脚注说明工具差异。

**验收标准**

- 产品/法务若参与，可勾选「描述与数据流示意图一致」。

---

## 7. 决策指南：何时继续「CSR + API」，何时加码「服务端直出」

| 判定                                 | 建议                                                                |
| ------------------------------------ | ------------------------------------------------------------------- |
| 只读榜单、可被收录、更新节奏明确     | **偏 ETF.run**：SSR/ISR/RSC + 边缘缓存                              |
| 强表单、瞬时反馈、私密参数多         | **偏 stock-view 网格**：Client 计算或 Web Worker                    |
| 重数据聚合、上游不稳定、需要统一熔断 | **BFF/API 必须有**；是否 SSR 仅是「首屏是否多一次 fetch」的工程选择 |

---

## 8. 与既有清单的关系与后续工单建议

**已完成（历史）**：见 `doc/2026-05-09-react-next-optimization-checklist.md`——竞态、`messageRef`、`next.config` optimizePackageImports、图表 dynamic 等。

**本文新增 backlog（建议工单标题）**

1. `feat(api): add short-lived cache for /api/correlation/pair`
2. `feat(correlation): RSC shell + optional server-prefetched initialPairData`
3. `refactor: split correlation/grid islands from RSC layout`
4. `ux: correlation loading.tsx + link prefetch tuning`
5. `copy: clarify local vs api-backed tools on landing FACTS`

---

## 9. 变更记录

| 日期       | 作者     | 摘要                                                           |
| ---------- | -------- | -------------------------------------------------------------- |
| 2026-05-11 | 文档初稿 | 对比 ETF.run 与 stock-view；展开 O1-O5；与既有优化清单交叉引用 |

---

**文档路径**：`/doc/2026-05-11-stock-view-vs-etfrun-architecture-and-optimization.md`
