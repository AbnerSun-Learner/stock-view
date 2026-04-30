# 代码评审归档：stock-view

评审日期：2026-04-30  
评审范围：整个 `stock-view` 项目代码、目录结构、工程配置与基础验证流程

## 评审摘要

项目整体能通过 TypeScript 类型检查，核心业务集中在 `src/app`、`src/components/grid`、`src/components/valuation`，主流程较清晰。但当前存在几类需要优先处理的问题：

- API 层安全边界不足，尤其是持仓接口通过字符串拼接执行 Python 脚本。
- 估值指数配置在前后端重复维护且数据不一致。
- 测试脚本已配置，但项目没有任何测试用例，`pnpm test` 会失败。
- 存在疑似遗留组件、未使用依赖和过大的页面/图表文件。
- 包管理器此前存在 npm/pnpm 混用风险，已统一为 pnpm。

## 高优先级问题

### 1. 持仓 API 存在命令注入风险

文件：`src/app/api/holdings/route.ts`

当前实现从 query string 读取 `symbol`，再拼接到 shell 命令中执行：

```ts
const out = execSync(`python3 "${scriptPath}" "${mode}" "${symbol}"`, {
  encoding: "utf-8",
  timeout: 120000,
  maxBuffer: 5 * 1024 * 1024,
});
```

风险：

- `symbol` 来自用户输入，未做白名单或格式校验。
- 使用 shell 字符串执行，存在命令注入面。
- API Route 一旦暴露到公网，风险会放大。

建议：

- 改用 `execFile` / `execFileSync`，以参数数组传递 `scriptPath`、`mode`、`symbol`。
- 对 `symbol` 做白名单校验，至少限制为 `/^\d{6}$/`。
- 对非法 symbol 返回 `400`，不要进入 Python 执行链路。

### 2. 持仓 API 同步执行 Python，可能阻塞服务

文件：`src/app/api/holdings/route.ts`、`scripts/fetch_holdings.py`

问题：

- `execSync` 最长超时时间为 120 秒，会阻塞 Node.js worker。
- `fetch_holdings.py` 会调用 AKShare，并构建申万行业映射，单次请求成本较高。
- 当前接口没有缓存，同一 symbol 重复请求会重复拉取远端数据。

建议：

- 改为异步 `execFile`。
- 为持仓结果增加内存缓存或持久化缓存。
- 将行业映射预生成或单独缓存。
- 对接口增加更明确的超时、错误日志和降级策略。

### 3. 估值指数配置重复且不一致

相关文件：

- `src/app/api/valuation/route.ts`
- `src/lib/valuation.ts`

问题：

- API 中 `SYMBOL_TO_INDEX_CODE` 和 `SYMBOL_TO_NAME` 支持多个指数。
- `src/lib/valuation.ts` 中 `INDEX_LIST` 只有沪深 300。
- 列表页使用 `INDEX_LIST` 拉取数据，因此实际只展示一个指数。

建议：

- 新建统一配置文件，例如 `src/constants/indices.ts`。
- 将指数 symbol、展示名称、外部接口 code、数据来源统一维护。
- API、估值列表页、估值详情页统一从该配置导入。

### 4. 估值 API 缓存缺少容量控制

文件：`src/app/api/valuation/route.ts`

当前实现使用模块级 `Map` 缓存：

```ts
const cache = new Map<string, { data: ValuationResponse; ts: number }>();
```

问题：

- 当前 API 未在入口处对白名单 symbol 做强校验。
- 若后续支持更多 key 或查询维度，模块级 Map 可能持续增长。

建议：

- 在 API 入口先校验 symbol，只允许已配置指数。
- 给缓存增加最大容量或使用成熟缓存方案。
- 当前阶段可先用固定指数白名单解决主要风险。

### 5. 测试脚本存在但没有测试用例

文件：`package.json`

当前配置包含：

```json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage"
```

验证结果：

- `pnpm test -- --runInBand` 失败。
- Jest 报告 `No tests found`。

建议优先补充：

- `src/lib/valuation.ts` 中 `computePeStats` 的单元测试。
- 网格计算核心逻辑的单元测试。
- API symbol 校验和非法输入测试。
- 估值 percentile / 波动率计算测试。

## 中优先级问题

### 1. 主题初始化可能出现首屏闪烁

文件：`src/components/theme-provider.tsx`

问题：

- 默认主题为 `light`。
- 客户端 effect 执行后才读取 `localStorage` 并同步 `dark` class。
- 用户已选择暗色时，可能出现 light 到 dark 的短暂闪烁。

建议：

- 在根布局中注入早期主题初始化脚本。
- 或使用 cookie/server hint 让服务端初始 HTML 与客户端主题一致。

### 2. 估值页面和图表文件偏大

相关文件：

- `src/app/valuation/page.tsx`
- `src/components/valuation/valuation-chart.tsx`

问题：

- 页面中混合了数据获取、统计计算、表格列定义和渲染逻辑。
- 图表组件中混合了 ECharts 注册、颜色解析、区间计算、option 构建和 React 外壳。

建议：

- 将百分位、波动率、估值状态计算抽到 `src/features/valuation/lib`。
- 将表格列定义拆到独立文件或子组件。
- 将 ECharts option 构建拆成 `buildValuationChartOption`。

### 3. 交易时间/收盘判断逻辑重复

相关文件：

- `src/lib/utils.ts`
- `src/app/api/valuation/route.ts`
- `src/lib/valuation.ts`

问题：

- 多处存在北京时间、收盘后、交易日日期相关逻辑。
- 不同实现对周末和时区的处理不完全一致。

建议：

- 新建 `src/lib/market-calendar.ts`。
- 统一提供 `getShanghaiDate`、`isTradingHours`、`isAfterMarketClose`、`getTargetTradeDate` 等函数。
- API 和客户端展示逻辑都从同一模块导入。

### 4. 类型定义重复

相关文件：

- `src/types/valuation.ts`
- `src/components/valuation/valuation-weight-chart.tsx`

问题：

- `src/types/valuation.ts` 已定义 `HoldingItem`。
- `ValuationWeightChart` 内部仍重复定义了一份相同结构的 `HoldingItem`。

建议：

- `ValuationWeightChart` 直接从 `src/types/valuation.ts` 引入 `HoldingItem`。

## 低优先级与工程卫生

### 2. 疑似遗留代码

疑似未接入或低使用价值路径：

- `src/components/etf-terminal/*`
- `src/components/stock/Navigation.tsx`
- `src/components/shared/page-header.tsx`
- `src/lib/utils.ts` 中部分历史记录相关工具

建议：

- 先用全局引用搜索确认。
- 确认无使用后删除，或移动到归档目录。

### 3. 未使用依赖

当前在 `src` 中未见明确使用的依赖包括：

- `@ant-design/charts`
- `@supabase/supabase-js`
- `@vercel/kv`
- `html2canvas`
- `lightweight-charts`
- `uuid`

建议：

- 使用 `depcheck` 或手动确认。
- 删除未使用依赖，降低安装体积和维护成本。
- 注意 `@vercel/kv` 已有废弃提示，若确实需要 Redis，建议迁移到 Vercel Marketplace Redis/Upstash。

## 目录结构优化建议

当前核心代码可逐步演进为 feature 分层：

```text
src/
  app/
    api/
    grid/
    valuation/
  features/
    grid/
      components/
      hooks/
      lib/
      types.ts
    valuation/
      components/
      lib/
      types.ts
  shared/
    components/
    lib/
  constants/
    indices.ts
```

短期建议：

- 保留 `app` 作为路由层，只做页面组合和 API 入口。
- 将业务计算迁移到 `features/*/lib`。
- 将类型定义放到 feature 内部或 `src/types`。
- 将全局常量如指数配置放到 `src/constants`。

中期建议：

- `valuation-chart.tsx` 拆为图表外壳、option 构建、统计计算三个模块。
- `valuation/page.tsx` 拆为列表页面、表格组件、搜索组件、数据转换逻辑。
- `grid` 的计算逻辑可从 hook 中抽为纯函数，方便单元测试。

## 包管理器决策

已按项目要求统一为 pnpm：

- `package.json` 已增加 `packageManager: pnpm@10.23.0`。
- 已生成 `pnpm-lock.yaml`。
- 已删除 `package-lock.json`，避免 npm/pnpm 锁文件混用。

后续建议：

- README 中补充统一命令：

```bash
pnpm install
pnpm run dev
pnpm run lint
pnpm test
```

## 验证记录

已执行：

```bash
pnpm run lint
npx tsc --noEmit
pnpm test -- --runInBand
```

结果：

- `pnpm run lint`：通过，有 9 个 warning。
- `npx tsc --noEmit`：通过。
- `pnpm test -- --runInBand`：失败，原因是没有任何测试文件。

## 建议处理顺序

1. 修复 `holdings` API 命令注入和同步阻塞问题。
2. 统一指数配置，修正估值列表只展示一个指数的问题。
3. 抽离网格计算和估值统计纯函数，并补充基础单元测试。
4. 清理未使用组件、未使用依赖和 lint warning。
5. 拆分估值大文件，逐步演进到 feature 分层。
