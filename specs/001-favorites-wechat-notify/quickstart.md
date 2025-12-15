# quickstart.md - ETF 收藏菜单与微信推送

## 环境变量

### 必需变量

```bash
# 微信公众号配置
WECHAT_APP_ID=xxxx                    # 公众号 AppID
WECHAT_APP_SECRET=xxxx                # 公众号 AppSecret（用于加密存储）

# 推送触发保护
WECHAT_PUSH_TOKEN=xxxx                # 内部触发 /api/wechat/push 的鉴权 token

# Vercel KV（如未自动配置）
KV_REST_API_URL=xxxx                  # Vercel KV REST API URL
KV_REST_API_TOKEN=xxxx                # Vercel KV REST API Token
```

### Vercel 配置

在 Vercel 项目设置中：

1. 添加环境变量（上述所有变量）
2. 连接 Vercel KV 数据库（自动配置 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN`）
3. 配置 Cron Job：
   - Path: `/api/wechat/push`
   - Schedule: `0 15 * * 1-5`（工作日 15:00，即收盘后）
   - Headers: `x-push-token: ${WECHAT_PUSH_TOKEN}`

## 本地运行

1. **安装依赖**：

   ```bash
   npm install
   npm install @vercel/kv  # 如未安装
   ```

2. **配置本地环境变量**：

   ```bash
   cp .env.example .env.local
   # 编辑 .env.local，填入上述环境变量
   ```

3. **启动开发服务**：

   ```bash
   npm run dev
   ```

4. **测试推送接口**（需模拟）：
   ```bash
   curl -X POST http://localhost:3000/api/wechat/push \
     -H "x-push-token: $WECHAT_PUSH_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"date": "2025-12-12"}'
   ```

## 部署与定时

### Vercel 部署

1. **推送代码到 Git 仓库**
2. **在 Vercel 中导入项目**
3. **配置环境变量**（见上方）
4. **配置 Cron Job**：
   - 在 `vercel.json` 中添加：
   ```json
   {
     "crons": [
       {
         "path": "/api/wechat/push",
         "schedule": "0 15 * * 1-5"
       }
     ]
   }
   ```
   - 或在 Vercel Dashboard 中配置 Cron Jobs

### 其他环境

使用外部定时器（如 GitHub Actions、第三方 Cron 服务）：

- URL: `https://your-domain.com/api/wechat/push`
- Method: POST
- Headers: `x-push-token: ${WECHAT_PUSH_TOKEN}`
- Schedule: 工作日 15:00（收盘后）

## 迁移与兼容

### 收藏数据迁移

- **现有 localStorage 收藏**：首次访问收藏页面时自动同步到服务端
- **同步策略**：前端 localStorage 作为缓存，服务端 Vercel KV 为数据源
- **冲突解决**：服务端数据优先，客户端增量同步

### 用户标识

- **userId 生成**：前端生成 UUID v4，存储在 cookie/localStorage
- **身份识别**：用户需提供手机号或邮箱（无需验证码）
- **数据关联**：userId + contact 唯一标识用户

### 价格数据

- **数据来源**：复用现有 `/api/stock` 逻辑，无需额外服务
- **缓存策略**：推送时实时获取，不持久化价格快照

## 测试

### 单元测试

- 组件渲染：菜单入口、收藏列表状态（空/加载/错误）
- 工具函数：userId 生成、收藏同步逻辑、dedupKey 生成

### 集成测试

- 收藏流程：查询 → 收藏 → 同步服务端 → 展示价格
- API 错误处理：网络失败、数据格式错误、超时重试
- 推送流程：在测试环境使用 stub，模拟微信 API

### E2E 测试

- 菜单导航：首页 → 菜单栏 → 收藏页面
- 收藏操作：添加、删除、查看价格信息
- 微信绑定：OAuth2 流程（需模拟或测试环境）

## 故障排查

### 推送失败

1. **检查环境变量**：确认 `WECHAT_APP_ID`、`WECHAT_APP_SECRET` 正确
2. **检查 token**：确认 `WECHAT_PUSH_TOKEN` 在请求头中
3. **查看日志**：检查 PushLog 中的 error 字段
4. **手动触发**：使用 curl 手动触发推送接口测试

### 收藏同步失败

1. **检查 Vercel KV 连接**：确认 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN` 正确
2. **检查 userId 格式**：确认 userId 为有效的 UUID v4
3. **查看网络请求**：检查浏览器 Network 面板中的 API 请求

### 微信绑定失败

1. **检查 OAuth2 配置**：确认公众号回调 URL 配置正确
2. **检查 code 有效性**：确认 code 未过期（5 分钟有效期）
3. **查看错误响应**：检查 API 返回的错误码
