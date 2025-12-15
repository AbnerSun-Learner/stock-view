# 任务: ETF 收藏菜单与微信推送

**输入**: 来自 `/specs/001-favorites-wechat-notify/` 的设计文档  
**前置**: plan.md（必需）、spec.md（用户故事必需）、data-model.md、contracts/

**测试**: 按宪章要求，每次变更必须包含"先失败"的自动化测试（逻辑用单测，边界用集成，关键流程用 UI）；修复缺陷必须补回归测试。

**组织**: 任务按用户故事分组，以支持独立实现与测试。

**宪章对齐**: 覆盖代码质量（lint/类型）、UX 一致性（设计系统 + 无障碍）、性能（Web Vitals/延迟预算与监控）、文档与追溯（决策记录、上线/回滚）。

## 格式: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无依赖）
- **[Story]**: 该任务所属的用户故事（如 US1、US2、US3）
- 任务描述中应包含精确文件路径

## 路径约定

- **单项目**: 仓库根目录下 `src/`、`tests/`
- 路径基于 Next.js App Router 结构

---

## Phase 1: 初始化（共享基础设施）

**目的**: 项目初始化与基础结构

- [x] T001 安装 Vercel KV 依赖包 `@vercel/kv` 到 package.json
- [x] T002 [P] 创建 Vercel KV 客户端工具在 src/lib/kv.ts
- [x] T003 [P] 创建用户标识工具（UUID 生成、存储）在 src/lib/user-id.ts
- [x] T004 [P] 创建类型定义文件 src/types/favorites.ts（FavoriteItem、UserIdentity、WeChatBinding、PushLog）

---

## Phase 2: 基础能力（阻塞性前置）

**目的**: 所有用户故事开始前必须完成的核心基础设施

**⚠️ 关键**: 在完成本阶段前，不得开展用户故事工作

- [x] T005 创建收藏同步工具 src/lib/favorites-store.ts（localStorage + Vercel KV 双向同步逻辑：服务端优先策略、冲突时以服务端数据为准、首次加载时从服务端同步到本地、本地变更时增量同步到服务端）
- [x] T006 [P] 创建 Vercel KV 环境变量配置检查与初始化
- [x] T007 [P] 创建 API 错误处理中间件在 src/lib/api-error.ts
- [x] T008 创建收藏数据迁移工具（localStorage → Vercel KV）在 src/lib/migrate-favorites.ts
- [x] T008a [P] 创建用户身份识别组件 src/components/stock/UserIdentityForm.tsx（收集手机号/邮箱，无需验证码）

**检查点**: 基础准备就绪 → 可并行启动用户故事实现

---

## Phase 3: 用户故事 1 - 通过菜单栏访问收藏页面 (优先级: P1) 🎯 MVP

**目标**: 在顶部菜单栏新增"收藏"入口，导航到收藏页面，展示用户所有收藏的 ETF 列表

**独立测试**: 通过点击菜单栏中的"收藏"入口，能够导航到收藏页面，并看到所有已收藏 ETF 的列表

### 用户故事 1 的测试

> **注意：先编写这些测试，确保在实现前处于失败状态**

- [ ] T009 [P] [US1] 在 tests/integration/test-favorites-navigation.tsx 中编写菜单导航到收藏页面的集成测试
- [ ] T010 [P] [US1] 在 tests/unit/test-favorites-page.tsx 中编写收藏页面组件渲染测试（空状态、有数据状态）

### 用户故事 1 的实现

- [x] T011 [US1] 在 src/app/layout.tsx 或导航组件中添加"收藏"菜单项，链接到 /favorites
- [x] T012 [US1] 创建收藏页面路由 src/app/favorites/page.tsx
- [x] T013 [US1] 创建收藏页面组件 src/components/stock/FavoritesPage.tsx（基础布局、空状态）
- [x] T013a [US1] 在 FavoritesPage 中集成 UserIdentityForm 组件（首次访问时收集联系方式）
- [x] T014 [US1] 集成 FavoritesList 组件到 FavoritesPage，从 localStorage 读取收藏数据
- [x] T015 [US1] 添加收藏页面导航逻辑（点击 ETF 项跳转到首页并触发查询）

**检查点**: 此时用户故事 1 应可独立运行并通过测试

---

## Phase 4: 用户故事 2 - 查看收藏 ETF 的价格信息 (优先级: P1) 🎯 MVP

**目标**: 在收藏页面为每个收藏的 ETF 显示历史最高价、当前收盘价、-80% 目标价位

**独立测试**: 通过访问收藏页面，能够看到每个收藏 ETF 的完整价格信息卡片

### 用户故事 2 的测试

- [ ] T016 [P] [US2] 在 tests/integration/test-favorites-price-display.tsx 中编写价格信息展示的集成测试
- [ ] T017 [P] [US2] 在 tests/unit/test-favorites-price-card.tsx 中编写价格卡片组件测试

### 用户故事 2 的实现

- [x] T018 [US2] 创建价格信息卡片组件 src/components/stock/FavoritePriceCard.tsx（显示最高价、收盘价、-80% 目标价）
- [x] T019 [US2] 在 FavoritesPage 中为每个收藏 ETF 调用 /api/stock 获取价格数据
- [x] T020 [US2] 实现批量价格数据获取逻辑（避免逐个请求，优化性能）
- [x] T021 [US2] 添加加载状态显示（Skeleton 或 Spinner）
- [x] T022 [US2] 添加错误处理与重试机制（数据获取失败时显示错误提示）
- [x] T023 [US2] 实现服务端收藏 API GET /api/favorites/route.ts（从 Vercel KV 读取）
- [x] T024 [US2] 实现服务端收藏同步 API POST /api/favorites/route.ts（同步到 Vercel KV）
- [x] T025 [US2] 在 FavoritesPage 中集成服务端同步逻辑（首次加载时从服务端同步）

**检查点**: 此时用户故事 1 与 2 均可独立运行

---

## Phase 5: 用户故事 3 - 绑定微信并接收收盘推送 (优先级: P2)

**目标**: 支持微信账号绑定，并在每天收盘后自动推送收藏 ETF 的最新价格信息

**独立测试**: 通过设置页面绑定微信账号，系统记录绑定状态，并在收盘后推送价格信息

### 用户故事 3 的测试

- [ ] T026 [P] [US3] 在 tests/integration/test-wechat-bind.tsx 中编写微信绑定流程的集成测试（模拟 OAuth2）
- [ ] T027 [P] [US3] 在 tests/unit/test-wechat-push.tsx 中编写推送逻辑的单元测试（模拟微信 API）

### 用户故事 3 的实现

- [ ] T028 [US3] 创建微信 API 客户端工具 src/lib/wechat.ts（access_token 获取与缓存、模板消息发送）
- [ ] T029 [US3] 实现微信绑定 API POST /api/wechat/bind/route.ts（OAuth2 code 换取 openId，存储到 Vercel KV）
- [ ] T030 [US3] 实现微信解绑 API DELETE /api/wechat/bind/route.ts（清除 Vercel KV 绑定记录）
- [ ] T031 [US3] 创建推送设置组件 src/components/stock/PushSettings.tsx（绑定/解绑界面）
- [ ] T032 [US3] 在 FavoritesPage 或设置页面集成 PushSettings 组件
- [ ] T033 [US3] 实现推送触发 API POST /api/wechat/push/route.ts（读取绑定用户、收藏、价格数据，发送模板消息；数据获取延迟时：等待最多 30 秒，超时则跳过该 ETF 并记录，继续处理其他 ETF）
- [ ] T034 [US3] 实现推送去重逻辑（dedupKey: userId+date+symbol，检查 PushLog）
- [ ] T035 [US3] 实现推送失败重试机制（最多 2 次，间隔 5 分钟、15 分钟）
- [ ] T036 [US3] 实现推送记录存储（PushLog 写入 Vercel KV）
- [ ] T037 [US3] 配置 Vercel Cron Job（vercel.json 或 Dashboard，工作日 15:00 触发 /api/wechat/push）
- [ ] T038 [US3] 添加推送 API 安全验证（x-push-token 请求头验证）

**检查点**: 此时所有用户故事均应可独立运行

---

## Phase 6: 打磨与跨领域事项

**目的**: 影响多个用户故事的改进

- [ ] T039 [P] 更新 README.md 添加新功能说明
- [ ] T040 [P] 添加环境变量文档 .env.example（WECHAT_APP_ID、WECHAT_APP_SECRET、WECHAT_PUSH_TOKEN、KV 配置）
- [ ] T041 代码清理与重构（提取公共逻辑、优化性能）
- [ ] T042 [P] 添加单元测试覆盖工具函数（tests/unit/test-favorites-store.ts、test-user-id.ts）
- [ ] T043 安全加固（敏感信息加密、日志脱敏、输入验证）
- [ ] T044 性能优化（收藏页面批量请求优化、缓存策略）
- [ ] T045 执行 quickstart.md 验证（环境配置、本地运行、部署测试）
- [ ] T046 添加错误监控与日志记录（推送失败告警）

---

## 依赖与执行顺序

### 阶段依赖

- **Setup (Phase 1)**: 无依赖，可立即开始
- **Foundational (Phase 2)**: 依赖 Setup 完成，阻塞所有用户故事
- **User Stories (Phase 3+)**: 依赖基础阶段完成
  - 可并行推进（若人力充足）
  - 或按优先级顺序串行（P1 → P2）
- **Polish (Final Phase)**: 依赖所有目标用户故事完成

### 用户故事依赖

- **用户故事 1 (P1)**: 基础完成后即可开始；无其他故事依赖
- **用户故事 2 (P1)**: 基础完成后即可开始；依赖 US1 的收藏页面基础结构
- **用户故事 3 (P2)**: 基础完成后即可开始；依赖 US1/US2 的收藏数据与价格展示

### 每个用户故事内部

- 测试必须先写并确保在实现前失败
- 先工具/组件，后 API
- 先核心实现，后集成
- 完成当前故事后再推进下一优先级

### 并行机会

- Phase 1: T002、T003、T004 可并行
- Phase 2: T006、T007 可并行
- Phase 3: T009、T010 可并行；T013、T014 可并行
- Phase 4: T016、T017 可并行；T023、T024 可并行
- Phase 5: T026、T027 可并行；T028、T029、T030 可并行
- Phase 6: T039、T040、T042 可并行

---

## 实施策略

### MVP 优先（用户故事 1 + 2）

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（关键，阻塞所有故事）
3. 完成 Phase 3: 用户故事 1（菜单与收藏页面）
4. 完成 Phase 4: 用户故事 2（价格信息展示）
5. **停止并验证**：独立测试用户故事 1 与 2
6. 准备就绪则发布/演示（MVP）

### 增量交付

1. 完成 Setup + Foundational → 基础就绪
2. 加入用户故事 1 → 独立测试 → 发布/演示
3. 加入用户故事 2 → 独立测试 → 发布/演示（MVP）
4. 加入用户故事 3 → 独立测试 → 发布/演示
5. 每个故事都应在不破坏前序价值的情况下增量交付

### 并行团队策略

多人协作时：

1. 团队共同完成 Setup + Foundational
2. 基础完成后：
   - 成员 A：用户故事 1（菜单与页面）
   - 成员 B：用户故事 2（价格展示）
   - 成员 C：用户故事 3（微信推送）
3. 故事完成并集成

---

## 备注

- [P] 任务 = 不同文件、无依赖
- [Story] 标签用于将任务映射到具体用户故事，便于追溯
- 每个用户故事应可独立完成与测试
- 实施前先确保测试失败
- 按任务或逻辑组提交
- 任一检查点可暂停以独立验证
- 避免：任务含糊、同文件冲突、跨故事耦合破坏独立性

---

## 任务统计

- **总任务数**: 48（新增 T008a, T013a）
- **Phase 1 (Setup)**: 4 任务
- **Phase 2 (Foundational)**: 4 任务
- **Phase 3 (US1)**: 7 任务（2 测试 + 5 实现）
- **Phase 4 (US2)**: 10 任务（2 测试 + 8 实现）
- **Phase 5 (US3)**: 11 任务（2 测试 + 9 实现）
- **Phase 6 (Polish)**: 8 任务
- **可并行任务**: 约 15 个

## 建议 MVP 范围

- **MVP**: Phase 1 + Phase 2 + Phase 3 + Phase 4（用户故事 1 与 2）
- **后续迭代**: Phase 5（用户故事 3，微信推送功能）
