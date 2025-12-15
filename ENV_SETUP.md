# 环境变量配置指南

## 📋 配置位置

### 1. 本地开发环境

在项目根目录创建 `.env.local` 文件（此文件不会被提交到 Git）：

```bash
# 复制示例文件
cp .env.example .env.local

# 编辑 .env.local，填入实际值
```

**必需的环境变量**：

```bash
# 微信公众号配置
WECHAT_APP_ID=wx1234567890abcdef
WECHAT_APP_SECRET=your_secret_key_here
NEXT_PUBLIC_WECHAT_APP_ID=wx1234567890abcdef

# 微信模板消息 ID
WECHAT_TEMPLATE_ID=your_template_id_here

# 推送服务安全令牌（随机生成）
WECHAT_PUSH_TOKEN=your_random_token_here

# Vercel KV（本地开发可选）
KV_REST_API_URL=https://your-kv-instance.vercel-storage.com
KV_REST_API_TOKEN=your_kv_token_here
```

### 2. 生产环境（Vercel）

在 Vercel Dashboard 中配置：

1. **进入项目设置**：

   - 访问 https://vercel.com/dashboard
   - 选择你的项目
   - 点击 **Settings** → **Environment Variables**

2. **添加环境变量**：

   - 点击 **Add New**
   - 输入变量名和值
   - 选择环境（Production、Preview、Development）
   - 点击 **Save**

3. **需要配置的变量**：

   | 变量名                      | 说明                            | 示例值               |
   | --------------------------- | ------------------------------- | -------------------- |
   | `WECHAT_APP_ID`             | 微信公众号 AppID                | `wx1234567890abcdef` |
   | `WECHAT_APP_SECRET`         | 微信公众号 AppSecret            | `your_secret_key`    |
   | `NEXT_PUBLIC_WECHAT_APP_ID` | 前端 OAuth2 使用的 AppID        | `wx1234567890abcdef` |
   | `WECHAT_TEMPLATE_ID`        | 模板消息 ID                     | `template_id_123`    |
   | `WECHAT_PUSH_TOKEN`         | 推送 API 安全令牌               | `随机生成的 token`   |
   | `KV_REST_API_URL`           | Vercel KV URL（通常自动配置）   | -                    |
   | `KV_REST_API_TOKEN`         | Vercel KV Token（通常自动配置） | -                    |

4. **配置 Cron Job**：
   - 进入 **Settings** → **Cron Jobs**
   - 点击 **Add Cron Job**
   - 配置如下：
     - **Path**: `/api/wechat/push`
     - **Schedule**: `0 15 * * 1-5`（工作日 15:00）
     - **Headers**:
       ```json
       {
         "x-push-token": "your_WECHAT_PUSH_TOKEN_value"
       }
       ```

## 🔑 如何获取配置值

### 微信公众号配置

1. **登录微信公众平台**：

   - 访问 https://mp.weixin.qq.com/
   - 使用管理员账号登录

2. **获取 AppID 和 AppSecret**：

   - 进入 **开发** → **基本配置**
   - 查看 **AppID(应用 ID)**
   - 点击 **生成** 或查看 **AppSecret(应用密钥)**

3. **配置 OAuth2 回调域名**：

   - 进入 **开发** → **接口权限** → **网页授权**
   - 点击 **修改**，添加你的域名（如：`your-domain.com`）
   - 注意：不需要加 `http://` 或 `https://`

4. **创建模板消息**：
   - 进入 **功能** → **模板消息**
   - 点击 **添加模板**
   - 选择行业和模板，获取 **模板 ID**

### 生成 WECHAT_PUSH_TOKEN

可以使用以下方式生成随机令牌：

**方式 1：使用 OpenSSL**（推荐）

```bash
openssl rand -hex 32
```

**方式 2：使用 Node.js**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**方式 3：在线生成**

- 访问 https://www.uuidgenerator.net/
- 生成 UUID v4

## ✅ 验证配置

### 本地验证

1. **检查环境变量是否加载**：

   ```bash
   npm run dev
   # 访问 http://localhost:3000/favorites
   # 查看控制台是否有配置错误
   ```

2. **测试推送 API**（需要先配置好所有变量）：
   ```bash
   curl -X POST http://localhost:3000/api/wechat/push \
     -H "x-push-token: your_WECHAT_PUSH_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"date": "2025-12-12"}'
   ```

### 生产环境验证

1. **部署后检查**：

   - 在 Vercel Dashboard 查看部署日志
   - 确认没有环境变量相关的错误

2. **测试推送**：
   - 手动触发 Cron Job 或调用 API
   - 检查日志确认推送是否成功

## 🔒 安全注意事项

1. **不要提交 `.env.local` 到 Git**：

   - 已添加到 `.gitignore`
   - 只提交 `.env.example` 作为模板

2. **生产环境使用强随机令牌**：

   - `WECHAT_PUSH_TOKEN` 应使用强随机字符串
   - 定期轮换（如每季度）

3. **保护 AppSecret**：

   - 不要在前端代码中暴露
   - 只在服务端 API 中使用

4. **Vercel KV 自动配置**：
   - 如果使用 Vercel KV，通常会自动配置
   - 无需手动设置 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN`

## 📝 配置检查清单

- [ ] 已创建 `.env.local` 文件（本地开发）
- [ ] 已在 Vercel Dashboard 配置所有环境变量（生产环境）
- [ ] 已获取微信公众号 AppID 和 AppSecret
- [ ] 已配置 OAuth2 回调域名
- [ ] 已创建模板消息并获取模板 ID
- [ ] 已生成 `WECHAT_PUSH_TOKEN` 随机令牌
- [ ] 已配置 Vercel Cron Job（生产环境）
- [ ] 已测试本地环境变量加载
- [ ] 已测试推送 API（可选）

## 🆘 常见问题

### Q: 本地开发时提示 "微信配置未设置"

A: 检查 `.env.local` 文件是否存在，且变量名是否正确（注意大小写）

### Q: Vercel 部署后环境变量不生效

A:

1. 确认在 Vercel Dashboard 中已添加环境变量
2. 重新部署项目（环境变量更改后需要重新部署）
3. 检查变量名是否正确

### Q: OAuth2 授权失败

A:

1. 检查 `NEXT_PUBLIC_WECHAT_APP_ID` 是否正确
2. 确认回调域名已在微信公众平台配置
3. 检查回调 URL 格式是否正确

### Q: 推送 API 返回 401

A: 检查请求头中的 `x-push-token` 是否与 `WECHAT_PUSH_TOKEN` 环境变量一致

---

**需要帮助？** 查看 `specs/001-favorites-wechat-notify/quickstart.md` 获取更多信息。
