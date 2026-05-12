---
name: index-detail-chart-design
description: Defines UI design rules for the index detail page charts in stock-view. Use when implementing or refactoring /indices/[code] charts, price trend charts, drawdown cards, return analytics, heatmaps, ECharts options, chart cards, axes, tooltips, and index detail financial visualizations.
disable-model-invocation: true
---

# Index Detail Chart Design

Use this skill when editing `src/components/indices/*` chart UI for the index detail page.

## Core Style

- Use ECharts through `IndicesReactECharts`; do not introduce another chart library for this page.
- Wrap every chart in a rounded card:
  - `rounded-2xl`
  - `border border-[color:var(--border-color)]`
  - `bg-[var(--correlation-card-surface)]`
  - `shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)]`
- Use `font-medium` for chart card titles. Avoid `font-semibold` for main chart titles.
- Keep title color `text-[var(--foreground)]` and descriptions `text-xs text-[var(--muted-foreground)]`.
- Prefer CSS variables over hard-coded colors. Exceptions are allowed only for fixed financial heatmap palettes or subtle neutral line colors.

## Price Trend Chart

The primary price trend chart is the visual anchor of the detail page.

- Title `价格指数走势` belongs inside the chart card and is left-aligned.
- Time range controls stay inside the same card, above the chart, horizontally centered.
- The chart should use a single blue price line:
  - line color: `var(--correlation-brand)`
  - line width: about `1.8`
  - optional soft blue area fill under the line
- X-axis should be a simple horizontal line with no small tick marks:
  - `axisTick: { show: false }`
  - quarter labels preferred: `10月`, `2024`, `4月`, `7月`, `10月`, `2025`
  - January labels display the year; April/July/October display month labels.
- Y-axis should be readable, with left labels and optional right labels using compact `K` formatting.
- Tooltip should show:
  - date
  - close price
  - cumulative return
  - drawdown from previous high
- Use dashed crosshair axis pointer for hover inspection.

## Extreme Drawdown Panel

The extreme drawdown panel sits to the right of the price trend chart on desktop.

- It should align to the top of the price chart card.
- It should match the price chart card height on desktop using `h-full`.
- Keep it visually lighter than the main chart:
  - subtle gradient card background is acceptable
  - top header separated by a thin border
  - switch placed in a small pill container
  - metric cards use light borders and smaller numeric text
- The switch controls whether 70% and 80% drawdown waterlines are marked on the price chart.
- Waterline mark lines should be dashed and use `var(--profit)` tones because they represent lower price levels.

## Percentile Gauges

PE/PB percentile gauges live in the top hero card on the index detail page.

- Keep the heading in the hero card: `PE / PB 估值分位`.
- Gauges may use embedded mode to avoid rendering duplicate headings.
- Gauge range is always 0-100.
- Use pointer-style ECharts gauge, not water-level or extra bar widgets.
- PE uses `var(--correlation-brand)`; PB can use a teal accent.

## Return Analytics

Return analytics cards include annual return, drawdown history, holding-period heatmap, and monthly return statistics.

- Use the same rounded chart card shell as the rest of the page.
- Title weight should be `font-medium`.
- Annual return bars:
  - positive: `var(--profit)`
  - negative: `var(--loss)`
  - disable emphasis so bars do not disappear on hover.
- Drawdown history:
  - left axis is drawdown percentage and should dynamically fit data.
  - do not hard-code `-100%` unless the data actually needs it.
  - red area fill represents drawdown depth.
- Holding-period heatmap:
  - A-share convention: red for positive returns, green for negative returns.
  - stronger return magnitude means deeper color.
  - ECharts heatmap must include `visualMap`; keep per-cell `itemStyle.color` when exact buckets matter.
- Monthly return table:
  - keep compact, horizontally scrollable on narrow screens.
  - use the same red/green financial semantics.

## Industry Composition

- Keep industry composition as a card with ECharts pie chart and external legend/insight area.
- Main title uses `font-medium`.
- Avoid left-side brand stripes in legends, tooltips, popovers, or insight panels.
- Use uniform borders, card surfaces, and muted descriptions for hierarchy.

## Tooltip And Axis Rules

- Tooltip background: `var(--correlation-card-surface)`.
- Tooltip border: `var(--border-color)`.
- Tooltip text: `var(--foreground)` with muted labels.
- Use tabular numerals for prices, percentages, and dates.
- Disable hover emphasis when it causes bars, heatmap cells, or lines to fade unexpectedly.
- Axis labels should be sparse and intentional. Prefer readable business labels over raw dense dates.
- Avoid visual clutter:
  - no unnecessary x-axis tick marks
  - no left brand stripe accents
  - no duplicate headings when a component is embedded inside another card

## Verification Checklist

- Run `pnpm exec tsc --noEmit` after chart changes.
- Check lints for edited TSX files.
- If changing ECharts options, verify in browser:
  - no ECharts runtime errors
  - x-axis labels are visible and not overcrowded
  - hover tooltip works
  - waterline switch updates chart state
  - heatmap colors render red/green correctly
