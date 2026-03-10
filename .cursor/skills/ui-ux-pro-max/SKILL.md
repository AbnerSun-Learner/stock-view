# ui-ux-pro-max

面向 Web 与移动应用的综合设计指南。包含 67 种风格、96 套配色方案、57 种字体搭配、99 条 UX 指南，以及覆盖 13 种技术栈的 25 种图表类型。提供可搜索数据库，并带有基于优先级的推荐。

## 前置条件

检查是否已安装 Python：

```bash
python3 --version || python --version
```

如果未安装 Python，请根据用户的操作系统安装：

**macOS：**
```bash
brew install python3
```

**Ubuntu/Debian：**
```bash
sudo apt update && sudo apt install python3
```

**Windows：**
```powershell
winget install Python.Python.3.12
```

---

## 如何使用此 Skill

当用户提出 UI/UX 相关工作需求（设计、搭建、创建、实现、评审、修复、改进）时，遵循以下流程：

### 第 1 步：分析用户需求

从用户请求中提取关键信息：
- **产品类型**：SaaS、电商、作品集、仪表盘、落地页等
- **风格关键词**：极简、活泼、专业、优雅、深色模式等
- **行业**：医疗、金融科技、游戏、教育等
- **技术栈**：React、Vue、Next.js；若未指定则默认 `html-tailwind`

### 第 2 步：生成设计系统（必做）

**务必从 `--design-system` 开始**，以获取带推理说明的完整推荐：

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

该命令会：
1. 并行搜索 5 个领域（product、style、color、landing、typography）
2. 应用 `ui-reasoning.csv` 中的推理规则来选择最佳匹配
3. 输出完整设计系统：模式（pattern）、风格（style）、颜色（colors）、字体（typography）、效果（effects）
4. 包含需要避免的反模式（anti-patterns）

**示例：**
```bash
python3 skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness service" --design-system -p "Serenity Spa"
```

### 第 2b 步：持久化设计系统（Master + Overrides 模式）

为了在多个会话中进行分层检索并复用设计系统，添加 `--persist`：

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name"
```

这会创建：
- `design-system/MASTER.md` — 全局事实来源（Global Source of Truth），包含所有设计规则
- `design-system/pages/` — 存放页面级覆盖规则的文件夹

**带页面级覆盖：**
```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name" --page "dashboard"
```

这还会创建：
- `design-system/pages/dashboard.md` — 仪表盘页面相对 Master 的差异化规则

**分层检索的工作方式：**
1. 构建某个具体页面（例如 “Checkout”）时，先检查 `design-system/pages/checkout.md`
2. 如果页面文件存在，其规则会 **覆盖** Master 文件
3. 如果不存在，则只使用 `design-system/MASTER.md`

### 第 3 步：按需补充更细粒度搜索

拿到设计系统后，可使用领域搜索补齐细节：

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
```

**何时使用细粒度搜索：**

| 需求 | Domain | 示例 |
|------|--------|------|
| 更多风格选项 | `style` | `--domain style "glassmorphism dark"` |
| 图表推荐 | `chart` | `--domain chart "real-time dashboard"` |
| UX 最佳实践 | `ux` | `--domain ux "animation accessibility"` |
| 替代字体方案 | `typography` | `--domain typography "elegant luxury"` |
| 落地页结构 | `landing` | `--domain landing "hero social-proof"` |

### 第 4 步：技术栈指南（默认：html-tailwind）

获取与实现相关的最佳实践。如果用户未指定技术栈，**默认使用 `html-tailwind`**。

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack html-tailwind
```

可用技术栈：`html-tailwind`、`react`、`nextjs`、`vue`、`svelte`、`swiftui`、`react-native`、`flutter`、`shadcn`、`jetpack-compose`

---

## 搜索参考

### 可用领域（Domains）

| Domain | 用途 | 示例关键词 |
|--------|------|------------|
| `product` | 产品类型推荐 | SaaS、e-commerce、portfolio、healthcare、beauty、service |
| `style` | UI 风格、颜色、效果 | glassmorphism、minimalism、dark mode、brutalism |
| `typography` | 字体搭配、Google Fonts | elegant、playful、professional、modern |
| `color` | 按产品类型给出配色方案 | saas、ecommerce、healthcare、beauty、fintech、service |
| `landing` | 页面结构、CTA 策略 | hero、hero-centric、testimonial、pricing、social-proof |
| `chart` | 图表类型与库推荐 | trend、comparison、timeline、funnel、pie |
| `ux` | 最佳实践与反模式 | animation、accessibility、z-index、loading |
| `react` | React/Next.js 性能优化 | waterfall、bundle、suspense、memo、rerender、cache |
| `web` | Web 界面规范 | aria、focus、keyboard、semantic、virtualize |
| `prompt` | AI 提示词、CSS 关键词 | (style name) |

### 可用技术栈（Stacks）

| Stack | 重点 |
|-------|------|
| `html-tailwind` | Tailwind 工具类、响应式、可访问性（默认） |
| `react` | 状态、hooks、性能、模式 |
| `nextjs` | SSR、路由、图片、API routes |
| `vue` | Composition API、Pinia、Vue Router |
| `svelte` | Runes、stores、SvelteKit |
| `swiftui` | Views、State、Navigation、Animation |
| `react-native` | Components、Navigation、Lists |
| `flutter` | Widgets、State、Layout、Theming |
| `shadcn` | shadcn/ui 组件、主题、表单、模式 |
| `jetpack-compose` | Composables、Modifiers、State Hoisting、Recomposition |

---

## 示例工作流

**用户请求：**“Làm landing page cho dịch vụ chăm sóc da chuyên nghiệp”（为专业护肤服务制作落地页）

### 第 1 步：分析需求
- 产品类型：美容/SPA 服务
- 风格关键词：优雅、专业、柔和
- 行业：美容/健康
- 技术栈：html-tailwind（默认）

### 第 2 步：生成设计系统（必做）

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness service elegant" --design-system -p "Serenity Spa"
```

**输出：**包含模式、风格、配色、字体、效果和反模式的完整设计系统。

### 第 3 步：按需补充更细粒度搜索

```bash
# 获取动画与可访问性的 UX 指南
python3 skills/ui-ux-pro-max/scripts/search.py "animation accessibility" --domain ux

# 如需替代字体方案，可获取排版建议
python3 skills/ui-ux-pro-max/scripts/search.py "elegant luxury serif" --domain typography
```

### 第 4 步：技术栈指南

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "layout responsive form" --stack html-tailwind
```

**然后：**综合设计系统与上述细粒度搜索结果来实现最终界面。

---

## 输出格式

`--design-system` 参数支持两种输出格式：

```bash
# ASCII 框（默认）- 适合终端展示
python3 skills/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system

# Markdown - 适合文档编写
python3 skills/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system -f markdown
```

---

## 提升结果质量的小技巧

1. **关键词尽量具体** —— “healthcare SaaS dashboard” 比 “app” 好得多
2. **多次搜索** —— 不同关键词会暴露不同洞察点
3. **组合领域** —— Style + Typography + Color = 完整设计系统
4. **务必检查 UX** —— 搜索 “animation”“z-index”“accessibility” 以避免常见问题
5. **使用 stack 参数** —— 获取与技术栈相关的实现最佳实践
6. **持续迭代** —— 第一次结果不理想时，调整关键词再试一次

---

## 专业 UI 的常见规则

以下是经常被忽视、但会直接拉低界面专业感的问题：

### 图标与视觉元素

| 规则 | 要做（Do） | 不要做（Don't） |
|------|------------|-----------------|
| **不要用 emoji 当图标** | 使用 SVG 图标（Heroicons、Lucide、Simple Icons） | 使用 🎨 🚀 ⚙️ 之类 emoji 作为 UI 图标 |
| **稳定的 hover 状态** | hover 使用颜色/透明度过渡 | 使用会引发布局位移的 scale 变换 |
| **正确的品牌 logo** | 从 Simple Icons 查官方 SVG | 瞎猜或使用错误的 logo 路径 |
| **一致的图标尺寸** | 使用固定 viewBox（24x24）并搭配 w-6 h-6 | 随机混用不同尺寸的图标 |

### 交互与鼠标指针

| 规则 | 要做（Do） | 不要做（Don't） |
|------|------------|-----------------|
| **使用 pointer 光标** | 所有可点击/可 hover 卡片添加 `cursor-pointer` | 交互元素仍然使用默认光标 |
| **清晰的 hover 反馈** | 使用颜色、阴影或边框反馈 | 看不出元素是可交互的 |
| **平滑过渡** | 使用 `transition-colors duration-200` | 状态瞬时切换或动画过慢（>500ms） |

### 明/暗模式对比度

| 规则 | 要做（Do） | 不要做（Don't） |
|------|------------|-----------------|
| **浅色模式玻璃卡片** | 使用 `bg-white/80` 或更高不透明度 | 使用 `bg-white/10`（过于透明） |
| **浅色文本对比度** | 正文使用 `#0F172A`（slate-900） | 正文使用 `#94A3B8`（slate-400） |
| **浅色弱化文本** | 至少使用 `#475569`（slate-600） | 使用 gray-400 或更浅 |
| **边框可见性** | 浅色模式使用 `border-gray-200` | 使用 `border-white/10`（几乎看不见） |

### 布局与间距

| 规则 | 要做（Do） | 不要做（Don't） |
|------|------------|-----------------|
| **悬浮导航栏** | 使用 `top-4 left-4 right-4` 留出边距 | 导航栏紧贴 `top-0 left-0 right-0` |
| **内容内边距** | 计算并预留固定导航栏高度 | 让内容被固定元素遮挡 |
| **统一最大宽度** | 全站统一使用 `max-w-6xl` 或 `max-w-7xl` | 在不同区域混用不同容器宽度 |

---

## 交付前检查清单

在交付任何 UI 代码前，请逐项确认：

### 视觉质量
- [ ] 未使用 emoji 作为图标（全部改用 SVG）
- [ ] 所有图标来自同一套图标库（Heroicons/Lucide）
- [ ] 品牌 logo 已通过 Simple Icons 验证为官方版本
- [ ] hover 不会导致布局抖动或跳动
- [ ] 直接使用主题色（如 bg-primary），而不是再包一层 var()

### 交互
- [ ] 所有可点击元素均设置 `cursor-pointer`
- [ ] hover 时提供明显的视觉反馈
- [ ] 动画过渡时长在 150–300ms，观感平滑自然
- [ ] 键盘导航时 focus 状态明显可见

### 明/暗模式
- [ ] 浅色模式文本对比度满足至少 4.5:1
- [ ] 玻璃/半透明元素在浅色模式下清晰可见
- [ ] 浅色与深色模式下的边框均清晰可见
- [ ] 在两种模式下都完成了人工验证

### 布局
- [ ] 所有悬浮元素与屏幕边缘的间距合理
- [ ] 不存在内容被固定导航栏遮挡的情况
- [ ] 在 375px、768px、1024px、1440px 宽度下都能正常响应式布局
- [ ] 移动端不存在横向滚动条

### 可访问性
- [ ] 所有图片均设置了合适的 alt 文本
- [ ] 所有表单输入均有对应的 label
- [ ] 重要信息不是仅通过颜色来区分
- [ ] 考虑并尊重 `prefers-reduced-motion` 偏好
