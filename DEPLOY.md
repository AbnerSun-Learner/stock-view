# 部署指南

本指南将帮助您将 stock-view 项目部署到 Vercel，包括基础功能和新增的收藏、微信推送功能。

## 📋 部署前准备

### 1. 前置条件

- ✅ **GitHub 账号**：确保代码已推送到 GitHub
- ✅ **Vercel 账号**：访问 [vercel.com](https://vercel.com) 使用 GitHub 账号登录
- ✅ **微信公众号**（可选，仅推送功能需要）：已注册并认证的公众号

### 2. 准备环境变量

在部署前，准备好以下环境变量的值：

- 微信公众号配置（推送功能需要）
- Vercel KV 配置（通常自动配置）
- 推送安全令牌

详细说明见 [ENV_SETUP.md](./ENV_SETUP.md)

---

## 🚀 部署步骤

### 步骤 1: 推送代码到 GitHub

```bash
# 确保所有更改已提交
git add .
git commit -m "准备部署到 Vercel"
git push origin main
```

### 步骤 2: 在 Vercel 中导入项目

1. 访问 [vercel.com](https://vercel.com) 并使用 GitHub 账号登录
2. 点击 **"Add New..."** → **"Project"**
3. 在项目列表中找到 `stock-view` 仓库，点击 **"Import"**
4. 保持默认配置，直接点击 **"Deploy"**

> **注意**：首次部署可能失败，因为环境变量未配置。这是正常的，我们会在下一步配置。

### 步骤 3: 配置 Vercel KV（必需）

Vercel KV 用于存储收藏、用户身份、微信绑定等数据。

1. 在 Vercel 项目页面，进入 **Storage** 标签页
2. 点击 **"Create Database"** → 选择 **"KV"**
3. 选择 **"Create"**（使用默认配置即可）
4. Vercel 会自动配置 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN` 环境变量

> **提示**：如果 KV 已创建，可以在 **Storage** 标签页中查看连接信息。

### 步骤 4: 配置环境变量

在 Vercel 项目设置中配置环境变量：

1. 进入项目 → **Settings** → **Environment Variables**
2. 添加以下环境变量：

#### 必需的环境变量（基础功能）

| 变量名              | 说明            | 获取方式               |
| ------------------- | --------------- | ---------------------- |
| `KV_REST_API_URL`   | Vercel KV URL   | 通常自动配置（步骤 3） |
| `KV_REST_API_TOKEN` | Vercel KV Token | 通常自动配置（步骤 3） |

#### 可选的环境变量（微信推送功能）

如果不需要微信推送功能，可以跳过这些变量。

| 变量名                      | 说明                     | 获取方式                            |
| --------------------------- | ------------------------ | ----------------------------------- |
| `WECHAT_APP_ID`             | 微信公众号 AppID         | 微信公众平台 → 开发 → 基本配置      |
| `WECHAT_APP_SECRET`         | 微信公众号 AppSecret     | 微信公众平台 → 开发 → 基本配置      |
| `NEXT_PUBLIC_WECHAT_APP_ID` | 前端 OAuth2 使用的 AppID | 与 `WECHAT_APP_ID` 相同             |
| `WECHAT_TEMPLATE_ID`        | 模板消息 ID              | 微信公众平台 → 功能 → 模板消息      |
| `WECHAT_PUSH_TOKEN`         | 推送 API 安全令牌        | 随机生成（见下方）                  |
| `WECHAT_ENCRYPTION_KEY`     | 加密密钥（可选）         | 使用 `WECHAT_APP_SECRET` 或单独生成 |

**生成推送令牌**：

```bash
# 方式 1: 使用 OpenSSL
openssl rand -hex 32

# 方式 2: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. **选择环境**：为每个变量选择适用的环境

   - **Production**：生产环境
   - **Preview**：预览环境（PR 部署）
   - **Development**：开发环境

4. 点击 **"Save"** 保存

### 步骤 5: 配置 Vercel Cron Job（推送功能需要）

如果已配置微信推送功能，需要设置定时任务：

1. 进入项目 → **Settings** → **Cron Jobs**
2. 点击 **"Add Cron Job"**
3. 配置如下：
   - **Path**: `/api/wechat/push`
   - **Schedule**: `0 15 * * 1-5`（工作日 15:00，即收盘后）
   - **Headers**:
     ```json
     {
       "x-push-token": "your_WECHAT_PUSH_TOKEN_value"
     }
     ```
   - 将 `your_WECHAT_PUSH_TOKEN_value` 替换为步骤 4 中设置的 `WECHAT_PUSH_TOKEN` 值

> **注意**：`vercel.json` 中已配置 Cron Job，但需要在 Vercel Dashboard 中手动添加 Headers。

### 步骤 6: 配置微信 OAuth2 回调域名（推送功能需要）

如果已配置微信推送功能：

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入 **开发** → **接口权限** → **网页授权**
3. 点击 **"修改"**，添加你的 Vercel 域名（如：`stock-view.vercel.app`）
   - 不需要加 `http://` 或 `https://`
   - 不需要加路径，只填域名

### 步骤 7: 重新部署

配置完环境变量后，需要重新部署：

1. 在 Vercel 项目页面，进入 **Deployments** 标签页
2. 找到最新的部署，点击 **"..."** → **"Redeploy"**
3. 等待部署完成

---

## ✅ 部署验证

部署完成后，访问 Vercel 提供的 URL（如 `https://stock-view.vercel.app`），测试以下功能：

### 基础功能验证

1. **搜索股票**：

   - 输入 `000001.SZ` 或 `600519.SH` 测试查询功能
   - 确认日 K 走势图正常显示

2. **收藏功能**：

   - 在搜索结果中点击「收藏」按钮
   - 访问 `/favorites` 页面，确认收藏的 ETF 显示
   - 确认价格信息正常加载

3. **身份识别**：
   - 点击 Header 右侧「身份识别」按钮
   - 填写手机号或邮箱
   - 确认提交成功

### 微信推送功能验证（如果已配置）

1. **微信绑定**：

   - 访问 `/favorites` 页面
   - 点击「绑定微信」按钮
   - 完成微信授权
   - 确认绑定成功

2. **推送测试**（手动触发）：

   ```bash
   curl -X POST https://your-domain.vercel.app/api/wechat/push \
     -H "x-push-token: your_WECHAT_PUSH_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"date": "2025-12-12"}'
   ```

3. **Cron Job 验证**：
   - 等待下一个工作日 15:00
   - 或在 Vercel Dashboard → **Cron Jobs** 中手动触发
   - 检查推送日志

---

## 🔧 常见问题

### 1. 部署失败：环境变量未配置

**问题**：首次部署失败，提示环境变量错误。

**解决方案**：

- 按照步骤 3-4 配置 Vercel KV 和环境变量
- 重新部署项目

### 2. 收藏功能不工作

**问题**：收藏的 ETF 无法保存或同步。

**解决方案**：

- 确认 Vercel KV 已创建并配置
- 检查 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN` 环境变量
- 查看 Vercel 函数日志

### 3. 微信绑定失败

**问题**：点击「绑定微信」后授权失败。

**解决方案**：

- 确认 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET` 已配置
- 确认 `NEXT_PUBLIC_WECHAT_APP_ID` 已配置（前端需要）
- 确认 OAuth2 回调域名已配置（步骤 6）
- 检查回调 URL 格式：`https://your-domain.vercel.app/api/wechat/callback`

### 4. 推送功能不工作

**问题**：Cron Job 未触发或推送失败。

**解决方案**：

- 确认 Cron Job 已在 Vercel Dashboard 中配置（步骤 5）
- 确认 Headers 中的 `x-push-token` 与 `WECHAT_PUSH_TOKEN` 一致
- 确认 `WECHAT_TEMPLATE_ID` 已配置
- 查看 Vercel 函数日志和 Cron Job 执行日志

### 5. Python 脚本执行失败

**问题**：API 返回错误，提示 Python 脚本无法执行。

**解决方案**：

- Vercel Serverless Functions 默认支持 Python 3.9+
- 确认 `scripts/` 目录已包含在部署中
- 检查 `requirements.txt` 中的依赖是否正确
- 查看 Vercel 部署日志中的错误信息

### 6. 构建失败

**问题**：Vercel 构建过程中出现错误。

**解决方案**：

- 确认 Node.js 版本 >= 20.9.0（Vercel 会自动检测）
- 检查 `package.json` 中的依赖是否正确
- 查看构建日志定位具体错误
- 运行 `npm run build` 本地测试构建

---

## 📊 监控和日志

### Vercel Dashboard

- **Deployments**：查看部署历史和状态
- **Functions**：查看 API 路由的执行情况
- **Logs**：查看实时日志
- **Analytics**：查看访问量、性能指标

### Cron Job 监控

- 在 **Settings** → **Cron Jobs** 中查看执行历史
- 检查执行状态（成功/失败）
- 查看执行日志

### 推送日志

推送日志存储在 Vercel KV 中，key 格式：`pushlog:${userId}:${date}:${symbol}`

可以通过以下方式查看：

- Vercel Dashboard → **Storage** → **KV** → 浏览数据
- 或通过 API 查询推送记录

---

## 🔄 持续部署

配置完成后，每次您向 `main` 分支推送代码时：

- Vercel 会自动检测并重新部署
- 环境变量会自动应用到新部署
- Cron Job 配置保持不变

---

## 🔙 回滚部署

如果需要回滚到之前的版本：

1. 在 Vercel 项目页面，进入 **Deployments** 标签页
2. 找到要回滚的版本
3. 点击 **"..."** → **"Promote to Production"**

---

## 🌐 自定义域名（可选）

1. 在 Vercel 项目设置中，进入 **Domains**
2. 添加您的自定义域名
3. 按照提示配置 DNS 记录
4. 等待 DNS 生效（通常几分钟到几小时）
5. **重要**：如果使用微信推送，需要更新微信公众平台的 OAuth2 回调域名

---

## 📝 部署检查清单

使用此清单确保部署完整：

### 基础部署

- [ ] 代码已推送到 GitHub
- [ ] Vercel 项目已创建
- [ ] Vercel KV 已创建
- [ ] 基础环境变量已配置（KV 相关）

### 微信推送功能（可选）

- [ ] 微信公众号 AppID 和 AppSecret 已配置
- [ ] 模板消息 ID 已配置
- [ ] 推送安全令牌已生成并配置
- [ ] Cron Job 已配置（Path、Schedule、Headers）
- [ ] OAuth2 回调域名已配置
- [ ] 重新部署已完成

### 验证

- [ ] 基础功能测试通过（搜索、收藏）
- [ ] 身份识别功能测试通过
- [ ] 微信绑定功能测试通过（如已配置）
- [ ] 推送功能测试通过（如已配置）

---

## 🆘 获取帮助

如果遇到问题：

1. 查看 Vercel 部署日志
2. 查看 Vercel 函数日志
3. 参考 [ENV_SETUP.md](./ENV_SETUP.md) 检查环境变量配置
4. 参考 [README.md](./README.md) 查看功能说明

---

部署完成后，您的项目就可以通过公网 URL 访问了！🎉
