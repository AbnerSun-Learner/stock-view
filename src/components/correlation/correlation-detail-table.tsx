"use client";

import type { ConfidenceLevel, PairResult } from "@/types/correlation";
import { Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";

interface CorrelationDetailTableProps {
  pairs: PairResult[];
}

interface DetailRow {
  key: string;
  pair: PairResult;
}

const STATUS_TEXT: Record<PairResult["status"], string> = {
  complete: "完整",
  partial: "部分",
  unavailable: "不可用",
};

const CONFIDENCE_TEXT: Record<ConfidenceLevel, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

function fmt(score: number | null, fallback = "—"): string {
  if (score === null) return fallback;
  return score.toFixed(2);
}

export function CorrelationDetailTable({ pairs }: CorrelationDetailTableProps) {
  const dataSource: DetailRow[] = useMemo(
    () =>
      pairs.map((p) => ({
        key: p.pair.join("-"),
        pair: p,
      })),
    [pairs]
  );

  const columns: ColumnsType<DetailRow> = useMemo(
    () => [
      {
        title: "ETF 配对",
        key: "pair",
        render: (_: unknown, row: DetailRow) => (
          <span className="font-mono text-sm text-[var(--foreground)]">
            {row.pair.pair[0]} ↔ {row.pair.pair[1]}
          </span>
        ),
      },
      {
        title: "状态",
        key: "status",
        align: "center",
        render: (_: unknown, row: DetailRow) => (
          <span className="text-xs text-[var(--muted-foreground)]">
            {STATUS_TEXT[row.pair.status]}
          </span>
        ),
      },
      {
        title: "综合分",
        key: "final",
        align: "right",
        render: (_: unknown, row: DetailRow) => {
          const p = row.pair;
          if (p.status === "complete" && p.finalScore !== null) {
            return (
              <span className="font-mono tabular-nums text-sm text-[var(--foreground)]">
                {fmt(p.finalScore)}
              </span>
            );
          }
          if (p.status === "partial" && p.partialScore !== null) {
            return (
              <Tooltip title="仅部分信号可用，未生成综合分">
                <span className="font-mono tabular-nums text-sm text-[var(--muted-foreground)]">
                  ({fmt(p.partialScore)})
                </span>
              </Tooltip>
            );
          }
          return <span className="text-[var(--muted-foreground)]">—</span>;
        },
      },
      {
        title: "A 走势",
        key: "a",
        align: "right",
        render: (_: unknown, row: DetailRow) => (
          <span className="font-mono tabular-nums text-sm text-[var(--foreground)]">
            {fmt(row.pair.signals.return.score)}
          </span>
        ),
      },
      {
        title: "B 成分",
        key: "b",
        align: "right",
        render: (_: unknown, row: DetailRow) => (
          <span className="font-mono tabular-nums text-sm text-[var(--foreground)]">
            {fmt(row.pair.signals.holding.score)}
          </span>
        ),
      },
      {
        title: "可信度",
        key: "confidence",
        align: "center",
        render: (_: unknown, row: DetailRow) => (
          <span className="text-xs text-[var(--muted-foreground)]">
            {CONFIDENCE_TEXT[row.pair.confidence]}
          </span>
        ),
      },
      {
        title: "建议解读",
        key: "advice",
        render: (_: unknown, row: DetailRow) => (
          <div className="text-sm text-[var(--foreground)] leading-relaxed">
            {row.pair.adviceText}
            {row.pair.missingReason ? (
              <span className="block text-xs text-[var(--muted-foreground)] mt-1">
                数据备注：{row.pair.missingReason}
              </span>
            ) : null}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="border border-[color:var(--border-color)]">
      <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4">
        <p className="text-xs font-medium tracking-[0.18em] uppercase text-[var(--muted-foreground)]">
          Pair Detail
        </p>
      </div>
      <div className="valuation-table-wrap overflow-x-auto overflow-y-hidden">
        <Table<DetailRow>
          rowKey="key"
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          scroll={{ x: "max-content" }}
          className="valuation-table"
          locale={{ emptyText: "暂无两两组合" }}
        />
      </div>
    </div>
  );
}
