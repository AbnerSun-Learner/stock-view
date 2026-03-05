"use client";

import { ValuationNavbar } from "@/components/valuation/valuation-navbar";
import { INDEX_LIST, matchIndexFuzzy } from "@/lib/valuation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type PercentilePeriod = "all" | "10y" | "5y"

const PERIOD_SUFFIX: Record<PercentilePeriod, string> = {
  all: "",
  "5y": "(5年)",
  "10y": "(10年)",
}

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

export default function ValuationPage() {
  const [rows, setRows] = useState<ValuationRow[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [percentilePeriod, setPercentilePeriod] = useState<PercentilePeriod>("10y");
  const [openDropdown, setOpenDropdown] = useState<"pe" | "pb" | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openDropdown) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [openDropdown])

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

  const filteredRows = appliedKeyword.trim()
    ? rows.filter((r) => matchIndexFuzzy(appliedKeyword, r.name, r.symbol))
    : rows;

  return (
    <div className="min-h-screen transition-colors duration-500 bg-[#F0F4F8] text-[#243B53]">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-slate-200/20 rounded-full blur-[140px]" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-slate-200/30 rounded-full blur-[100px]" />
      </div>

      <ValuationNavbar />

      <div className="pt-20">
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900 mb-2">
              指数估值
            </h1>
            <p className="text-base text-zinc-600 leading-relaxed max-w-2xl">
              以十年中值为锚，历史高低为界，看清当前估值所处区间
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="border-b border-slate-200/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
              <span className="text-sm text-zinc-500 font-medium">
                开盘期间显示上一交易日数据，收盘后显示当日数据
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="search"
                  placeholder="搜索指数名称或代码"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setAppliedKeyword(searchInput);
                  }}
                  className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 min-w-[200px]"
                />
                <button
                  type="button"
                  onClick={() => setAppliedKeyword(searchInput)}
                  className="h-9 px-4 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 active:scale-[0.98] transition-transform"
                >
                  搜索
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="text-left py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      指数名称
                    </th>
                    <th className="text-left py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      代码
                    </th>
                    <th className="text-right py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      市盈率
                    </th>
                    <th className="text-right py-3.5 px-6 relative">
                      <div ref={openDropdown === "pe" ? dropdownRef : undefined}>
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(openDropdown === "pe" ? null : "pe")}
                          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-600 hover:text-zinc-900 transition-colors"
                        >
                          市盈率分位{PERIOD_SUFFIX[percentilePeriod]}
                          <svg className={`w-3 h-3 transition-transform ${openDropdown === "pe" ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="currentColor">
                            <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          </svg>
                        </button>
                        {openDropdown === "pe" && (
                          <div className="absolute right-4 top-full mt-1 z-20 min-w-[140px] rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                            {(["all", "5y", "10y"] as PercentilePeriod[]).map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => { setPercentilePeriod(p); setOpenDropdown(null) }}
                                className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between ${
                                  percentilePeriod === p
                                    ? "text-zinc-900 font-semibold bg-slate-50"
                                    : "text-zinc-600 hover:bg-slate-50"
                                }`}
                              >
                                市盈率分位{PERIOD_SUFFIX[p]}
                                {percentilePeriod === p && (
                                  <svg className="w-3 h-3 text-zinc-900" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2 6l3 3 5-5" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </th>
                    <th className="text-right py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      市净率
                    </th>
                    <th className="text-right py-3.5 px-6 relative">
                      <div ref={openDropdown === "pb" ? dropdownRef : undefined}>
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(openDropdown === "pb" ? null : "pb")}
                          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-600 hover:text-zinc-900 transition-colors"
                        >
                          市净率分位{PERIOD_SUFFIX[percentilePeriod]}
                          <svg className={`w-3 h-3 transition-transform ${openDropdown === "pb" ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="currentColor">
                            <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          </svg>
                        </button>
                        {openDropdown === "pb" && (
                          <div className="absolute right-4 top-full mt-1 z-20 min-w-[140px] rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                            {(["all", "5y", "10y"] as PercentilePeriod[]).map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => { setPercentilePeriod(p); setOpenDropdown(null) }}
                                className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between ${
                                  percentilePeriod === p
                                    ? "text-zinc-900 font-semibold bg-slate-50"
                                    : "text-zinc-600 hover:bg-slate-50"
                                }`}
                              >
                                市净率分位{PERIOD_SUFFIX[p]}
                                {percentilePeriod === p && (
                                  <svg className="w-3 h-3 text-zinc-900" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2 6l3 3 5-5" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </th>
                    <th className="text-center py-3.5 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      详细分析
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-16 text-center text-zinc-500 text-sm"
                      >
                        {rows.some((r) => r.loading)
                          ? "加载中…"
                          : appliedKeyword.trim()
                            ? "未匹配到相关指数"
                            : "暂无指数数据"}
                      </td>
                    </tr>
                  )}
                  {filteredRows.map((row) => (
                    <tr
                      key={row.symbol}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-3.5 px-6 text-sm">
                        <span className="font-medium text-zinc-900">
                          {row.name}
                        </span>
                        {row.updateDate && (
                          <span className="block text-xs text-zinc-500 mt-0.5">
                            数据更新：{row.updateDate}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-sm font-mono text-zinc-700">
                        {row.symbol}
                      </td>
                      <td className="py-3.5 px-6 text-sm font-mono text-right text-zinc-700">
                        {row.loading
                          ? "…"
                          : row.error
                            ? "—"
                            : row.pe != null
                              ? row.pe.toFixed(2)
                              : "—"}
                      </td>
                      <td className="py-3.5 px-6 text-sm font-mono text-right text-zinc-700">
                        {row.loading
                          ? "…"
                          : row.error
                            ? "—"
                            : row.pePercentiles[percentilePeriod] != null
                              ? `${row.pePercentiles[percentilePeriod]}%`
                              : "—"}
                      </td>
                      <td className="py-3.5 px-6 text-sm font-mono text-right text-zinc-700">
                        {row.loading
                          ? "…"
                          : row.error
                            ? "—"
                            : row.pb != null
                              ? row.pb.toFixed(2)
                              : "—"}
                      </td>
                      <td className="py-3.5 px-6 text-sm font-mono text-right text-zinc-700">
                        {row.loading
                          ? "…"
                          : row.error
                            ? "—"
                            : row.pbPercentiles[percentilePeriod] != null
                              ? `${row.pbPercentiles[percentilePeriod]}%`
                              : "—"}
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <Link
                          href={`/valuation/${row.symbol}`}
                          className="inline-block px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 active:scale-[0.98] transition-transform"
                        >
                          估值分析
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
