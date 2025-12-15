# research.md - ETF 收藏菜单与微信推送

## Phase 0 状态总结

### ✅ 需求澄清已完成（通过 /speckit.clarify）

所有需求层面的澄清已通过 `/speckit.clarify` 完成：

- 收藏数据服务端存储（推送读服务端）
- 用户标识：手机号/邮箱（无需验证码）
- 推送频率：每日 1 次，按用户+symbol 去重
- 推送重试：失败重试 2 次 + 记录告警 + 支持手动触发

### ✅ 技术实现决策（基于现有技术栈快速确定）

基于项目技术栈（Next.js + Vercel + TypeScript），以下技术选型可直接确定：

#### R1: 微信公众号模板消息

**决策**：

- 模板格式：使用微信官方模板消息 API，字段数量按模板定义（通常 2-5 个字段）
- 内容长度：单个字段建议 ≤20 字符，总消息 ≤512 字符（微信限制）
- token 缓存：使用内存缓存（Next.js API Route 单例），有效期 2 小时，自动刷新
- 防重：已在需求中明确（按用户+symbol 当日去重），实现时使用 dedupKey

#### R2: 定时触发方案

**决策**：

- 使用 **Vercel Cron Jobs**（项目已部署在 Vercel）
- 端点保护：使用环境变量 `WECHAT_PUSH_TOKEN` 验证请求头
- 幂等性：使用 `userId + date + symbol` 作为 dedupKey，存储在推送记录中
- 重试：失败后间隔 5 分钟、15 分钟各重试 1 次（共 2 次）

#### R3: 数据存储介质

**决策**：

- 使用 **Vercel KV**（Redis 兼容，免费额度充足，适合轻量级场景）
- 同步策略：前端 localStorage 作为缓存，首次加载时从服务端同步，后续增量更新
- API 设计：`GET /api/favorites`（读取）、`POST /api/favorites`（同步）、`DELETE /api/favorites/:symbol`（删除）

#### R4: 微信绑定安全

**决策**：

- 敏感信息存储：OpenID/UnionID 存储在 Vercel KV，使用环境变量 `WECHAT_APP_SECRET` 加密
- 日志脱敏：日志中仅输出 openId 前 4 位 + 后 4 位，中间用 `***` 替代
- 解绑流程：调用 `DELETE /api/wechat/bind`，清除 KV 中的绑定记录
- token 过期：access_token 由服务端管理，过期时自动刷新（2 小时有效期）

---

## Phase 0 完成确认

- [x] 需求澄清已完成（5 个澄清问题已解决）
- [x] 技术选型已确定（基于现有技术栈）
- [x] 决策已记录在本文档
- [x] 决策已同步到 plan.md、data-model.md、contracts/（Phase 1 已完成）

## Phase 1 完成确认

- [x] data-model.md 已更新（实体定义、存储方案、安全约束）
- [x] contracts/ 已完善（微信 API、收藏 API、安全与幂等）
- [x] quickstart.md 已更新（环境变量、部署配置、测试指南）
- [x] 代理上下文已更新（cursor-agent）

---

## 备注

- 所有技术决策基于项目现有技术栈（Next.js + Vercel），无需额外研究
- 如后续需要调整技术选型（如改用数据库、外部 Cron），可在实施阶段根据实际情况调整
- Phase 0 可视为已完成，可进入 Phase 1 设计与合同阶段
