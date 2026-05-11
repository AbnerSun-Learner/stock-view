"use client";

import type { PairResult } from "@/types/correlation";
import { Tooltip } from "antd";
import { useMemo } from "react";

interface CorrelationMatrixProps {
  codes: string[];
  pairs: PairResult[];
}

interface MatrixCell {
  status: "self" | PairResult["status"];
  pair: PairResult | null;
  displayValue: string;
  /** 用于背景着色：0-1 之间或 null 表示无填充 */
  shade: number | null;
}

function buildMatrix(codes: string[], pairs: PairResult[]): MatrixCell[][] {
  const map = new Map<string, PairResult>();
  for (const p of pairs) {
    const [a, b] = p.pair;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    map.set(key, p);
  }

  return codes.map((row) =>
    codes.map<MatrixCell>((col) => {
      if (row === col) {
        return { status: "self", pair: null, displayValue: "—", shade: null };
      }
      const key = row < col ? `${row}|${col}` : `${col}|${row}`;
      const p = map.get(key);
      if (!p) {
        return {
          status: "unavailable",
          pair: null,
          displayValue: "—",
          shade: null,
        };
      }
      if (p.status === "complete" && p.finalScore !== null) {
        return {
          status: p.status,
          pair: p,
          displayValue: p.finalScore.toFixed(2),
          shade: p.finalScore,
        };
      }
      if (p.status === "partial" && p.partialScore !== null) {
        return {
          status: p.status,
          pair: p,
          displayValue: `(${p.partialScore.toFixed(2)})`,
          shade: null,
        };
      }
      return {
        status: "unavailable",
        pair: p,
        displayValue: "—",
        shade: null,
      };
    })
  );
}

function pairTooltipText(pair: PairResult, row: string, col: string): string {
  const a = pair.signals.return.score;
  const b = pair.signals.holding.score;
  const aText = a !== null ? a.toFixed(2) : "—";
  const bText = b !== null ? b.toFixed(2) : "—";
  const head = `${row} ↔ ${col}`;
  if (pair.status === "complete" && pair.finalScore !== null) {
    return `${head}\n综合对比分 ${pair.finalScore.toFixed(
      2
    )} · A 走势 ${aText} · B 成分 ${bText}\n${pair.adviceText}`;
  }
  if (pair.status === "partial" && pair.partialScore !== null) {
    return `${head}\nA 走势 ${aText} · B 成分 ${bText}\n${pair.adviceText}`;
  }
  return `${head}\n${pair.adviceText}${
    pair.missingReason ? `（${pair.missingReason}）` : ""
  }`;
}

export function CorrelationMatrix({ codes, pairs }: CorrelationMatrixProps) {
  const matrix = useMemo(() => buildMatrix(codes, pairs), [codes, pairs]);

  if (codes.length < 2) return null;

  return (
    <div className="border border-[color:var(--border-color)] p-6 md:p-8">
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs font-medium tracking-[0.18em] uppercase text-[var(--muted-foreground)]">
          Pairwise Matrix
        </p>
        <p className="text-[11px] text-[var(--muted-foreground)]">
          深色 = 重复度更高 · ( ) = 仅部分信号 · — = 不可用
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="correlation-matrix-table">
          <thead>
            <tr>
              <th className="correlation-matrix-corner" />
              {codes.map((c) => (
                <th key={c} className="correlation-matrix-head">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {codes.map((row, i) => (
              <tr key={row}>
                <th className="correlation-matrix-row-head">{row}</th>
                {matrix[i].map((cell, j) => {
                  const col = codes[j];
                  const isSelf = cell.status === "self";
                  const fill =
                    cell.shade !== null
                      ? `rgba(var(--correlation-fill-rgb), ${Math.max(
                          0.04,
                          cell.shade * 0.32
                        )})`
                      : "transparent";
                  const labelEl = (
                    <span className="font-mono tabular-nums text-sm">
                      {cell.displayValue}
                    </span>
                  );
                  const inner = cell.pair ? (
                    <Tooltip
                      title={
                        <div style={{ whiteSpace: "pre-line", maxWidth: 280 }}>
                          {pairTooltipText(cell.pair, row, col)}
                        </div>
                      }
                    >
                      {labelEl}
                    </Tooltip>
                  ) : (
                    labelEl
                  );
                  return (
                    <td
                      key={col}
                      className={`correlation-matrix-cell ${
                        isSelf ? "is-self" : ""
                      } status-${cell.status}`}
                      style={{ backgroundColor: fill }}
                    >
                      {inner}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
