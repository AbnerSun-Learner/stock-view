# 部署指南

本指南将帮助您将 stock-view 项目部署到 GitHub 并通过 Vercel 提供公网访问。

## 前置条件

1. **GitHub 账号**：确保您已拥有 GitHub 账号
2. **Vercel 账号**：访问 [vercel.com](https://vercel.com) 使用 GitHub 账号登录

## 部署步骤

### 方案一：使用 Vercel 自动部署（推荐）

这是最简单快捷的部署方式，Vercel 会自动检测 Next.js 项目并完成部署。

#### 1. 推送代码到 GitHub

如果代码还未推送到 GitHub，执行以下命令：

```bash
# 确保所有更改已提交
git add .
git commit -m "准备部署到 Vercel"

# 推送到 GitHub
git push origin main
```

#### 2. 在 Vercel 中导入项目

1. 访问 [vercel.com](https://vercel.com) 并使用 GitHub 账号登录
2. 点击 **"Add New..."** → **"Project"**
3. 在项目列表中找到 `stock-view` 仓库，点击 **"Import"**
4. 保持默认配置，直接点击 **"Deploy"**

#### 3. 配置环境变量（可选）

如果您的 Python 路径不是默认的 `python3`，可以在 Vercel 项目设置中添加环境变量：

- 进入项目设置 → **Environment Variables**
- 添加 `PYTHON_BIN`，值为您的 Python 路径（如 `/usr/bin/python3`）

> **注意**：Vercel 的 Serverless Functions 默认已包含 Python 3.9+，通常无需额外配置。

#### 4. 等待部署完成

Vercel 会自动：

- 安装 Node.js 依赖
- 构建 Next.js 项目
- 部署到全球 CDN

部署完成后，您会获得一个类似 `https://stock-view.vercel.app` 的访问地址。

### 方案二：使用 GitHub Actions 自动部署

如果您希望每次推送到 GitHub 时自动触发部署，可以使用 GitHub Actions。

#### 1. 获取 Vercel Token

1. 访问 [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. 创建一个新的 Token，复制保存

#### 2. 获取 Vercel 项目信息

在 Vercel 项目设置中，找到：

- **Project ID**（在 Settings → General 中）
- **Organization ID**（在 Settings → General 中）

#### 3. 配置 GitHub Secrets

1. 在 GitHub 仓库中，进入 **Settings** → **Secrets and variables** → **Actions**
2. 添加以下 Secrets：
   - `VERCEL_TOKEN`：步骤 1 中创建的 Token
   - `VERCEL_ORG_ID`：步骤 2 中的 Organization ID
   - `VERCEL_PROJECT_ID`：步骤 2 中的 Project ID

#### 4. 推送代码

项目已包含 `.github/workflows/deploy.yml` 工作流文件，推送代码后会自动触发部署：

```bash
git add .
git commit -m "配置 GitHub Actions 自动部署"
git push origin main
```

#### 5. 查看部署状态

在 GitHub 仓库的 **Actions** 标签页中，可以查看部署进度和日志。

## 验证部署

部署完成后，访问 Vercel 提供的 URL，测试以下功能：

1. **搜索股票**：输入 `000001.SZ` 或 `600519.SH` 测试查询功能
2. **查看图表**：确认日 K 走势图正常显示
3. **收藏功能**：测试收藏和取消收藏功能
4. **历史记录**：确认历史记录功能正常

## 常见问题

### 1. Python 脚本执行失败

**问题**：API 返回错误，提示 Python 脚本无法执行。

**解决方案**：

- 确认 Vercel 项目设置中已包含 `scripts/` 目录
- 检查 `requirements.txt` 中的依赖是否正确
- 查看 Vercel 部署日志中的错误信息

### 2. 构建失败

**问题**：Vercel 构建过程中出现错误。

**解决方案**：

- 确认 Node.js 版本 >= 20.9.0
- 检查 `package.json` 中的依赖是否正确
- 查看构建日志定位具体错误

### 3. API 路由返回 500 错误

**问题**：前端可以访问，但查询股票时返回 500 错误。

**解决方案**：

- 检查 Vercel 函数日志
- 确认 Python 脚本路径正确
- 验证网络请求是否正常（脚本需要访问外部 API）

## 自定义域名（可选）

1. 在 Vercel 项目设置中，进入 **Domains**
2. 添加您的自定义域名
3. 按照提示配置 DNS 记录
4. 等待 DNS 生效（通常几分钟到几小时）

## 持续部署

配置完成后，每次您向 `main` 分支推送代码时：

- **方案一**：Vercel 会自动检测并重新部署
- **方案二**：GitHub Actions 会自动触发部署流程

## 回滚部署

如果需要回滚到之前的版本：

1. 在 Vercel 项目页面，进入 **Deployments**
2. 找到要回滚的版本
3. 点击 **"..."** → **"Promote to Production"**

## 监控和日志

- **Vercel 仪表板**：查看访问量、错误率等指标
- **函数日志**：在 Vercel 项目 → **Functions** → 选择函数 → **Logs**
- **GitHub Actions**：查看自动部署的执行日志

---

部署完成后，您的项目就可以通过公网 URL 访问了！🎉
