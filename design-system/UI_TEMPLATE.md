# Stillwell UI 设计模板（以网格交易页为基准）

> 本模板以**网格交易页面**的设计语言为基准，后续新页面或页面优化时请优先参照此规范，保证全站视觉与交互一致。

---

## 1. 页面骨架

### 1.1 根容器
```tsx
<div className="min-h-screen transition-colors duration-500 bg-[var(--page-bg)] text-[var(--foreground)]">
```
- 全站使用 `--page-bg` / `--foreground`，不写死色值。

### 1.2 背景装饰（可选）
```tsx
<div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-[140px]" />
  <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-slate-200/30 dark:bg-slate-800/20 rounded-full blur-[100px]" />
</div>
```
- 双圆形模糊，中心 + 右上，浅色/深色用不同透明度。

### 1.3 主内容区
- **顶部留白**：固定导航时使用 `pt-20`（约 5rem）避免被遮挡。
- **宽度与内边距**：`max-w-7xl mx-auto px-4`（或 `px-4 md:px-6`），`py-8`。
- **区块间距**：主区块之间 `space-y-8` 或 `gap-6`。

---

## 2. 导航栏

### 2.1 容器
```tsx
<nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--card-bg-elevated)] backdrop-blur-md border-b border-[color:var(--border-color)]">
  <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto relative">
```
- 玻璃态：`bg-[var(--card-bg-elevated)]` + `backdrop-blur-md`。
- 边框：`border-[color:var(--border-color)]`。

### 2.2 Logo 区
- Logo 圆形：`w-8 h-8 bg-[var(--brand)] rounded-full`，内点可用 `animate-pulse`。
- 品牌名：`text-2xl font-serif font-bold tracking-tight text-[var(--brand-text)]`。
- 子产品后缀：`text-[var(--muted-foreground)]`（如 `.grid`）。

### 2.3 右侧链接/按钮
- 文本链接：`text-sm font-medium uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors`。
- 可点击元素需带：`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)] rounded-md`。

---

## 3. 页面标题区（PageHeader）

```tsx
<div className="text-center mb-8">
  <h1 className="text-4xl md:text-5xl font-serif font-medium leading-tight mb-3 tracking-tight">
    {title}
  </h1>
  <p className="text-lg text-[var(--muted-foreground)] leading-relaxed font-light max-w-2xl mx-auto">
    {description}
  </p>
</div>
```
- 标题：大号、serif、居中。
- 描述：`text-[var(--muted-foreground)]`，最大宽度约束。

---

## 4. 卡片与区块

### 4.1 主卡片（侧边栏/内容区）
```tsx
className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--card-bg-elevated)] backdrop-blur-md shadow-2xl shadow-blue-900/10 overflow-hidden"
```
- 圆角 `rounded-2xl`，边框与背景用 CSS 变量，阴影 `shadow-2xl shadow-blue-900/10`。

### 4.2 卡片内分区（按功能分组）
- 不同区块用浅色背景区分：`bg-blue-50/50 dark:bg-blue-900/10`、`bg-purple-50/50 dark:bg-purple-900/10`、`bg-indigo-50/50 dark:bg-indigo-900/10`、`bg-slate-50/50 dark:bg-slate-900/20` 等。
- 区块间分隔线：`h-px bg-gradient-to-r from-transparent via-blue-100/50 dark:via-white/5 to-transparent`。

### 4.3 区块内标题
- 区块标题：`text-lg font-bold` 或 `text-2xl font-serif font-medium text-[var(--foreground)] mb-2`。
- 副标题/说明：`text-sm opacity-70 font-light` 或 `text-sm text-[var(--muted-foreground)]`。

---

## 5. 主操作按钮（CTA）

```tsx
className="w-full px-6 py-4 rounded-full bg-[var(--brand)] text-white font-bold text-lg shadow-xl shadow-blue-900/10 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)]"
```
- 主色 `--brand`，圆角胶囊 `rounded-full`，悬停上浮 `hover:-translate-y-1`，禁用态要处理。

---

## 6. 统计/指标卡片（StatsCards）

- 布局：`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6`。
- 单卡：`p-5 rounded-2xl border shadow-lg hover:shadow-xl transition-all duration-300`，按指标类型使用不同色系（如 blue / purple / indigo / emerald / amber）。
- 标签：`text-[10px] font-bold uppercase tracking-widest opacity-70`，颜色与卡片色系一致（如 `text-blue-700 dark:text-blue-300`）。
- 数值：`text-2xl font-bold text-[var(--foreground)]`。
- 涨跌/正负：盈利 `text-emerald-600 dark:text-emerald-400`，亏损 `text-red-600 dark:text-red-400`，中性 `text-[var(--foreground)]`。

---

## 7. 表格

### 7.1 表格容器
```tsx
<div className="overflow-x-auto rounded-xl border border-[color:var(--border-color)]">
  <table className="w-full border-collapse">
```
- 外层 `overflow-x-auto`，圆角 `rounded-xl`，边框用变量。

### 7.2 表头
- 行：`border-b border-[color:var(--border-color)] bg-blue-50/30 dark:bg-blue-900/10`。
- 单元格：`p-4 text-left text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]`。

### 7.3 表体
- 行：`border-b border-[color:var(--border-color)] hover:bg-[var(--hover-bg)] transition-colors duration-200`。
- 单元格：`p-4 text-[var(--foreground)]`，数字可用 `font-mono`。

---

## 8. 空状态（Empty State）

```tsx
<div className="h-full min-h-[600px] flex items-center justify-center p-12 rounded-2xl border border-dashed border-[color:var(--border-color)] bg-[var(--card-bg-elevated)] backdrop-blur-sm">
  <div className="text-center space-y-4">
    <!-- 图标 -->
    <p className="text-slate-600 dark:text-slate-400 text-lg font-light">主提示文案</p>
    <p className="text-slate-400 dark:text-slate-500 text-sm">次要说明</p>
  </div>
</div>
```
- 虚线边框、居中、双行文案层次。

---

## 9. 错误/告警（ErrorAlert）

- 容器：`rounded-2xl border border-red-200/50 dark:border-red-800/50 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm shadow-lg`。
- 标题：图标 + `font-semibold text-red-800 dark:text-red-200`。
- 列表：`text-sm text-red-700 dark:text-red-300`。

---

## 10. 表单与输入

- 与 Ant Design 配合时，在 `AntdProvider` 中统一 `colorPrimary: "#243B53"`（即 `--brand`）。
- 标签/说明用 `text-[var(--muted-foreground)]`，必填或错误态可配合 `--loss`。

---

## 11. 布局栅格（网格页模式）

- 主布局：`grid grid-cols-12 gap-6`。
- 左侧栏：`col-span-12 lg:col-span-4`。
- 右侧内容：`col-span-12 lg:col-span-8 space-y-6`。
- 移动端先堆叠，大屏再并排。

---

## 12. 字体与图标

- **标题/品牌**：`font-serif`（Lora，由 layout 注入 `--font-brand-serif`）。
- **正文与 UI**：无衬线（Geist/系统字体）。
- **数字**：`font-mono` 或 `tabular-nums`。
- **图标**：Lucide React / Ant Design Icons，统一尺寸（如 w-5 h-5），不用 emoji。

---

## 13. 动效与可访问性

- 过渡：`transition-colors duration-200` 或 `transition-all duration-300`。
- 可点击元素：`cursor-pointer`，带 `focus-visible:ring-2 …`。
- 深色模式：所有颜色通过 CSS 变量切换，不写死 `#hex`（除 Ant Design token 等必须处）。

---

## 14. 禁止项

- 不在页面内写死 `#F0F4F8`、`#243B53` 等，改用 `var(--page-bg)`、`var(--brand)` 等。
- 不在页面内重复注入 Lora（如 `dangerouslySetInnerHTML` 的 `@import`），使用 layout 的 `--font-brand-serif`。
- 不单独为某页设 `max-w-[1400px]`，与全站 `max-w-7xl` 统一（除非有明确例外说明）。
