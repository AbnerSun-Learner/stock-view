# 实施计划: ETF 收藏菜单与微信推送

**分支**: `001-favorites-wechat-notify` | **日期**: 2025-12-12 | **规格**: [spec.md](./spec.md)  
**输入**: 来自 `/specs/001-favorites-wechat-notify/spec.md` 的特性规格

**说明**: 本模板由 `/speckit.plan` 命令生成。执行流程见 `.specify/templates/commands/plan.md`。

## 摘要

- 在顶部菜单栏新增“收藏”入口，导航到收藏页面，展示用户所有收藏的 ETF。
- 收藏页面为每个 ETF 显示历史最高价、当前收盘价、-80% 目标价位，并可点击触发查询/详情。
- 支持微信绑定，收盘后通过公众号模板消息向已绑定用户推送收藏 ETF 最新价格信息。
- 兼容现有 localStorage 收藏数据；计划新增服务端存储以支撑推送（需用户标识）。
- 推送时间窗口：交易日 15:00-16:00，文本模板包含 ETF 代码、名称、关键价格信息。

## 技术背景

**语言/版本**: TypeScript、Next.js (App Router，已用 Tailwind CSS)  
**主要依赖**: Next.js、React、Tailwind CSS、lightweight-charts（已有）、内部 Python 抓取脚本（/api/stock 调用）  
**存储**: 现有 localStorage（收藏/历史）；新增服务端存储收藏 + 微信绑定，按 userId + 手机/邮箱 识别（可不验证验证码）；存储介质待选（KV/文件/DB）  
**测试**: 计划使用 Vitest + @testing-library/react 进行组件单测；Playwright 进行关键流集成/UI 测试；Webhook/推送流程用契约/集成测试模拟微信接口  
**目标平台**: Web（Next.js）；微信推送通过公众号模板消息  
**项目类型**: single（前端 + Next API Routes + 辅助脚本）  
**性能目标**: 页面 LCP ≤ 2.5s；收藏页首屏 p95 ≤ 3s（含数据获取）；推送送达 90% ≤ 1h；接口 p95 ≤ 500ms（缓存路径）  
**约束**: 不引入重复工具；推送需安全存储公众号凭证；尊重微信接口频控；手机号/邮箱可不做验证码校验；每日推送频率上限 1 次（userId+symbol 当日去重），推送失败需重试 2 次并记录
**规模/范围**: 个人/轻量级使用场景，收藏上限 50（沿用 LIMITS），每日一次推送/用户

## 宪章核验

_闸口：Phase 0 研究前必须通过，Phase 1 设计后需复检。_

- 代码质量：TS/JS 采用现有 lint + typecheck；公用工具复用 `lib/utils`；凭证管理集中。
- 测试：单测覆盖菜单入口与收藏页渲染；集成测试覆盖查询 → 收藏 → 展示；推送流程用模拟/契约测试；缺陷需回归用例。
- UX 一致性：复用顶部菜单样式与响应式；收藏列表空/错误/加载态；推送设置在现有风格内。
- 性能：收藏页 API p95 ≤ 500ms（缓存/批量查询）；Web Vitals 目标 LCP ≤ 2.5s；重路径监控。
- 文档与追溯：记录微信推送依赖、凭证与回滚；新增开关（推送开关、收盘时间）需说明默认与回滚。

## 项目结构

### 文档（本特性）

```text
specs/001-favorites-wechat-notify/
├── plan.md              # 本文件（/speckit.plan 输出）
├── research.md          # Phase 0 输出
├── data-model.md        # Phase 1 输出
├── quickstart.md        # Phase 1 输出
├── contracts/           # Phase 1 输出
└── tasks.md             # Phase 2 (/speckit.tasks 生成)
```

### 源码（仓库根目录）

```text
src/
├── app/
│   ├── page.tsx                  # 首页
│   ├── favorites/                # 新增收藏页面路由
│   └── api/
│       ├── stock/route.ts        # 现有查询
│       ├── wechat/bind/route.ts  # 新增绑定接口
│       ├── wechat/push/route.ts  # 手动/定时触发推送
│       └── favorites/route.ts    # （可选）服务端收藏持久化
├── components/
│   └── stock/
│       ├── FavoritesList.tsx
│       ├── FavoritesPage.tsx     # 新增页面组件
│       └── PushSettings.tsx      # 微信绑定/开关
├── lib/
│   ├── wechat.ts                 # 微信 API 客户端/签名/模板
│   ├── favorites-store.ts        # 本地+远端收藏同步
│   └── jobs.ts                   # 推送触发封装
tests/
├── unit/
├── integration/
└── e2e/                          # Playwright
scripts/
└── cron/wechat-push.ts           # （可选）定时触发脚本
```

**结构决策**: 采用单项目 Next.js 结构；新增 `app/favorites` 页面与 `app/api/wechat/*` 路由；可选 `app/api/favorites` 以支持服务端存储；推送入口可由 Vercel Cron 或外部定时器调用 `app/api/wechat/push`。

## 复杂度追踪

> **仅当宪章核验存在需豁免的违规时填写**

| 违规项               | 必要原因                       | 更简单方案为何不可行             |
| -------------------- | ------------------------------ | -------------------------------- |
| 本地收藏需服务端副本 | 推送需要服务端可访问的收藏数据 | 仅本地存储无法支撑服务端定时推送 |
