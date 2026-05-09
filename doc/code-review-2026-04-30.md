# 代码评审归档：stock-view

评审日期：2026-04-30  
评审范围：整个 `stock-view` 项目代码、目录结构、工程配置与基础验证流程

> **2026-05-08 修订**：已从本文移除已下架的估值模块（`valuation` 相关 API、页面与 `src/lib/valuation.ts` 等）对应条目；其余条目仍按评审日结论保留，请在引用时结合实际目录核对。

## 评审摘要

项目整体能通过 TypeScript 类型检查，核心业务集中在 `src/app`、`src/components/grid` 以及后续新增的 `correlation` 等路由与组件，主流程较清晰。但当前存在几类需要优先处理的问题：

- API 层安全边界不足，尤其是持仓接口通过字符串拼接执行 Python 脚本。
- 测试脚本已配置，但项目没有任何测试用例，`pnpm test` 会失败。
- 存在疑似遗留组件、未使用依赖和偏大的页面/图表文件。
- 全项目结构中存在工具文件、临时产物、Python 工具链与 Next.js 主应用混杂的问题，需要单独清理。

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

文件：`src/app/api/holdings/route.ts`、仓库 `scripts/` 下由该 API 调用的 Python 脚本（需与 `scriptPath` 实际指向的文件一致，例如 `fetch_etf_holdings.py`）

问题：

- `execSync` 最长超时时间为 120 秒，会阻塞 Node.js worker。
- 持仓类脚本通常会访问外部数据源，单次请求成本较高。
- 当前接口没有缓存，同一 symbol 重复请求会重复拉取远端数据。
- 当前 Next.js Route Handler 直接调用 `python3`，部署到 Node.js 运行时后不一定具备 Python 运行环境。

建议：

- 改为异步 `execFile`。
- 为持仓结果增加内存缓存或持久化缓存。
- 明确 Python 脚本是离线数据任务、独立 Python 服务，还是可部署的 serverless function，不要让 Node API 隐式依赖本机 Python。
- 对接口增加更明确的超时、错误日志和降级策略。

### 3. 测试脚本存在但没有测试用例

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

- 网格计算核心逻辑的单元测试。
- API symbol 校验和非法输入测试。

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

## 低优先级与工程卫生

### 1. 疑似遗留代码

疑似未接入或低使用价值路径：

- `src/components/etf-terminal/*`
- `src/components/stock/Navigation.tsx`
- `src/components/shared/page-header.tsx`
- `src/types/stock.ts`
- `src/constants/stock.ts`
- `src/lib/utils.ts` 中部分历史记录相关工具

建议：

- 先用全局引用搜索确认。
- 确认无使用后删除，或移动到归档目录。

### 2. 未使用依赖

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
    correlation/
  features/
    grid/
      components/
      hooks/
      lib/
      types.ts
    correlation/
      components/
      lib/
      types.ts
  shared/
    components/
    lib/
  constants/
```

短期建议：

- 保留 `app` 作为路由层，只做页面组合和 API 入口。
- 将业务计算迁移到 `features/*/lib`。
- 将类型定义放到 feature 内部或 `src/types`。

中期建议：

- `grid` 的计算逻辑可从 hook 中抽为纯函数，方便单元测试。
- 体量较大的 correlation 图表页可按「外壳 / option 构建 / 数据转换」拆分。

## 全项目文件结构 CR

本节补充对整个仓库文件结构的评审，不仅限于 `src`。当前仓库的主要问题不是业务代码目录本身，而是工具上下文、临时产物、Python 运行链路和文档说明混在同一个根目录下，导致项目边界不清晰。

### 1. 生成物和临时文件被 Git 跟踪

相关路径：

- `__pycache__/api_server.cpython-313.pyc`
- `tmp/*.png`
- `tmp/h5_doc_vs_html_diff.txt`
- `artifacts/python-utils/m1-kline-compare/m1_kline_compare.png`（脚本默认输出；目录已由 `.gitignore` 忽略）
- `artifacts/python-utils/stillwell-tracker/tracker_config_chart.png`（同上）

问题：

- `.pyc`、截图、调试对比文本、脚本输出图片都属于生成物或临时产物，不应进入版本控制。
- 当前 `.gitignore` 已包含 Python 缓存规则，但对已经被 Git 跟踪的文件不会自动生效。
- 当前工作区中 `tmp/` 下的文件已处于删除状态，说明正在清理，但还需要补充 ignore 规则防止复发。

建议：

- 在 `.gitignore` 中增加 `tmp/`。
- 对 Python 输出图片增加更明确的忽略规则，例如 `python-utils/**/*.png`，或在具体工具目录下维护局部 `.gitignore`。
- 对已跟踪生成物执行 `git rm --cached` 或提交删除。

### 2. AI 工具文件占比过高

相关路径：

- `.claude/skills/`
- `.cursor/skills/ui-ux-pro-max/`
- `.cursor/skills/stillwell-ui/SKILL.md`
- `.agents/skills/frontend-patterns/SKILL.md`
- `skills-lock.json`
- `AGENTS.md`

问题：

- Git 跟踪文件中，`.claude` 和 `.cursor` 下的工具文件数量远高于业务代码文件数量。
- `.claude/skills/` 中包含大量通用 skill、字体、Office schema、脚本和压缩包，并非当前股票工具项目的业务资产。
- `.cursor/skills/ui-ux-pro-max/` 当前已处于删除状态，方向是合理的。
- `skills-lock.json` 只声明了 `frontend-patterns`，但仓库实际 vendoring 了更多通用技能内容，来源关系不清晰。

建议：

- 只保留项目强相关的 AI 上下文，例如 `.cursor/rules/*`、`.cursor/skills/stillwell-ui/SKILL.md`。
- 将通用 skill 从 Git 跟踪中移除，依赖 `skills-lock.json` 或工具安装流程恢复。
- 如果必须保留 `AGENTS.md`，建议在文件头部说明它是 AI 工具入口，不是业务文档。

### 3. Python 工具链与 Next.js 主应用边界不清

相关路径：

- `requirements.txt`
- `runtime.txt`
- `scripts/`（例如 `fetch_etf_holdings.py`、`fetch_etf_kline.py`、`probe_etf_correlation.py` 等）
- `python-utils/`
- `src/app/api/holdings/route.ts`

问题：

- 根目录同时存在 Next.js 应用配置和 Python 依赖配置。
- `src/app/api/holdings/route.ts` 若在运行时调用 `scripts/` 下脚本，则 Python 不是纯离线工具，而是线上 API 的潜在运行时依赖；**Route 中的脚本路径必须与仓库内真实文件名保持一致**。
- `python-utils/` 下又有独立工具和 README，形成 `scripts/` 与 `python-utils/` 两套 Python 入口。
- `requirements.txt` 包含 Flask、Gunicorn、flask-caching 等依赖，但当前 Next.js 主应用未体现 Flask 服务边界，疑似历史残留。
- `runtime.txt` 不会让 Next.js Node Route Handler 自动拥有 Python 运行时。

建议：

- 若 Python 是运行时依赖，将其整理为明确的 `backend/`、`services/data-fetcher/` 或 `tools/python/` 目录，并在部署文档中说明。
- 若 Python 只是离线工具，把 `scripts/` 合并进 `python-utils/` 或 `tools/`，不要放在根目录影响主应用识别。
- 清理不再使用的 Flask/Gunicorn 依赖，或补充后端服务说明。

### 4. CI/部署工作流与真实运行时不一致

文件：`.github/workflows/deploy.yml`

问题：

- CI 安装 `requirements.txt`，但 Next.js 构建并不使用这些 Python 依赖。
- 安装 Python 依赖容易误导为线上 Node API 也具备同样的 Python 运行时。
- 部署使用 `amondnet/vercel-action@v25`，后续维护和 Vercel 官方 CLI 流程存在不确定性。

建议：

- 若 Python 只用于离线脚本，从主 CI 构建流程移除 Python 安装步骤。
- 若 Python 是运行时依赖，单独建立对应服务/函数的构建与部署验证。
- Vercel 部署建议改为官方 CLI 流程，例如 pull/build/deploy prebuilt。

### 5. README 与真实项目状态不一致

文件：`README.md`

问题：

- README 说明项目为「纯前端应用，无需配置数据库或外部服务」。
- 实际项目存在 `src/app/api/holdings/route.ts` 及可能的其他 API，并会请求外部数据。
- `package.json` 仍包含 `@supabase/supabase-js`、`@vercel/kv` 等疑似历史依赖。
- `package.json` 中版本为 `0.2.0`，README 写的是 `v0.4.x`。

建议：

- README 改为描述真实架构：Next.js App Router + 客户端页面 + API Route + 可选 Python 数据脚本。
- 如果 Supabase、Vercel KV 已废弃，删除依赖并从文档中移除相关表述。
- 本地运行章节补充 Python 依赖是否必须安装，以及哪些页面/API 会受影响。
- 对齐 README 与 `package.json` 中的版本号。

### 6. 设计文档目录定位不清

> **2026-05-09**：根目录 `design-system/` 已按精简计划删除；原文件可从 Git 历史恢复。UI 规范请优先参考 `.cursor/skills/stillwell-ui/SKILL.md`。

相关路径：

- `design-system/PAGE_AUDIT.md`
- `design-system/UI_TEMPLATE.md`
- `.cursor/skills/stillwell-ui/SKILL.md`

问题：

- `design-system/` 目录当前只包含两个 Markdown 文档，没有 tokens、组件库、样式包或设计系统代码。
- `.cursor/skills/stillwell-ui/SKILL.md` 已经承担 UI 生成规范，职责与 `design-system/` 文档部分重叠。

建议：

- 将 `design-system/` 移到 `doc/design-system/`。
- 或将其中内容合并为 `stillwell-ui` skill 的参考资料，形成单一 UI 规范入口。

### 7. 疑似废弃组件和命名不一致

相关路径：

- `src/components/stock/Navigation.tsx`
- `src/components/etf-terminal/*`
- `src/components/shared/page-header.tsx`
- `src/lib/utils.ts`

问题：

- `src/components/stock/Navigation.tsx` 未见引用，且文件名使用 PascalCase，与项目多数 kebab-case 组件文件不一致。
- `etf-terminal`、`page-header`、历史记录工具可能是早期功能遗留，需要确认是否仍有产品入口。

建议：

- 确认无引用后删除。
- 若仍需保留，统一文件命名，例如 `navigation.tsx`，并放到更准确的 feature 或 shared 目录。

### 8. `.vscode/settings.json` 混入个人偏好

文件：`.vscode/settings.json`

问题：

- `editor.fontSize`、`terminal.integrated.fontSize`、`debug.console.fontSize`、`editor.mouseWheelZoom` 属于个人编辑器偏好。
- 这类设置进入团队仓库会影响其他开发者本地体验。

建议：

- 仓库只保留项目级设置，如 formatter、TypeScript SDK、文件嵌套。
- 个人字体、缩放、字号配置移到用户级 settings。

### 结构清理优先级

1. 清理 Git 跟踪的生成物：`__pycache__`、`tmp/`、Python 输出图片。
2. 移除通用 AI skill vendoring，只保留项目强相关规则和 skill。
3. 明确 Python 工具链定位，统一 `scripts/` 与 `python-utils/`。
4. 同步 README 与真实架构，清理历史依赖。
5. 整理设计文档入口和疑似废弃组件。

## 验证记录

已执行：

```bash
pnpm run lint
npx tsc --noEmit
pnpm test -- --runInBand
```

结果：

- `pnpm run lint`：通过，无 warning 输出。
- `npx tsc --noEmit`：通过。
- `pnpm test -- --runInBand`：失败，原因是没有任何测试文件。

## 建议处理顺序

1. 修复 `holdings` API 命令注入和同步阻塞问题，并校准 Route 与实际 Python 脚本路径。
2. 抽离网格（及 correlation）中的纯计算逻辑，补充基础单元测试。
3. 清理未使用组件、未使用依赖和运行时/CI 中的 Python 边界问题。
4. 按需拆分偏大页面/图表，逐步演进到 feature 分层。
