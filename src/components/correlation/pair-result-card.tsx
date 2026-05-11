"use client";

import type { PairCorrelationData } from "@/lib/correlation/pair-correlation-types";
import { HelpCircle } from "lucide-react";

interface PairResultCardProps {
  data: PairCorrelationData;
  periodLabel: string;
}

interface AdviceMeta {
  label: string;
  tagClass: string;
}

function getAdviceMeta(score: number): AdviceMeta {
  if (score < 0.3) return { label: "分散较好", tagClass: "undervalued" };
  if (score < 0.6) return { label: "存在一定重叠", tagClass: "fair" };
  if (score < 0.8) return { label: "对比重合度高", tagClass: "fair" };
  return { label: "高度重复", tagClass: "overvalued" };
}

function fmt(score: number) {
  return score.toFixed(2);
}

export function PairResultCard({ data, periodLabel }: PairResultCardProps) {
  const advice = getAdviceMeta(data.finalScore);

  return (
    <div className="correlation-card p-6 md:p-8 space-y-6">
      <div>
        <p className="correlation-eyebrow text-xs font-semibold tracking-[0.2em] uppercase">
          Comparison Results
        </p>
        <h3 className="mt-2 text-lg font-light text-[var(--foreground)]">
          对比结果
        </h3>
      </div>

      <div>
        <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-[var(--muted-foreground)] mb-2">
          综合对比分
        </p>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-4xl font-light tabular-nums text-[var(--correlation-brand)]">
            {fmt(data.finalScore)}
          </span>
          <span className={`valuation-tag ${advice.tagClass}`}>
            {advice.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatWithTip
          label="走势同向性"
          tooltip="所选时间窗口内，根据两只 ETF 日收益率计算的同向程度（0–1，越高表示涨跌方向越一致）。该指标在综合对比分中约占一半权重。"
          value={fmt(data.scoreA)}
        />
        <StatWithTip
          label="成分重叠"
          tooltip="依据最新披露持仓，按重仓股权重计算的底层重叠程度（0–1，越高表示持仓股票越相似）。该指标在综合对比分中约占一半权重。"
          value={fmt(data.scoreB)}
        />
        <StatWithTip
          label="皮尔逊相关系数"
          tooltip="在同一时间窗口内，两只 ETF 日收益率之间的线性联动强度（Pearson），取值在 -1 到 1 之间；接近 1 表示同涨同跌的倾向更强。"
          value={data.pearson.toFixed(3)}
        />
        <StatWithTip
          label="样本天数"
          tooltip="参与指数净值联动与日涨跌序列计算的有效交易日数量（两基金均有行情的重叠样本）。"
          value={data.sampleSize.toString()}
        />
      </div>

      <div>
        <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-[var(--muted-foreground)] mb-2">
          时间窗口
        </p>
        <p className="text-sm text-[var(--foreground)]">{periodLabel}</p>
        <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
          {data.rangeLabel}
        </p>
      </div>

      <div className="pt-4 border-t border-[color:var(--border-color)]">
        <p className="text-sm leading-relaxed text-[var(--foreground)]">
          {data.headline}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
          {data.detail}
        </p>
      </div>
    </div>
  );
}

interface StatWithTipProps {
  label: string;
  tooltip: string;
  value: string;
}

function StatWithTip({ label, tooltip, value }: StatWithTipProps) {
  return (
    <div className="rounded-none border border-[color:var(--border-color)] bg-[var(--correlation-stat-surface)] px-3 py-2">
      <div className="flex items-center gap-1 mb-1">
        <p className="text-[10px] font-medium tracking-[0.16em] uppercase text-[var(--muted-foreground)]">
          {label}
        </p>
        <span className="group relative shrink-0 inline-flex">
          <HelpCircle
            className="w-3 h-3 cursor-help opacity-50 hover:opacity-80 transition-opacity"
            strokeWidth={1.5}
          />
          <span className="correlation-rich-tooltip absolute left-0 top-full mt-2 hidden group-hover:block z-[60] normal-case whitespace-normal">
            {tooltip}
          </span>
        </span>
      </div>
      <p className="text-base font-light tabular-nums text-[var(--correlation-chart-line)]">
        {value}
      </p>
    </div>
  );
}
