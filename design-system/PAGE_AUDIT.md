# 全站页面设计审视与可优化点

> 对照 [UI_TEMPLATE.md](./UI_TEMPLATE.md)（以网格交易页为基准）对当前各页面的差异与可优化项做清单，便于后续迭代时统一风格。

---

## 1. 网格交易页 `app/grid/page.tsx`（基准页）

| 项目 | 状态 | 说明 |
|------|------|------|
| 页面骨架 | ✅ | `min-h-screen`、`--page-bg`/`--foreground`、双模糊背景、`pt-20`、`max-w-7xl` |
| 导航 | ✅ | GridNavbar 符合模板：玻璃态、Logo、.grid 后缀、右侧「关于我们」 |
| 标题区 | ✅ | 使用 PageHeader，大标题 + 描述 |
| 卡片 | ✅ | `rounded-2xl`、`shadow-2xl shadow-blue-900/10`、分区色块 + 渐变分隔线 |
| 主按钮 | ✅ | 胶囊形、`--brand`、hover 上浮、focus ring |
| 空状态 | ✅ | 虚线边框、居中、双行文案 |
| 表格/StatsCards | ✅ | 与模板一致 |

**可优化（低优先级）**
- 移除页面内 `<style dangerouslySetInnerHTML` 的 Lora 注入，改为依赖 layout 的 `--font-brand-serif`，避免重复与 FOUC。
- 区块副标题「共 N 个网格档位」可改为 `text-[var(--muted-foreground)]` 替代 `opacity-70`，便于深色模式一致。

---

## 2. 落地页 `app/page.tsx`

| 项目 | 状态 | 说明 / 建议 |
|------|------|-------------|
| 页面骨架 | ✅ | 使用变量、单模糊背景，与模板略不同但可接受（落地页可更简） |
| 导航 | ⚠️ | 与模板不一致：Logo `w-7 h-7`、无 pulse、`py-3.5`、无 `.xxx` 后缀；右侧为占位 div 非链接。若需与网格/估值统一，可改为 `px-8 py-4`、Logo `w-8 h-8`、右侧加主题切换（落地页目前无深色入口） |
| 主标题区 | ⚠️ | 使用副标题 + 大标题 + 一段描述，未用 PageHeader 组件。若希望与网格「标题区」一致，可改用 PageHeader 或保持当前更偏 Landing 的层次。 |
| 背景 | ✅ | 单圆形模糊、较克制 |
| CTA 按钮 | ⚠️ | `rounded-lg`、无 hover 上浮，与模板的 `rounded-full` + `hover:-translate-y-1` 不同。可按需统一为模板风格或保留当前简洁风格。 |
| 页脚 | ✅ | 使用 muted 色、tracking |

**建议**
- 若希望全站「有导航的页面」体验一致：落地页导航增加主题切换、与 GridNavbar/ValuationNavbar 的 padding/Logo 尺寸对齐。
- 若落地页单独作为营销入口：可保持当前更简风格，在模板中补充「落地页变体」说明即可。

---

## 3. 指数估值列表页 `app/valuation/page.tsx`

| 项目 | 状态 | 说明 / 建议 |
|------|------|-------------|
| 页面骨架 | ✅ | 变量、单模糊、`pt-[4.5rem]`、`max-w-7xl` |
| 导航 | ✅ | ValuationNavbar，仅主题切换，符合「只保留主题」要求 |
| 标题区 | ⚠️ | 未用 PageHeader：自拟 `h1 text-2xl md:text-3xl` + 一段说明。与模板的「大标题 + 描述」不同。可选：改用 PageHeader 使与网格页标题区一致，或保留当前更紧凑的列表页风格并在模板中注明「列表页可缩小标题」。 |
| 卡片 | ⚠️ | `rounded-xl`、无 `backdrop-blur`、无 `shadow-2xl shadow-blue-900/10`。与模板的 `rounded-2xl` + 强阴影不一致。可选：改为 `rounded-2xl` + `shadow-2xl shadow-blue-900/10` 以贴近网格。 |
| 表格工具栏 | ✅ | 左侧「估值列表」标签 + 右侧搜索，布局清晰 |
| 表格 | ✅ | 使用 token、overflow-x-auto |

**建议**
- 若强调与网格页一致：标题区改用 PageHeader 或至少 `text-4xl md:text-5xl font-serif` 主标题；卡片升级为 `rounded-2xl` + 模板阴影。
- 若保持「列表页更紧凑」：在 UI_TEMPLATE 中增加「列表页/数据页」子规范，允许 `rounded-xl` 与较小标题。

---

## 4. 指数估值详情页 `app/valuation/[symbol]/page.tsx`

| 项目 | 状态 | 说明 / 建议 |
|------|------|-------------|
| 页面骨架 | ✅ | 变量、单模糊、`pt-[4.5rem]`、`max-w-7xl` |
| 导航 | ✅ | ValuationNavbar |
| 页头 | ⚠️ | 使用「← 指数估值」链接 + 标题 + 更新日期，非 PageHeader。与模板的居中大标题不同，但详情页通常需要面包屑/返回，可接受。可选：主标题改为 `font-serif` 与网格区块标题统一。 |
| 加载/错误 | ✅ | Spinner 与错误样式使用变量 |
| 卡片 | ⚠️ | `rounded-xl`、无 `shadow-2xl shadow-blue-900/10`。与模板主卡片不一致。 |
| 区块标题 | ✅ | `uppercase tracking-wider`、小号字，清晰 |
| 持仓表 | ✅ | 表头/单元格用 token、hover、分割线 |

**建议**
- 主内容卡片（图表、PE 分布、持仓）可统一为 `rounded-2xl` + `shadow-2xl shadow-blue-900/10`，与网格右侧内容区一致。
- 详情页标题保留当前结构，仅将 `h1` 增加 `font-serif` 即可与模板「区块标题」风格衔接。

---

## 5. 导航栏组件对比

| 项目 | GridNavbar | ValuationNavbar | 落地页 nav |
|------|------------|-----------------|------------|
| 容器 padding | `px-8 py-4` | `px-4 py-4` | `px-6 md:px-8 py-3.5` |
| Logo 尺寸 | `w-8 h-8` | `w-8 h-8` | `w-7 h-7` |
| 品牌名字号 | `text-2xl font-serif font-bold` | `text-2xl font-serif font-bold` | `text-xl font-serif font-semibold` |
| 右侧 | 「关于我们」链接 | 仅主题切换 | 占位 |
| 子产品后缀 | `.grid` | `.valuation` | 无 |

**建议**
- 统一导航 padding 为 `px-6 md:px-8 py-4`（或全站 `px-8 py-4`）。
- 落地页若需与其余页统一：Logo `w-8 h-8`、品牌 `text-2xl font-bold`；可选增加主题切换。

---

## 6. 通用组件与 Token

| 项目 | 状态 | 说明 |
|------|------|------|
| PageHeader | ✅ | 仅网格页使用；估值列表/详情未用，可按上表决定是否推广 |
| 错误提示 | ✅ | ErrorAlert 风格统一；估值详情自写错误块，可考虑抽成共用组件 |
| 空状态 | 估值列表 | Table 的 emptyText 为文案，无插图。若需与网格空状态一致，可增加插图+双行文案的占位区块 |
| CSS 变量 | ✅ | 全站已用 `--page-bg`、`--foreground`、`--brand` 等，无硬编码色值 |

---

## 7. 优化项汇总（按优先级）

**P1（与模板强一致）**
1. **网格页**：删除页面内 Lora 的 `dangerouslySetInnerHTML` 注入，统一用 layout 的 `--font-brand-serif`。
2. **估值列表/详情**：主卡片统一为 `rounded-2xl` + `shadow-2xl shadow-blue-900/10`（与网格右侧内容区一致）。

**P2（体验与一致性）**
3. **估值列表**：标题区改用 PageHeader，或保持紧凑但在 UI_TEMPLATE 中写明「列表页标题可缩小」。
4. **估值详情**：主标题增加 `font-serif`。
5. **导航**：三处导航的 padding、Logo 尺寸、品牌字重统一（见上表）。

**P3（可选）**
6. 落地页导航增加主题切换，并统一 Logo/品牌字号。
7. 落地页 CTA 是否改为 `rounded-full` + hover 上浮，与网格主按钮一致。
8. 估值列表空状态（无数据时）是否增加插图+双行说明，与网格空状态一致。

---

使用方式：新页面或改版时先查 [UI_TEMPLATE.md](./UI_TEMPLATE.md)，再按本审计表补齐与网格页的差异项。
