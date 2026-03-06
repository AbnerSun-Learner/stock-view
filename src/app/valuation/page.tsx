"use client";

import { AntdProvider } from "@/components/antd-provider";
import { ValuationNavbar } from "@/components/valuation/valuation-navbar";
import { INDEX_LIST, matchIndexFuzzy } from "@/lib/valuation";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { Input, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type PercentilePeriod = "all" | "10y" | "5y";

const NULL_PERCENTILES: Record<PercentilePeriod, null> = {
  all: null,
  "10y": null,
  "5y": null,
};

interface ValuationRow {
  symbol: string;
  name: string;
  volatility: number | null;
  pe: number | null;
  pePercentiles: Record<PercentilePeriod, number | null>;
  close: number | null;
  pb: number | null;
  pbPercentiles: Record<PercentilePeriod, number | null>;
  updateDate: string | null;
  loading: boolean;
  error: string | null;
}

function computePercentile(values: number[], current: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = sorted.filter((v) => v <= current).length;
  return Math.round((rank / values.length) * 10000) / 100;
}

/** 年化波动率：基于日收益率标准差 * sqrt(252) */
function computeAnnualVolatility(closes: number[]): number | null {
  if (closes.length < 20) return null;
  const recent = closes.slice(-252);
  const returns: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    if (recent[i - 1] > 0) returns.push(Math.log(recent[i] / recent[i - 1]));
  }
  if (returns.length < 10) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1);
  return Math.round(Math.sqrt(variance) * Math.sqrt(252) * 10000) / 100;
}

function getDateCutoff(period: PercentilePeriod): string | null {
  if (period === "all") return null;
  const now = new Date();
  now.setFullYear(now.getFullYear() - (period === "10y" ? 10 : 5));
  return now.toISOString().slice(0, 10);
}

function computeAllPercentiles(
  datedValues: { date: string; value: number }[],
  current: number
): Record<PercentilePeriod, number | null> {
  const result = {} as Record<PercentilePeriod, number | null>;
  for (const period of ["all", "10y", "5y"] as PercentilePeriod[]) {
    const cutoff = getDateCutoff(period);
    const values = cutoff
      ? datedValues.filter((d) => d.date >= cutoff).map((d) => d.value)
      : datedValues.map((d) => d.value);
    result[period] = computePercentile(values, current);
  }
  return result;
}

const PERCENTILE_PERIOD: PercentilePeriod = "10y";

export default function ValuationPage() {
  const [rows, setRows] = useState<ValuationRow[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");

  const fetchRows = useCallback(async () => {
    setRows(
      INDEX_LIST.map((item) => ({
        symbol: item.symbol,
        name: item.name,
        volatility: null,
        pe: null,
        pePercentiles: { ...NULL_PERCENTILES },
        close: null,
        pb: null,
        pbPercentiles: { ...NULL_PERCENTILES },
        updateDate: null,
        loading: true,
        error: null,
      }))
    );
    const results = await Promise.all(
      INDEX_LIST.map(async (item) => {
        try {
          const res = await fetch(
            `/api/valuation?symbol=${encodeURIComponent(item.symbol)}`,
            { cache: "no-store" }
          );
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            return {
              symbol: item.symbol,
              name: item.name,
              volatility: null,
              pe: null,
              pePercentiles: { ...NULL_PERCENTILES },
              close: null,
              pb: null,
              pbPercentiles: { ...NULL_PERCENTILES },
              updateDate: null,
              loading: false,
              error: json.error || "获取失败",
            };
          }
          const data = json.data as {
            date: string;
            value: number;
            close?: number;
            pb?: number | null;
          }[];
          const latest = json.latest as
            | {
                date: string;
                pe: number;
                close?: number;
                pb?: number | null;
              }
            | undefined;
          if (!data?.length) {
            return {
              symbol: item.symbol,
              name: item.name,
              volatility: null,
              pe: null,
              pePercentiles: { ...NULL_PERCENTILES },
              close: null,
              pb: null,
              pbPercentiles: { ...NULL_PERCENTILES },
              updateDate: null,
              loading: false,
              error: "暂无数据",
            };
          }
          const values = data.map((d) => d.value);
          const currentPe = latest?.pe ?? values[values.length - 1];
          const updateDate =
            latest?.date ?? data[data.length - 1]?.date ?? null;
          const peDatedValues = data.map((d) => ({
            date: d.date,
            value: d.value,
          }));
          const pePercentiles = computeAllPercentiles(peDatedValues, currentPe);
          const pbDatedValues = data
            .filter(
              (d): d is typeof d & { pb: number } =>
                typeof d.pb === "number" && d.pb > 0
            )
            .map((d) => ({ date: d.date, value: d.pb }));
          const currentPb =
            latest?.pb != null
              ? typeof latest.pb === "number"
                ? latest.pb
                : null
              : pbDatedValues.length
              ? pbDatedValues[pbDatedValues.length - 1].value
              : null;
          const pbPercentiles =
            currentPb != null
              ? computeAllPercentiles(pbDatedValues, currentPb)
              : { ...NULL_PERCENTILES };
          const closes = data
            .map((d) => d.close)
            .filter((c): c is number => typeof c === "number");
          const currentClose =
            typeof latest?.close === "number"
              ? latest.close
              : closes.length
              ? closes[closes.length - 1]
              : null;
          const volatility = computeAnnualVolatility(closes);
          return {
            symbol: item.symbol,
            name: item.name,
            volatility,
            pe: currentPe,
            pePercentiles,
            close: currentClose,
            pb: currentPb,
            pbPercentiles,
            updateDate,
            loading: false,
            error: null,
          };
        } catch {
          return {
            symbol: item.symbol,
            name: item.name,
            volatility: null,
            pe: null,
            pePercentiles: { ...NULL_PERCENTILES },
            close: null,
            pb: null,
            pbPercentiles: { ...NULL_PERCENTILES },
            updateDate: null,
            loading: false,
            error: "网络异常",
          };
        }
      })
    );
    setRows(results);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      fetchRows();
    });
    return () => cancelAnimationFrame(id);
  }, [fetchRows]);

  const filteredRows = useMemo(
    () =>
      appliedKeyword.trim()
        ? rows.filter((r) => matchIndexFuzzy(appliedKeyword, r.name, r.symbol))
        : rows,
    [rows, appliedKeyword]
  );

  const columns: ColumnsType<ValuationRow> = useMemo(
    () => [
      {
        title: "指数名称",
        dataIndex: "name",
        key: "name",
        render: (_: string, r: ValuationRow) => (
          <div>
            <span className="font-medium text-[var(--foreground)]">
              {r.name}
            </span>
            {r.updateDate && (
              <span className="block text-xs text-[var(--muted-foreground)] mt-0.5">
                数据更新：{r.updateDate}
              </span>
            )}
          </div>
        ),
      },
      {
        title: "代码",
        dataIndex: "symbol",
        key: "symbol",
        className: "font-mono text-[var(--foreground)]",
      },
      {
        title: "收盘点位",
        key: "close",
        align: "right",
        className: "font-mono text-[var(--foreground)]",
        render: (_: unknown, r: ValuationRow) =>
          r.loading
            ? "…"
            : r.error
              ? "—"
              : r.close != null
                ? r.close.toFixed(2)
                : "—",
      },
      {
        title: "市盈率",
        key: "pe",
        align: "right",
        className: "font-mono text-[var(--foreground)]",
        render: (_: unknown, r: ValuationRow) =>
          r.loading
            ? "…"
            : r.error
            ? "—"
            : r.pe != null
            ? r.pe.toFixed(2)
            : "—",
      },
      {
        title: (
          <span className="inline-flex items-center gap-1">
            市盈率分位
            <Tooltip title="当前百分位使用的时间期限是十年">
              <QuestionCircleOutlined className="text-[var(--muted-foreground)] text-xs cursor-help" />
            </Tooltip>
          </span>
        ),
        key: "pePercentile",
        align: "right",
        className: "font-mono text-[var(--foreground)]",
        render: (_: unknown, r: ValuationRow) =>
          r.loading
            ? "…"
            : r.error
            ? "—"
            : r.pePercentiles[PERCENTILE_PERIOD] != null
            ? `${r.pePercentiles[PERCENTILE_PERIOD]}%`
            : "—",
      },
      {
        title: "市净率",
        key: "pb",
        align: "right",
        className: "font-mono text-[var(--foreground)]",
        render: (_: unknown, r: ValuationRow) =>
          r.loading
            ? "…"
            : r.error
            ? "—"
            : r.pb != null
            ? r.pb.toFixed(2)
            : "—",
      },
      {
        title: (
          <span className="inline-flex items-center gap-1">
            市净率分位
            <Tooltip title="当前百分位使用的时间期限是十年">
              <QuestionCircleOutlined className="text-[var(--muted-foreground)] text-xs cursor-help" />
            </Tooltip>
          </span>
        ),
        key: "pbPercentile",
        align: "right",
        className: "font-mono text-[var(--foreground)]",
        render: (_: unknown, r: ValuationRow) =>
          r.loading
            ? "…"
            : r.error
            ? "—"
            : r.pbPercentiles[PERCENTILE_PERIOD] != null
            ? `${r.pbPercentiles[PERCENTILE_PERIOD]}%`
            : "—",
      },
      {
        title: "详细分析",
        key: "action",
        align: "center",
        render: (_: unknown, r: ValuationRow) => (
          <Link
            href={`/valuation/${r.symbol}`}
            className="text-[var(--brand)] underline hover:opacity-80 cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)] rounded-sm"
          >
            估值分析
          </Link>
        ),
      },
    ],
    []
  );

  return (
    <AntdProvider>
      <div className="min-h-screen bg-[var(--page-bg)] text-[var(--foreground)]">
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-slate-200/10 dark:bg-slate-800/10 rounded-full blur-[100px]" />
        </div>

        <ValuationNavbar />

        <div className="pt-[4.5rem]">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight text-[var(--foreground)] mb-3">
                指数估值
              </h1>
              <p className="text-lg text-[var(--muted-foreground)] leading-relaxed font-light max-w-2xl mx-auto">
                以十年中值为锚，历史高低为界。分位为 10 年历史 PE/PB 的百分位。
              </p>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
              <Input
                placeholder="搜索指数名称或代码"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onPressEnter={() => setAppliedKeyword(searchInput)}
                allowClear
                className="max-w-[260px] valuation-search-input"
                style={{ borderRadius: 4 }}
              />
              <button
                type="button"
                onClick={() => setAppliedKeyword(searchInput)}
                className="min-w-[72px] h-8 px-4 rounded-[4px] bg-[var(--brand)] text-white text-sm font-medium hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              >
                搜索
              </button>
            </div>

            <div className="rounded-xl border border-[color:var(--border-color)] bg-[var(--card-bg-elevated)] overflow-hidden">
              <div className="valuation-table-wrap overflow-x-auto overflow-y-hidden">
                <Table<ValuationRow>
                  rowKey="symbol"
                  columns={columns}
                  dataSource={filteredRows}
                  pagination={false}
                  scroll={{ x: "max-content" }}
                  locale={{
                    emptyText: rows.some((r) => r.loading)
                      ? "加载中…"
                      : appliedKeyword.trim()
                      ? "未匹配到相关指数"
                      : "暂无指数数据",
                  }}
                  className="valuation-table"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AntdProvider>
  );
}
