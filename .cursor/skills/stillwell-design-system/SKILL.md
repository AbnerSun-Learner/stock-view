---
name: stillwell-design-system
description: Defines Stillwell stock-view site-wide visual language (Minimalist Modern, Electric Blue + Slate tokens, typography, layout, components, correlation/marketing patterns, and UI constraints). Use when implementing or refactoring any page, globals.css, Tailwind classes, Ant Design surfaces, charts, or when the user mentions 设计规范、视觉、字体、品牌色、卡片、落地页、指数对比.
disable-model-invocation: false
---

# Stillwell 全站设计规范

单一事实来源：`src/app/globals.css`（`:root` 令牌与本文件中的工具类）。本站**仅浅色主题**，不设用户可切换的暗黑模式。新界面优先用 **CSS 变量** 与已有 **`ds-*` / `correlation-*` / `marketing-*`** 类，避免硬编码孤立的 hex。

## 1. 设计取向

- **风格**：Minimalist Modern；背景以 **Slate 灰阶**托底，强调色为 **Electric Blue**（主色 `#0052FF`，向 **`#4D7CFF`** 过渡）。
- **质感**：卡片用 **统一描边** `border` + **阶梯阴影** `--ds-shadow-sm`～`--ds-shadow-xl`；层次靠背景层级与阴影，**不靠**模块左侧粗色条（见第 9 节）。
- **主操作**：渐变 `var(--primary)` → `var(--accent-electric-end)`，投影 `--shadow-accent` / `--shadow-accent-lg`。

## 2. 色彩与令牌

- **语义色**：`--accent`（品牌强调）、`--accent-secondary`、`--primary`、`--brand-text`（副标题/强调文案蓝）、`--muted-foreground`、`--border`、`--card`、`--surface-subtle`。
- **状态与金融语义**：`--profit` / `--loss` / `--neutral`、`--accent-warm`（橙，散点/次要高亮）、`--warning`。
- **指数对比域**：`--correlation-*`（页背景 tint、卡片表面、矩阵填色基 `--correlation-fill-rgb`、图表线/散点/拟合线等）；图表与矩阵须读这些变量，与全站浅色令牌一致。

## 3. 字体层次

| 用途                           | 规则                                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| 正文 / UI                      | Inter + Noto Sans SC 栈（见 `body` 与 `@theme` `--font-sans`）；正文 **15px**，行高 **1.8**。                                         |
| 展示标题 **h1 / h2**           | Calistoga + Noto CJK 回退（`--font-display` / `h1,h2` 规则）。                                                                        |
| **h3–h6**                      | Inter 体系。                                                                                                                          |
| 顶栏品牌名 **Stillwell**       | 类 **`nav-brand-en`**：Lobster（`--font-lobster`），字色 **`var(--accent)`**，与 `.ds-section-label__text`、`.ds-card-eyebrow` 一致。 |
| 页内英文标签 / 眉题 / 表格英文 | **`font-en-arial`** 或 **`--font-english`**（Arial 栈 + Noto CJK），与 Lobster 品牌字分工。                                           |
| 等宽数据                       | `--font-mono`（JetBrains / Geist Mono）。                                                                                             |

营销页大标题可选用 **`.font-display`** 或与落地页一致的 **`landing-hero-title`** 混排策略（见 `globals.css`）。

## 4. 版式与断点

- 主内容区常用 **`max-w-6xl`** + **`mx-auto`** + 水平 **`px-6 lg:px-10`**（与顶栏对齐）。
- **顶栏**：`fixed top-0 z-50`、`h-[72px]`、同宽 content 容器；底边 `border-[var(--border)]`；背景 **`color-mix(in_srgb, var(--nav-bg) 94%, transparent)`** + **`backdrop-blur-md`**。主导航品牌旁**不**加页面后缀（如 `.grid` / `.indices` / `.comparison`）。
- 区块间距遵循现有落地页 / 业务页的 **`pt` / `pb` / `gap`** 节奏，避免同一站内出现多种互不关联的 section padding。

## 5. 可复用片段（优先复用类名）

- **章节标签**：`.ds-section-label` + `.ds-section-label__text`；**反色块/深蓝底**上的标签用 `.ds-section-label--on-dark`（指静态深色区，非全局主题）。
- **卡片顶英文眉题**：`.ds-card-eyebrow`（Arial、uppercase、**`color: var(--accent)`**）。
- **Hero 氛围光**：`.ds-hero-glow`（径向渐变，低侵入）。
- **主按钮**：`.marketing-primary-btn` + `.marketing-primary-btn__icon`（箭头跟 `group-hover`）。
- **反色区 outline 次按钮**（如深蓝 CTA 条上）：`.ds-btn-outline-on-dark`。
- **标题内渐变词**：`.marketing-gradient-text` + `.gradient-underline`（按现有结构使用）。
- **指数对比页容器**：`.correlation-page`、`.correlation-card` / `--tint`、`.correlation-eyebrow`、矩阵与 Ant 覆盖类 **`.correlation-*`**（输入、表格、Segmented、Tooltip 等）。

## 6. 品牌与壳层

- **`StillwellMark`**：浅色顶栏与默认页面使用默认 **`variant="color"`**（反色底上的实例若需可读性再单独设 `inverse`，与全站浅色主路径无关）。
- 全站**不提供**主题切换器。

## 7. 动效

- 尊重 **`prefers-reduced-motion: reduce`**（`globals.css` 已降级动画/过渡）。
- 入场与 hover：延续 **framer-motion** 与现有 **card lift / shadow** 模式；**勿**为动效新增与极简冲突的强烈弹跳。

## 8. 业务页一致性

- **网格 / 指数列表 / 指数对比** 等工具页：背景用 **`var(--background)` / `var(--page-bg)`**，卡片用 **`var(--card)`** 与 **`--border`**，Ant 组件通过 **`correlation-*`** 或页面级 class 覆盖，避免「纯白腰带」与主页面脱节。
- **图表**：曲线/散点/参考线颜色优先取自 **`--correlation-chart-*`** 或估值相关 `--valuation-chart-*`。

## 9. 禁止与自检（全站）

- **禁止**：在 Tooltip、Popover、下拉、图表浮层等任何模块使用 **左侧粗品牌色竖条**（`border-left: 3px solid var(--correlation-brand)` 或等价 `::before`）。强调用 **整块背景、浅描边、阴影、eyebrow/标题**（与仓库 `.cursor/rules/no-left-brand-stripe.mdc` 一致）。
- 改动浮层样式时自检：不出现新的 **`border-left` 品牌条**。

## 10. 实现索引

| 区域             | 主要路径                                                          |
| ---------------- | ----------------------------------------------------------------- |
| 令牌与全局类     | `src/app/globals.css`                                             |
| 字体加载         | `src/app/layout.tsx`（Inter / Calistoga / Noto / Lobster / Mono） |
| 落地页结构与区块 | `src/components/marketing/landing-page.tsx`                       |
| 顶栏             | `*-navbar.tsx`、`landing-page.tsx` header                         |

新增页面或组件时：先查 **`globals.css`** 是否已有类或变量；**再**考虑 Tailwind 任意值，且任意值应优先引用 **`var(--*)`**。
