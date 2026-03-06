"use client";

import { AntdProvider } from "@/components/antd-provider";
import { ValuationNavbar } from "@/components/valuation/valuation-navbar";
import { INDEX_LIST, matchIndexFuzzy } from "@/lib/valuation";
import { QuestionCircleOutlined } from "@ant-design/icons";
import { Input, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type PercentilePeriod = "all" | "10y" | "5y"

const NULL_PERCENTILES: Record<PercentilePeriod, null> = { all: null, "10y": null, "5y": null }

interface ValuationRow {
  symbol: string;
  name: string;
  volatility: number | null;
  pe: number | null;
  pePercentiles: Record<PercentilePeriod, number | null>;
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
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1);
  return Math.round(Math.sqrt(variance) * Math.sqrt(252) * 10000) / 100;
}

function getDateCutoff(period: PercentilePeriod): string | null {
  if (period === "all") return null
  const now = new Date()
  now.setFullYear(now.getFullYear() - (period === "10y" ? 10 : 5))
  return now.toISOString().slice(0, 10)
}

function computeAllPercentiles(
  datedValues: { date: string; value: number }[],
  current: number
): Record<PercentilePeriod, number | null> {
  const result = {} as Record<PercentilePeriod, number | null>
  for (const period of ["all", "10y", "5y"] as PercentilePeriod[]) {
    const cutoff = getDateCutoff(period)
    const values = cutoff
      ? datedValues.filter((d) => d.date >= cutoff).map((d) => d.value)
      : datedValues.map((d) => d.value)
    result[period] = computePercentile(values, current)
  }
  return result
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
            `/api/valuation?symbol=${encodeURIComponent(item.symbol)}`
          );
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            return {
              symbol: item.symbol,
              name: item.name,
              volatility: null,
              pe: null,
              pePercentiles: { ...NULL_PERCENTILES },
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
          const latest = json.latest as {
            date: string;
            pe: number;
            close?: number;
            pb?: number | null;
          } | undefined;
          if (!data?.length) {
            return {
              symbol: item.symbol,
              name: item.name,
              volatility: null,
              pe: null,
              pePercentiles: { ...NULL_PERCENTILES },
              pb: null,
              pbPercentiles: { ...NULL_PERCENTILES },
              updateDate: null,
              loading: false,
              error: "暂无数据",
            };
          }
          const values = data.map((d) => d.value);
          const currentPe = latest?.pe ?? values[values.length - 1];
          const updateDate = latest?.date ?? data[data.length - 1]?.date ?? null;
          const peDatedValues = data.map((d) => ({ date: d.date, value: d.value }));
          const pePercentiles = computeAllPercentiles(peDatedValues, currentPe);
          const pbDatedValues = data
            .filter((d): d is typeof d & { pb: number } => typeof d.pb === "number" && d.pb > 0)
            .map((d) => ({ date: d.date, value: d.pb }));
          const currentPb = latest?.pb != null
            ? (typeof latest.pb === "number" ? latest.pb : null)
            : pbDatedValues.length ? pbDatedValues[pbDatedValues.length - 1].value : null;
          const pbPercentiles =
            currentPb != null
              ? computeAllPercentiles(pbDatedValues, currentPb)
              : { ...NULL_PERCENTILES };
          const closes = data
            .map((d) => d.close)
            .filter((c): c is number => typeof c === "number");
          const volatility = computeAnnualVolatility(closes);
          return {
            symbol: item.symbol,
            name: item.name,
            volatility,
            pe: currentPe,
            pePercentiles,
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
    fetchRows();
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
            <span className="font-medium text-zinc-900">{r.name}</span>
            {r.updateDate && (
              <span className="block text-xs text-zinc-500 mt-0.5">
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
        className: "font-mono text-zinc-700",
      },
      {
        title: "市盈率",
        key: "pe",
        align: "right",
        className: "font-mono text-zinc-700",
        render: (_: unknown, r: ValuationRow) =>
          r.loading ? "…" : r.error ? "—" : r.pe != null ? r.pe.toFixed(2) : "—",
      },
      {
        title: (
          <span className="inline-flex items-center gap-1">
            市盈率分位(10年)
            <Tooltip title="当前百分位使用的时间期限是十年">
              <QuestionCircleOutlined className="text-zinc-400 text-xs cursor-help" />
            </Tooltip>
          </span>
        ),
        key: "pePercentile",
        align: "right",
        className: "font-mono text-zinc-700",
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
        className: "font-mono text-zinc-700",
        render: (_: unknown, r: ValuationRow) =>
          r.loading ? "…" : r.error ? "—" : r.pb != null ? r.pb.toFixed(2) : "—",
      },
      {
        title: (
          <span className="inline-flex items-center gap-1">
            市净率分位(10年)
            <Tooltip title="当前百分位使用的时间期限是十年">
              <QuestionCircleOutlined className="text-zinc-400 text-xs cursor-help" />
            </Tooltip>
          </span>
        ),
        key: "pbPercentile",
        align: "right",
        className: "font-mono text-zinc-700",
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
            className="text-[#243B53] underline hover:text-[#243B53]/80 cursor-pointer font-medium"
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
      <div className="min-h-screen transition-colors duration-500 bg-[#F0F4F8] text-[#243B53]">
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-slate-200/20 rounded-full blur-[140px]" />
          <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-slate-200/30 rounded-full blur-[100px]" />
        </div>

        <ValuationNavbar />

        <div className="pt-20">
          <div className="max-w-[1400px] mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-serif font-medium leading-tight mb-3 tracking-tight">
                指数估值
              </h1>
              <p className="text-lg opacity-70 leading-relaxed font-light max-w-2xl mx-auto">
                以十年中值为锚，历史高低为界，看清当前估值所处区间
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="border-b border-slate-200/80 px-6 py-4 flex flex-wrap items-center justify-end gap-4">
                <Input.Search
                  placeholder="搜索指数名称或代码"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onSearch={() => setAppliedKeyword(searchInput)}
                  onPressEnter={() => setAppliedKeyword(searchInput)}
                  allowClear
                  className="max-w-[280px]"
                  style={{ borderRadius: 8 }}
                />
                <button
                  type="button"
                  onClick={() => setAppliedKeyword(searchInput)}
                  className="h-9 px-4 rounded-lg bg-[#243B53] text-white text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-transform"
                >
                  搜索
                </button>
              </div>

              <Table<ValuationRow>
                rowKey="symbol"
                columns={columns}
                dataSource={filteredRows}
                pagination={false}
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
    </AntdProvider>
  );
}
