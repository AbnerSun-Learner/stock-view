"use client"

import ReactEChartsCore from "echarts-for-react/lib/core"
import * as echarts from "echarts/core"
import { BarChart as EBarChart } from "echarts/charts"
import {
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
} from "echarts/components"
import { CanvasRenderer } from "echarts/renderers"
import { useMemo } from "react"
import type { EChartsOption } from "echarts"

echarts.use([
  EBarChart,
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  CanvasRenderer,
])

interface ValuationDistributionProps {
  values: number[]
  currentValue: number
  label: string
  accentColor?: string
}

interface HistogramBin {
  lower: number
  upper: number
  count: number
}

function resolveCssColor(input: string): string {
  if (typeof window === "undefined") return input
  const match = input.match(/^var\((--[^)]+)\)$/)
  if (!match) return input
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(match[1])
    .trim()
  return value || input
}

function buildHistogram(values: number[], binCount = 40) {
  if (!values.length) return { bins: [] as HistogramBin[], total: 0 }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const binWidth = range / binCount

  const counts = new Array(binCount).fill(0)
  for (const v of values) {
    const idx = Math.min(Math.floor((v - min) / binWidth), binCount - 1)
    counts[idx]++
  }

  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    lower: Math.round((min + binWidth * i) * 100) / 100,
    upper: Math.round((min + binWidth * (i + 1)) * 100) / 100,
    count: counts[i],
  }))

  return { bins, total: values.length }
}

export function ValuationDistribution({
  values,
  currentValue,
  label,
  accentColor = "#3b82f6",
}: ValuationDistributionProps) {
  const option = useMemo<EChartsOption>(() => {
    const resolvedAccent = resolveCssColor(accentColor)
    const axisMuted = resolveCssColor("var(--muted-foreground)")
    const borderColor = resolveCssColor("var(--border-color)")
    const tooltipBg = resolveCssColor("var(--card-bg)")
    const tooltipText = resolveCssColor("var(--foreground)")

    const { bins, total } = buildHistogram(values)
    if (!bins.length) return {}

    const midValues = bins.map((b) => (b.lower + b.upper) / 2)
    const currentBinIdx = midValues.reduce(
      (closest, val, idx) =>
        Math.abs(val - currentValue) < Math.abs(midValues[closest] - currentValue)
          ? idx
          : closest,
      0
    )

    const maxCount = Math.max(...bins.map((b) => b.count))

    const barColors = bins.map((b, idx) => {
      if (idx === currentBinIdx) return resolvedAccent
      const ratio = b.count / maxCount
      const alpha = 0.15 + ratio * 0.45
      return `rgba(148,163,184,${alpha})`
    })

    const xLabels = bins.map((b) => b.lower.toFixed(1))

    return {
      grid: { top: 8, right: 12, bottom: 28, left: 12, containLabel: true },
      xAxis: {
        type: "category",
        data: xLabels,
        axisLabel: {
          fontSize: 10,
          color: axisMuted,
          interval: Math.floor(bins.length / 5),
        },
        axisLine: { lineStyle: { color: borderColor } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        show: false,
      },
      series: [
        {
          type: "bar",
          data: bins.map((b, i) => ({
            value: b.count,
            itemStyle: { color: barColors[i], borderRadius: [2, 2, 0, 0] },
          })),
          barWidth: "85%",
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: resolvedAccent, width: 2, type: "solid" },
            label: {
              formatter: `当前 ${label} ${currentValue.toFixed(2)}`,
              position: "end",
              fontSize: 11,
              fontWeight: "bold",
              color: resolvedAccent,
            },
            data: [{ xAxis: currentBinIdx }],
          },
        },
      ],
      tooltip: {
        trigger: "axis",
        backgroundColor: tooltipBg,
        borderColor,
        borderWidth: 1,
        padding: [14, 18],
        textStyle: { color: tooltipText, fontSize: 13 },
        confine: true,
        formatter(params: unknown) {
          const arr = params as { dataIndex: number; value: number }[]
          if (!arr?.length) return ""
          const idx = arr[0].dataIndex
          const bin = bins[idx]
          if (!bin) return ""
          const pct = total > 0 ? ((bin.count / total) * 100).toFixed(1) : "0.0"
          const isCurrent = idx === currentBinIdx
          return [
            `<div style="font-weight:600;color:${isCurrent ? resolvedAccent : tooltipText};margin-bottom:4px">${label} 区间 [${bin.lower.toFixed(2)} - ${bin.upper.toFixed(2)}]</div>`,
            `<div style="display:flex;justify-content:space-between;gap:16px">`,
            `<span style="color:${axisMuted}">落入天数</span>`,
            `<span style="font-weight:600;font-variant-numeric:tabular-nums">${bin.count} 天</span>`,
            `</div>`,
            `<div style="display:flex;justify-content:space-between;gap:16px">`,
            `<span style="color:${axisMuted}">占比</span>`,
            `<span style="font-weight:600;font-variant-numeric:tabular-nums">${pct}%</span>`,
            `</div>`,
          ].join("")
        },
      },
      animation: true,
      animationDuration: 400,
    }
  }, [values, currentValue, label, accentColor])

  return (
    <div className="w-full">
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        style={{ height: 160, width: "100%" }}
        notMerge
        lazyUpdate
      />
    </div>
  )
}
