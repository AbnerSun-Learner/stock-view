"use client"

import { Slider } from "antd"

export interface ValuationPePanelProps {
  currentValue: number
  currentPercentile: number
  percentile80: number
  percentile50: number
  percentile20: number
  max: number
  average: number
  min: number
  showBands?: boolean
  onBandsChange?: (show: boolean) => void
}

const GAUGE_STOPS = [
  { pct: 0, color: "#10b981", label: "低估" },
  { pct: 20, color: "#34d399", label: "偏低" },
  { pct: 40, color: "#fbbf24", label: "适中" },
  { pct: 60, color: "#f97316", label: "偏高" },
  { pct: 80, color: "#ef4444", label: "高估" },
]

function getLevel(p: number) {
  if (p <= 20) return { text: "低估", color: "#10b981" }
  if (p <= 40) return { text: "偏低", color: "#34d399" }
  if (p <= 60) return { text: "适中", color: "#fbbf24" }
  if (p <= 80) return { text: "偏高", color: "#f97316" }
  return { text: "高估", color: "#ef4444" }
}

function PercentileGauge({
  percentile,
  label,
  accentColor,
}: {
  percentile: number
  label: string
  accentColor: string
}) {
  const clampedP = Math.max(0, Math.min(100, percentile))
  const level = getLevel(clampedP)

  const marks: Record<number, { label: string; style: React.CSSProperties }> = {}
  for (const stop of GAUGE_STOPS) {
    marks[stop.pct] = {
      label: "",
      style: { display: "none" },
    }
  }

  return (
    <div>
      <div className="text-xs text-zinc-500 mb-0 text-center">{label}分位</div>
      <Slider
        value={clampedP}
        min={0}
        max={100}
        marks={marks}
        tooltip={{
          formatter: () => `${percentile.toFixed(1)}% ${level.text}`,
          open: true,
        }}
        styles={{
          rail: {
            background: "linear-gradient(to right, #10b981, #34d399 25%, #fbbf24 50%, #f97316 75%, #ef4444)",
            height: 6,
          },
          track: {
            background: "transparent",
            height: 6,
          },
          handle: {
            width: 14,
            height: 14,
            borderColor: "#fff",
            backgroundColor: accentColor,
            boxShadow: `0 0 0 2px ${accentColor}40, 0 2px 6px rgba(0,0,0,0.15)`,
            marginTop: -4,
          },
        }}
        disabled
        className="valuation-gauge-slider"
      />
      <style>{`
        .valuation-gauge-slider .ant-slider-disabled { cursor: default !important; opacity: 1 !important; }
        .valuation-gauge-slider .ant-slider-disabled .ant-slider-handle { cursor: default !important; }
        .valuation-gauge-slider .ant-slider-dot { display: none !important; }
        .valuation-gauge-slider .ant-tooltip-inner { 
          font-size: 13px; font-weight: 600; white-space: nowrap;
          background: ${level.color} !important; color: #fff !important;
          border-radius: 6px; padding: 2px 10px;
        }
        .valuation-gauge-slider .ant-tooltip-arrow::before,
        .valuation-gauge-slider .ant-tooltip-arrow::after {
          background: ${level.color} !important;
        }
      `}</style>
    </div>
  )
}

function StatGrid({
  items,
}: {
  items: { label: string; value: string; color?: string }[]
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col">
          <span className="text-[11px] text-zinc-400 leading-tight">{item.label}</span>
          <span
            className={`text-sm font-semibold tabular-nums leading-tight ${item.color ?? "text-zinc-800"}`}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ValuationPePanel({
  currentValue,
  currentPercentile,
  percentile80,
  percentile50,
  percentile20,
  max,
  average,
  min,
  showBands = false,
  onBandsChange,
}: ValuationPePanelProps) {
  const accentColor = "#243B53"
  const labelPrefix = "PE"

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="px-5 pt-4 pb-1 flex items-center justify-between">
        <h3 className="text-base font-bold" style={{ color: accentColor }}>
          PE-TTM
        </h3>
        {typeof onBandsChange === "function" && (
          <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer select-none">
            <span>估值带</span>
            <button
              type="button"
              role="switch"
              aria-checked={showBands}
              onClick={() => onBandsChange(!showBands)}
              className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 ${
                showBands ? "bg-[#243B53] border-[#243B53]" : "bg-slate-200 border-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                  showBands ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[11px] text-zinc-400">当前{labelPrefix}</div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: accentColor }}>
              {currentValue.toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-zinc-400">平均值</div>
            <div className="text-sm font-semibold tabular-nums text-zinc-600">
              {average.toFixed(2)}
            </div>
          </div>
        </div>

        <PercentileGauge
          percentile={currentPercentile}
          label={labelPrefix}
          accentColor={accentColor}
        />

        <div className="pt-2 border-t border-slate-100">
          <StatGrid
            items={[
              { label: "80% 分位", value: percentile80.toFixed(2), color: "text-orange-600" },
              { label: "50% 分位", value: percentile50.toFixed(2) },
              { label: "20% 分位", value: percentile20.toFixed(2), color: "text-emerald-600" },
              { label: "最高PE", value: max.toFixed(2), color: "text-red-500" },
              { label: "最低PE", value: min.toFixed(2), color: "text-emerald-600" },
              { label: "平均值", value: average.toFixed(2) },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
