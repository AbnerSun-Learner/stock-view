# contracts/wechat.md - 微信相关 API 合同

## POST /api/wechat/bind

**用途**：绑定微信账号

**请求**：

```json
{
  "code": "string",      // 微信 OAuth2 授权码
  "userId": "string",   // 用户 ID
  "contact": "string",  // 手机号或邮箱
  "contactType": "phone" | "email"
}
```

**响应**：

```json
{
  "ok": true,
  "openId": "string" // 返回 OpenID（仅用于确认，不存储在前端）
}
```

**错误响应**：

```json
{
  "ok": false,
  "error": "invalid_code" | "auth_failed" | "rate_limited"
}
```

**行为**：

1. 使用 code 换取 openId/unionId（调用微信 API）
2. 将绑定信息存储到 Vercel KV（key: `wechat:${userId}`）
3. 加密存储 openId（使用 `WECHAT_APP_SECRET`）

---

## DELETE /api/wechat/bind

**用途**：解绑微信账号

**请求**：

```json
{
  "userId": "string"
}
```

**响应**：

```json
{
  "ok": true
}
```

**行为**：

1. 从 Vercel KV 删除绑定记录（key: `wechat:${userId}`）
2. 停止该用户的推送服务

---

## POST /api/wechat/push

**用途**：触发当日推送（由 Vercel Cron 或手动调用）

**认证**：请求头需包含 `x-push-token: ${WECHAT_PUSH_TOKEN}`

**请求**：

```json
{
  "date": "string" // 可选，格式 YYYY-MM-DD，默认今日
}
```

**响应**：

```json
{
  "ok": true,
  "sent": 10, // 成功推送数
  "failed": 2, // 失败数
  "retries": 1 // 重试数
}
```

**行为**：

1. 验证 `x-push-token` 请求头
2. 从 Vercel KV 拉取所有已绑定用户（`wechat:*`）
3. 为每个用户拉取收藏记录（`favorites:${userId}`）
4. 为每个 symbol 调用 `/api/stock` 获取价格数据
5. 检查 dedupKey（`pushlog:${userId}:${date}:${symbol}`）是否已存在，避免重复推送
6. 发送公众号模板消息（字段：ETF 代码、名称、历史最高价、当前收盘价、-80% 目标价位）
7. 记录 PushLog（成功/失败）
8. 失败项自动重试（间隔 5 分钟、15 分钟，最多 2 次）

**幂等性**：使用 dedupKey（`userId:date:symbol`）确保同一日同一 ETF 仅推送一次

---

# contracts/favorites.md - 收藏相关 API 合同

## GET /api/favorites

**用途**：获取用户的收藏列表

**请求**：

```
GET /api/favorites?userId=${userId}
```

**响应**：

```json
{
  "ok": true,
  "favorites": [
    {
      "symbol": "510300",
      "name": "沪深300ETF",
      "createdAt": "2025-12-12T10:00:00Z"
    }
  ]
}
```

**行为**：

1. 从 Vercel KV 读取收藏记录（key: `favorites:${userId}`）
2. 返回收藏列表（按 createdAt 倒序）

---

## POST /api/favorites

**用途**：同步收藏记录到服务端

**请求**：

```json
{
  "userId": "string",
  "contact": "string",      // 手机号或邮箱
  "contactType": "phone" | "email",
  "favorites": [
    {
      "symbol": "510300",
      "name": "沪深300ETF"
    }
  ]
}
```

**响应**：

```json
{
  "ok": true,
  "synced": 5, // 同步的收藏数
  "removed": 1 // 移除的收藏数（服务端有但客户端没有）
}
```

**行为**：

1. 创建或更新用户标识（`user:${userId}`）
2. 同步收藏记录到 Vercel KV（`favorite:${userId}:${symbol}`）
3. 删除客户端未提供的收藏（增量同步）
4. 返回同步结果

**校验**：

- symbol 格式校验（6 位数字，可含 .SZ/.SH）
- 收藏上限：50（超过则返回错误）

---

## DELETE /api/favorites/:symbol

**用途**：删除单个收藏

**请求**：

```
DELETE /api/favorites/510300?userId=${userId}
```

**响应**：

```json
{
  "ok": true
}
```

**行为**：

1. 从 Vercel KV 删除收藏记录（key: `favorite:${userId}:${symbol}`）
2. 从集合中移除（`favorites:${userId}`）

---

## 安全与幂等

- `/api/wechat/push` 需内部 token 保护（`x-push-token` 请求头）
- 推送使用 dedupKey 保证幂等性（同一日同一 ETF 仅推送一次）
- 绑定信息存储在服务端，前端不保存 accessToken
- 所有 API 需验证 userId 格式（UUID v4）
