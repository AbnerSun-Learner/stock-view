# 环境变量配置指南

本项目支持多种方式配置环境变量，**无需在项目代码中存储敏感信息**。

## 方式一：Vercel Dashboard（推荐，生产环境）

如果项目部署在 Vercel，可以在 Vercel Dashboard 中配置环境变量：

### 步骤：

1. **登录 Vercel Dashboard**
   - 访问 https://vercel.com
   - 登录你的账号

2. **进入项目设置**
   - 选择你的项目
   - 点击 **Settings** → **Environment Variables**

3. **添加环境变量**
   - 点击 **Add New**
   - 添加以下变量：

   ```
   NEXT_PUBLIC_SUPABASE_URL=你的_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_anon_key
   SUPABASE_SERVICE_ROLE_KEY=你的_service_role_key
   ```

4. **选择环境**
   - **Production**：生产环境
   - **Preview**：预览环境（PR 等）
   - **Development**：开发环境

5. **重新部署**
   - 配置完成后，Vercel 会自动触发重新部署
   - 或手动点击 **Deployments** → **Redeploy**

### 优点：
- ✅ 安全：敏感信息不会进入代码仓库
- ✅ 方便：可以在 Dashboard 中随时修改
- ✅ 自动：部署时自动注入环境变量

---

## 方式二：系统环境变量（本地开发）

### macOS/Linux：

在 `~/.zshrc` 或 `~/.bashrc` 文件中添加：

```bash
export NEXT_PUBLIC_SUPABASE_URL="你的_supabase_url"
export NEXT_PUBLIC_SUUPABASE_ANON_KEY="你的_anon_key"
export SUPABASE_SERVICE_ROLE_KEY="你的_service_role_key"
```

然后执行：
```bash
source ~/.zshrc  # 或 source ~/.bashrc
```

### Windows：

1. 打开 **系统属性** → **高级** → **环境变量**
2. 在 **用户变量** 中添加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. 重启终端或 IDE

### 验证：

```bash
echo $NEXT_PUBLIC_SUPABASE_URL  # macOS/Linux
echo %NEXT_PUBLIC_SUPABASE_URL% # Windows
```

---

## 方式三：使用 .env.local（本地开发，可选）

如果不想使用系统环境变量，可以在项目根目录创建 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=你的_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_anon_key
SUPABASE_SERVICE_ROLE_KEY=你的_service_role_key
```

**注意**：`.env.local` 已在 `.gitignore` 中，不会被提交到代码仓库。

---

## 方式四：CI/CD 配置（GitHub Actions 等）

如果使用 GitHub Actions 或其他 CI/CD，可以在 Secrets 中配置：

### GitHub Actions：

1. 进入仓库 → **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret**
3. 添加环境变量
4. 在 `.github/workflows/*.yml` 中使用：

```yaml
env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

---

## 获取 Supabase 密钥

1. 登录 Supabase Dashboard：https://supabase.com
2. 选择你的项目
3. 进入 **Settings** → **API**
4. 找到以下信息：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`（⚠️ 敏感，不要暴露给客户端）

---

## 环境变量说明

| 变量名 | 说明 | 必需 | 客户端可见 |
|--------|------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | ✅ | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | ✅ | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色密钥（用于密码重置） | ✅ | ❌ |

---

## 验证配置

配置完成后，重启开发服务器：

```bash
npm run dev
```

如果配置正确，应用应该能正常使用 Supabase 功能。

如果配置缺失，应用会显示相应的警告信息，但不会崩溃。

---

## 安全提示

⚠️ **重要**：
- `SUPABASE_SERVICE_ROLE_KEY` 是敏感密钥，**永远不要**提交到代码仓库
- 不要在前端代码中使用 `SUPABASE_SERVICE_ROLE_KEY`
- 只在服务端 API 路由中使用 `SUPABASE_SERVICE_ROLE_KEY`
- 定期轮换密钥

