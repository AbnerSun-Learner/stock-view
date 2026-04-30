---
name: stillwell-ui
description: Stillwell 项目 UI 生成规范。当新增页面、组件或对现有 UI 进行修改时使用。定义了极简主义设计风格、色彩系统、字体栈、间距系统、组件模式和中英文排版规则，确保全项目视觉一致性。
---

# Stillwell UI 规范

## 设计哲学

核心风格：**极简主义（Core Minimalism）**。

- 深度靠 `border` + 间距建立，**禁止** `box-shadow`、渐变背景
- 每个元素必须有存在理由，否则移除
- 悬停只改变透明度或边框色，**不使用** `scale` / `translateY` 大于 2px 的动画
- 留白是设计的一部分，内容区占页面 40–50%

---

## 色彩系统

使用 CSS 变量，**不直接写死颜色值**。

```css
/* 核心变量（globals.css 中已定义） */
--page-bg           /* 页面背景：#ffffff / dark: #0a0a0a */
--foreground        /* 主文字：#000000 / dark: #f5f5f5 */
--muted-foreground  /* 次要文字：#666666 / dark: #999999 */
--border-color      /* 边框：#e5e5e5 / dark: #2d2d2d */
--card-bg           /* 卡片背景：#ffffff / dark: #111111 */
--hover-bg          /* 悬停背景：rgba(0,0,0,0.03) */

/* 功能性颜色（仅用于数据，不用于 UI 装饰） */
--profit            /* 盈利绿：#059669 / dark: #10b981 */
--loss              /* 亏损红：#dc2626 / dark: #f87171 */
```

**点缀色规则**：

- 首页背景为 `bg-[#f5f5f5]`（浅灰），内页为 `bg-[var(--page-bg)]`（白）
- 估值状态：低估 `#059669`、合理 `#b45309`、高估 `#dc2626`，仅数据标签使用

---

## 字体系统

`layout.tsx` 已加载三款字体，通过 CSS 变量注入：

| 变量                  | 字体                     | 用途               |
| --------------------- | ------------------------ | ------------------ |
| `--font-inter`        | Inter 300/400/500/600    | 英文字符、UI 元素  |
| `--font-noto-sans-sc` | Noto Sans SC 300/400/500 | 中文 CJK 字符      |
| `--font-geist-mono`   | Geist Mono               | 价格、分位数、代码 |

**字体栈**（globals.css 中已全局设置）：

```
Inter → Noto Sans SC → PingFang SC → Microsoft YaHei → Helvetica Neue
```

**排版规则**：

```
正文：     15px / line-height 1.8 / letter-spacing 0.01em
标题：     line-height 1.2 / letter-spacing -0.01em（英文收紧，中文 CJK 不受影响）
辅助文字：  text-[10px] uppercase tracking-[0.18em]（section 标签用）
数据数字：  font-mono + tabular-nums（使用 .font-mono 类）
```

---

## 间距系统

8px 基础单位，严格使用 Tailwind 的整数倍：

```
xs:  8px  → p-2 / gap-2
sm:  16px → p-4 / gap-4
md:  24px → p-6 / gap-6
lg:  32px → p-8 / gap-8
xl:  48px → py-12
2xl: 64px → py-16
3xl: 96px → py-24
```

---

## 页面结构模板

### 内页（Grid / Valuation）

```tsx
<div className="min-h-screen bg-[var(--page-bg)] text-[var(--foreground)]">
  <Navbar /> {/* fixed, h-[导航高度], border-b */}
  <div className="pt-20">
    {" "}
    {/* 导航栏高度补偿 */}
    <div className="max-w-7xl mx-auto px-8 md:px-16 py-16">
      {/* 页头 */}
      <div className="mb-12">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)] mb-4">
          英文副标题
        </p>
        <h1 className="text-4xl md:text-5xl font-light tracking-[-0.02em] mb-4">
          中文主标题
        </h1>
        <p className="text-base text-[var(--muted-foreground)] leading-[1.8] max-w-xl">
          描述文字
        </p>
      </div>

      {/* 内容区 */}
    </div>
  </div>
</div>
```

### 首页（Landing）

```tsx
<div className="min-h-screen bg-[#f5f5f5] text-neutral-900">
  <header className="fixed ... h-[72px] border-b border-neutral-200">
    {/* STILLWELL wordmark（uppercase） + 导航链接 */}
  </header>

  <main>
    <section className="pt-40 pb-16 mx-auto max-w-6xl px-6 lg:px-10">
      {/* Hero：大标题 + 副标题，底部 h-px 分隔线，无 CTA 按钮在 Hero 内 */}
    </section>
    <div className="h-px bg-neutral-200 mx-auto max-w-6xl px-6 lg:px-10" />
    {/* 其余 Section 用 h-px 分隔，不用 Section 背景色切换 */}
  </main>
</div>
```

---

## 组件模式

### Navbar

```tsx
<nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--page-bg)] border-b border-[color:var(--border-color)]">
  <div className="flex justify-between items-center px-8 md:px-16 py-5 max-w-7xl mx-auto">
    <Link
      href="/"
      className="text-sm font-medium tracking-tight hover:opacity-70 transition-opacity duration-300"
    >
      Stillwell
    </Link>
    {/* 导航链接 + 主题切换按钮 */}
  </div>
</nav>
```

### Section 标签（统一格式）

```tsx
<p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)] mb-4">
  English Label
</p>
```

### 卡片

```tsx
{
  /* 极简卡片：border only，无 shadow，hover 改边框色 */
}
<div
  className="border border-[color:var(--border-color)] p-6
  transition-all duration-150 hover:border-[var(--foreground)]"
></div>;

{
  /* 首页工具卡片（白底 + 序号） */
}
<article
  className="bg-white border border-neutral-200
  transition-all duration-150 hover:-translate-y-0.5 hover:border-neutral-400"
>
  <div className="flex items-center justify-center h-36 border-b border-neutral-100">
    <span className="text-[5rem] font-light text-neutral-100">01</span>
  </div>
  <div className="p-5">{/* 标题 / 英文副标 / 描述 / 标签 */}</div>
</article>;
```

### 按钮

```tsx
{
  /* 主按钮：黑底白字，圆形 */
}
<button
  className="inline-flex items-center gap-2 rounded-full
  bg-[var(--foreground)] text-[var(--page-bg)]
  px-6 py-3 text-sm font-semibold
  hover:opacity-75 transition-opacity duration-150
  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
>
  文字 <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
</button>;

{
  /* 次按钮：轮廓，圆形 */
}
<button
  className="inline-flex items-center gap-2 rounded-full
  border border-[color:var(--border-color)] text-[var(--foreground)]
  px-6 py-3 text-sm font-medium
  hover:border-[var(--foreground)] transition-colors duration-150"
>
  文字
</button>;

{
  /* 内页主按钮：无圆角，对应内页风格 */
}
<button
  className="px-6 py-4 bg-[var(--foreground)] text-[var(--page-bg)]
  text-sm font-medium tracking-wide
  hover:opacity-70 transition-opacity duration-300"
>
  文字
</button>;
```

### 数据表格

```tsx
{
  /* 表头 */
}
<tr className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border-b border-[color:var(--border-color)]">
  <th
    className="p-4 text-[10px] font-medium uppercase text-[var(--muted-foreground)]"
    style={{ letterSpacing: "0.08em" }}
  >
    列标题
  </th>
</tr>;

{
  /* 数据行 */
}
<tr className="border-b border-[color:var(--border-color)] hover:bg-[var(--hover-bg)] transition-colors duration-200">
  <td className="p-4 text-sm text-[var(--foreground)]">内容</td>
  <td className="p-4 text-sm font-mono text-[var(--foreground)]">数字</td> {/* 数字列加 font-mono */}
</tr>;
```

### 统计数字块

```tsx
{
  /* 横向分割线式统计（首页用） */
}
<div className="grid grid-cols-4 divide-x divide-[color:var(--border-color)]">
  <div className="py-8 px-6">
    <div className="text-3xl font-semibold tracking-[-0.02em]">10+</div>
    <div
      className="text-xs text-[var(--muted-foreground)]"
      style={{ letterSpacing: "0.04em" }}
    >
      年历史数据
    </div>
  </div>
</div>;
```

### 分隔线

```tsx
{
  /* 全宽分隔（内页） */
}
<div className="w-full h-px bg-[var(--border-color)]" />;

{
  /* 容器内分隔（首页） */
}
<div className="mx-auto max-w-6xl px-6 lg:px-10">
  <div className="h-px bg-neutral-200" />
</div>;
```

---

## 估值状态标签

```tsx
{
  /* 低估 / 合理 / 高估 */
}
<span
  className="text-xs border px-1.5 py-0.5"
  style={{ color: statusColor, borderColor: statusColor + "4d" }}
>
  {label}
</span>;
```

---

## 禁止项

| 禁止                               | 原因                                 |
| ---------------------------------- | ------------------------------------ |
| `box-shadow` / `shadow-*`          | 违反减法设计哲学                     |
| `bg-gradient-*` / `from-* to-*`    | 不符合中性色彩原则                   |
| `rounded-2xl` / `rounded-3xl`      | 内页卡片使用 `rounded` 或无圆角      |
| `animate-bounce` / `scale-*`       | 只允许 opacity / border-color 微交互 |
| `backdrop-blur`                    | 导航栏不用模糊效果                   |
| 直接写颜色值（如 `text-blue-500`） | 功能色用变量，装饰色禁用             |

---

## 参考文件

- 设计变量：`src/app/globals.css`
- 字体加载：`src/app/layout.tsx`
- 首页参考：`src/app/page.tsx`
- 内页参考：`src/app/grid/page.tsx`、`src/app/valuation/page.tsx`
