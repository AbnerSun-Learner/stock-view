"use client"

interface ValuationDropPanelProps {
  currentClose: number
  highestClose: number
  /** 历史最低收盘（用于计算历史最大跌幅） */
  minClose?: number
  showDropZones?: boolean
  onDropZonesChange?: (show: boolean) => void
}

function WaterLevel({
  label,
  level: dropPercent,
  price,
  currentClose,
  color,
}: {
  label: string
  level: number
  price: number
  currentClose: number
  color: string
}) {
  const distancePercent = ((price - currentClose) / currentClose) * 100
  const fillPercent = Math.max(0, Math.min(100, (1 - dropPercent / 100) * 100))

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-10 h-20 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-500"
          style={{
            height: `${fillPercent}%`,
            background: `linear-gradient(to top, ${color}40, ${color}15)`,
          }}
        />
        <div
          className="absolute left-0 right-0 h-0.5"
          style={{
            bottom: `${fillPercent}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold" style={{ color }}>{label}</span>
          <span className="text-xs text-zinc-400">跌 {dropPercent}%</span>
        </div>
        <div className="text-lg font-bold tabular-nums text-zinc-800">
          {price.toFixed(0)}
        </div>
        <div className="text-xs tabular-nums text-zinc-500">
          距当前 {distancePercent >= 0 ? "+" : ""}{distancePercent.toFixed(1)}%
        </div>
      </div>
    </div>
  )
}

export function ValuationDropPanel({
  currentClose,
  highestClose,
  minClose,
  showDropZones = false,
  onDropZonesChange,
}: ValuationDropPanelProps) {
  const drop70 = highestClose * 0.3
  const drop80 = highestClose * 0.2
  const currentDropPercent = ((highestClose - currentClose) / highestClose) * 100
  const maxDropPercent =
    minClose != null && minClose < highestClose
      ? ((highestClose - minClose) / highestClose) * 100
      : null

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 px-5 py-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-800">极限跌幅</h3>
        <div className="flex items-center gap-3">
          {maxDropPercent != null && (
            <span className="text-[11px] text-zinc-500">
              历史最大跌幅 -{maxDropPercent.toFixed(1)}%
            </span>
          )}
          {typeof onDropZonesChange === "function" && (
            <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer select-none">
              <span>70/80 下跌区域</span>
              <button
                type="button"
                role="switch"
                aria-checked={showDropZones}
                onClick={() => onDropZonesChange(!showDropZones)}
                className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 ${
                  showDropZones
                    ? "bg-[#243B53] border-[#243B53]"
                    : "bg-slate-200 border-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                    showDropZones ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>
          )}
        </div>
      </div>

      <div className="mb-4 p-3 rounded-xl bg-slate-50/80">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-zinc-500">当前点位</span>
          <span className="text-base font-bold tabular-nums text-zinc-800">
            {currentClose.toFixed(0)}
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <span className="text-xs text-zinc-500">距最高点跌幅</span>
          <span className="text-sm font-semibold tabular-nums text-amber-600">
            -{currentDropPercent.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <WaterLevel
          label="70 水位"
          level={70}
          price={drop70}
          currentClose={currentClose}
          color="#f59e0b"
        />
        <WaterLevel
          label="80 水位"
          level={80}
          price={drop80}
          currentClose={currentClose}
          color="#ef4444"
        />
      </div>
    </div>
  )
}
