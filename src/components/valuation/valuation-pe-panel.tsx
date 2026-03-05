"use client";

export interface ValuationPePanelProps {
  currentValue: number;
  currentPercentile: number;
  percentile80: number;
  percentile50: number;
  percentile20: number;
  max: number;
  average: number;
  min: number;
}

function Row({
  label,
  value,
  valueColor = "text-zinc-900",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-baseline justify-between py-1.5">
      <span className="text-sm text-zinc-700">{label}</span>
      <span className={`text-base font-bold tabular-nums ${valueColor}`}>
        {value}
      </span>
    </div>
  );
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
}: ValuationPePanelProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 px-5 py-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
      <h3 className="text-xl font-bold text-blue-600 pb-2 mb-1">
        PE-TTM
      </h3>

      {/* 第一组：当前值 + 当前分位点 */}
      <div className="mt-3">
        <Row
          label="当前值:"
          value={currentValue.toFixed(2)}
          valueColor="text-blue-600"
        />
        <Row
          label="当前分位点"
          value={`${currentPercentile.toFixed(2)}%`}
          valueColor="text-blue-600"
        />
      </div>

      {/* 第二组：分位点值 */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <Row
          label="80%分位点值"
          value={percentile80.toFixed(2)}
          valueColor="text-red-600"
        />
        <Row
          label="50%分位点值"
          value={percentile50.toFixed(2)}
        />
        <Row
          label="20%分位点值"
          value={percentile20.toFixed(2)}
          valueColor="text-emerald-600"
        />
      </div>

      {/* 第三组：最大/平均/最小 */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <Row
          label="最大值:"
          value={max.toFixed(2)}
          valueColor="text-red-600"
        />
        <Row label="平均值:" value={average.toFixed(2)} />
        <Row
          label="最小值:"
          value={min.toFixed(2)}
          valueColor="text-emerald-600"
        />
      </div>
    </div>
  );
}
