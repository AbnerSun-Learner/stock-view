# data-model.md - ETF 收藏菜单与微信推送

## 实体

### 用户标识（UserIdentity）

- userId: string（前端生成 UUID，存储在 cookie/localStorage，同步到服务端 Vercel KV）
- contact: string（手机号或邮箱，无需验证码）
- contactType: enum(phone, email)
- createdAt: datetime

**存储**：Vercel KV，key 格式：`user:${userId}`

### 收藏记录（Favorite)

- userId: string
- symbol: string（ETF 代码，6 位数字，可含 .SZ/.SH）
- name: string（ETF 名称）
- createdAt: datetime

**存储**：Vercel KV，key 格式：`favorite:${userId}:${symbol}`，集合 key：`favorites:${userId}`

### 价格数据快照（PriceSnapshot)

- symbol: string
- highestClose: number（历史最高收盘价）
- latestClose: number（当前收盘价）
- target80: number（-80% 目标价位）
- expectedDropPct: number（预期跌幅百分比）
- fetchedAt: datetime

**存储**：临时数据，不持久化，由 `/api/stock` 实时获取

### 微信绑定（WeChatBinding)

- userId: string
- contact: string（手机号或邮箱，用于对账/通知）
- openId: string（微信 OpenID，加密存储）
- unionId: string?（微信 UnionID，如有则存储）
- boundAt: datetime
- status: enum(active, revoked)

**存储**：Vercel KV，key 格式：`wechat:${userId}`，敏感信息使用环境变量 `WECHAT_APP_SECRET` 加密

### 推送记录（PushLog)

- userId: string
- contact: string
- sentAt: datetime
- items: [{ symbol, name, highestClose, latestClose, target80, expectedDropPct }]
- status: enum(success, failed)
- retryCount: number（0-2）
- error: string?（失败原因）
- dedupKey: string（格式：`${userId}:${symbol}:${date}`，用于去重）

**存储**：Vercel KV，key 格式：`pushlog:${userId}:${date}:${symbol}`，集合 key：`pushlogs:${date}`

## 关系

- UserIdentity 1..N Favorite（一个用户可收藏多个 ETF）
- UserIdentity 0..1 WeChatBinding（一个用户最多绑定一个微信）
- UserIdentity 1..N PushLog（一个用户可有多条推送记录）
- PushLog 包含 PriceSnapshot 数据（内嵌，不单独存储）

## 校验/约束

- symbol 必须满足 ETF 代码格式（6 位数字，可含 .SZ/.SH），服务端/客户端均需校验
- 收藏上限：50（与 LIMITS.maxFavorites 一致）
- 推送内容去重：同一 symbol 当日仅推送一次（dedupKey=userId+symbol+date）
- 价格数据需来源于 /api/stock，失败时记录错误并可重试（最多 2 次）
- userId 格式：UUID v4，由前端生成，首次使用时同步到服务端
- contact 格式：手机号（11 位数字）或邮箱（标准格式），无需验证码校验

## 存储方案

- **介质**：Vercel KV（Redis 兼容）
- **同步策略**：前端 localStorage 作为缓存，首次加载时从服务端同步，后续增量更新
- **数据迁移**：现有 localStorage 收藏数据在首次访问时自动同步到服务端

## 安全约束

- OpenID/UnionID 存储在 Vercel KV，使用环境变量 `WECHAT_APP_SECRET` 加密
- 日志中仅输出 openId 前 4 位 + 后 4 位，中间用 `***` 替代
- access_token 由服务端管理，存储在内存缓存中，过期时自动刷新（2 小时有效期）
