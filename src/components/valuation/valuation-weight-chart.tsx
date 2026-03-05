"use client"

import ReactEChartsCore from "echarts-for-react/lib/core"
import * as echarts from "echarts/core"
import { PieChart as EPieChart } from "echarts/charts"
import {
  TooltipComponent,
  LegendComponent,
} from "echarts/components"
import { CanvasRenderer } from "echarts/renderers"
import { useMemo } from "react"
import type { EChartsOption } from "echarts"

echarts.use([
  EPieChart,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
])

interface HoldingItem {
  rank: number
  name: string
  code: string
  weight: number
  industry: string
}

interface ValuationWeightChartProps {
  holdings: HoldingItem[]
}

const INDUSTRY_COLORS = [
  "#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#6366f1", "#14b8a6", "#f97316",
  "#84cc16", "#a855f7", "#0ea5e9", "#22c55e", "#eab308",
]

export function ValuationWeightChart({ holdings }: ValuationWeightChartProps) {
  const industryData = useMemo(() => {
    const map = new Map<string, number>()
    for (const h of holdings) {
      const ind = h.industry || "其他"
      map.set(ind, (map.get(ind) ?? 0) + h.weight)
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
  }, [holdings])

  const holdingData = useMemo(() => {
    return holdings
      .slice(0, 8)
      .map((h) => ({ name: h.name, value: h.weight }))
  }, [holdings])

  const industryOption = useMemo<EChartsOption>(() => ({
    tooltip: {
      trigger: "item",
      backgroundColor: "#fff",
      borderColor: "#e2e8f0",
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: "#18181b", fontSize: 12 },
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number }
        return `<div style="font-weight:600">${p.name}</div><div style="font-size:12px;color:#71717a">${p.value.toFixed(2)}% (占比 ${p.percent.toFixed(1)}%)</div>`
      },
    },
    series: [
      {
        type: "pie",
        radius: ["42%", "72%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 4,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          fontSize: 11,
          color: "#52525b",
          formatter: (params: unknown) => {
            const p = params as { name: string; percent: number }
            return p.percent >= 5 ? `${p.name}\n${p.percent.toFixed(0)}%` : ""
          },
        },
        emphasis: {
          label: { fontSize: 13, fontWeight: "bold" },
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.12)" },
        },
        data: industryData.map((d, i) => ({
          ...d,
          itemStyle: { color: INDUSTRY_COLORS[i % INDUSTRY_COLORS.length] },
        })),
      },
    ],
    animation: true,
    animationDuration: 600,
  }), [industryData])

  const holdingOption = useMemo<EChartsOption>(() => ({
    tooltip: {
      trigger: "item",
      backgroundColor: "#fff",
      borderColor: "#e2e8f0",
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: "#18181b", fontSize: 12 },
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number }
        return `<div style="font-weight:600">${p.name}</div><div style="font-size:12px;color:#71717a">权重 ${p.value.toFixed(2)}%</div>`
      },
    },
    series: [
      {
        type: "pie",
        radius: ["42%", "72%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 4,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {
          fontSize: 11,
          color: "#52525b",
          formatter: (params: unknown) => {
            const p = params as { name: string; percent: number }
            return p.percent >= 8 ? `${p.name}\n${p.percent.toFixed(0)}%` : ""
          },
        },
        emphasis: {
          label: { fontSize: 13, fontWeight: "bold" },
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.12)" },
        },
        data: holdingData.map((d, i) => ({
          ...d,
          itemStyle: { color: INDUSTRY_COLORS[i % INDUSTRY_COLORS.length] },
        })),
      },
    ],
    animation: true,
    animationDuration: 600,
  }), [holdingData])

  if (!holdings.length) return null

  const totalWeight = holdingData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-zinc-800">指数权重</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        <div className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-zinc-600">成分股权重</span>
            <span className="text-[11px] text-zinc-400">
              Top {holdingData.length} 合计 {totalWeight.toFixed(1)}%
            </span>
          </div>
          <ReactEChartsCore
            echarts={echarts}
            option={holdingOption}
            style={{ height: 220, width: "100%" }}
            notMerge
            lazyUpdate
          />
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-zinc-600">行业分布</span>
            <span className="text-[11px] text-zinc-400">
              {industryData.length} 个行业
            </span>
          </div>
          <ReactEChartsCore
            echarts={echarts}
            option={industryOption}
            style={{ height: 220, width: "100%" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>
    </div>
  )
}
