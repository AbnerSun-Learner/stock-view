"use client";

import { AntdProvider } from "@/components/antd-provider";
import { CorrelationNavbar } from "@/components/correlation/correlation-navbar";
import {
  LazyPairPerformanceChart,
  LazyPairRollingChart,
} from "@/components/correlation/lazy-pair-charts";
import { PairCompareTable } from "@/components/correlation/pair-compare-table";
import { PairInputCard } from "@/components/correlation/pair-input-card";
import { PairResultCard } from "@/components/correlation/pair-result-card";
import {
  SkeletonChart,
  SkeletonResultCard,
  SkeletonTable,
} from "@/components/correlation/pair-skeleton";
import type { PairCorrelationData } from "@/lib/correlation/pair-correlation-types";
import { getPeriodLabel } from "@/lib/correlation/pair-correlation-types";
import type { CorrelationPeriod } from "@/types/correlation";
import { Alert, App, Segmented } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";

function isAbortError(e: unknown): boolean {
  if (e instanceof DOMException && e.name === "AbortError") return true;
  if (e instanceof Error && e.name === "AbortError") return true;
  return false;
}

const PERIOD_OPTIONS: { label: string; value: CorrelationPeriod }[] = [
  { label: "1Y", value: "1y" },
  { label: "3Y", value: "3y" },
  { label: "5Y", value: "5y" },
  { label: "10Y", value: "10y" },
  { label: "全部", value: "max" },
];

function CorrelationPageBody() {
  const { message: messageApi } = App.useApp();
  const messageRef = useRef(messageApi);
  useEffect(() => {
    messageRef.current = messageApi;
  }, [messageApi]);

  const pairFetchInflightRef = useRef(0);
  const pairFetchAbortRef = useRef<AbortController | null>(null);

  const [codeA, setCodeA] = useState("");
  const [codeB, setCodeB] = useState("");
  const [period, setPeriod] = useState<CorrelationPeriod>("1y");
  const [data, setData] = useState<PairCorrelationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionPair, setSessionPair] = useState<{
    a: string;
    b: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      pairFetchInflightRef.current += 1;
      pairFetchAbortRef.current?.abort();
    };
  }, []);

  const fetchPairData = useCallback(
    async ({
      a,
      b,
      p,
      preserveOnError,
    }: {
      a: string;
      b: string;
      p: CorrelationPeriod;
      preserveOnError?: boolean;
    }) => {
      const requestId = ++pairFetchInflightRef.current;
      pairFetchAbortRef.current?.abort();
      const ac = new AbortController();
      pairFetchAbortRef.current = ac;

      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ a, b, period: p });
        const res = await fetch(`/api/correlation/pair?${params.toString()}`, {
          signal: ac.signal,
        });
        if (requestId !== pairFetchInflightRef.current) return;

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error || `请求失败 (${res.status})`);
        }
        const json = (await res.json()) as PairCorrelationData;
        if (requestId !== pairFetchInflightRef.current) return;
        setData(json);
      } catch (e) {
        if (requestId !== pairFetchInflightRef.current) return;
        if (isAbortError(e)) return;
        const msg = e instanceof Error ? e.message : "未知错误";
        setError(msg);
        messageRef.current.error(msg);
        if (!preserveOnError) setData(null);
      } finally {
        if (requestId === pairFetchInflightRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  const handleSubmit = useCallback(
    (nextA: string, nextB: string) => {
      if (!nextA || !nextB) {
        messageRef.current.warning("请输入两只 ETF 代码");
        return;
      }
      if (nextA === nextB) {
        messageRef.current.warning("两只 ETF 不能相同");
        return;
      }
      if (!/^\d{6}$/.test(nextA) || !/^\d{6}$/.test(nextB)) {
        messageRef.current.warning("ETF 代码需为 6 位数字");
        return;
      }
      setCodeA(nextA);
      setCodeB(nextB);
      setSessionPair({ a: nextA, b: nextB });
      setData(null);
      fetchPairData({ a: nextA, b: nextB, p: period, preserveOnError: false });
    },
    [period, fetchPairData]
  );

  const handlePeriodChange = useCallback(
    (next: CorrelationPeriod) => {
      if (!sessionPair) return;
      setPeriod(next);
      fetchPairData({
        a: sessionPair.a,
        b: sessionPair.b,
        p: next,
        preserveOnError: true,
      });
    },
    [sessionPair, fetchPairData]
  );

  const periodLabel = getPeriodLabel(period);
  /** 仅在首次发起分析尚无结果时占位，刷新时间窗口时保留上一版内容与卡片 */
  const showLoadingBlocks = sessionPair !== null && loading && data === null;
  const showCharts = data !== null;

  return (
    <div className="correlation-page min-h-screen text-[var(--foreground)]">
      <CorrelationNavbar surface="correlation" />

      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-8 md:px-16 py-16 space-y-12">
          <header>
            <p className="correlation-eyebrow text-xs font-semibold tracking-[0.2em] uppercase mb-4">
              ETF Correlation
            </p>
            <h1 className="text-4xl md:text-5xl font-light tracking-[-0.02em] text-[var(--foreground)] mb-4">
              ETF 相关性
            </h1>
            <p
              className="text-base text-[var(--muted-foreground)] leading-[1.8] max-w-xl"
              style={{ letterSpacing: "0.02em" }}
            >
              结合走势同向性与底层成分重叠，看清持仓的真实分散度，找出可能被忽略的重复风险。
            </p>
          </header>

          {showCharts ? (
            <section className="flex flex-row justify-end items-center gap-4 pb-6 correlation-results-rule overflow-x-auto correlation-period-toolbar">
              <Segmented<CorrelationPeriod>
                value={period}
                onChange={(v) => handlePeriodChange(v)}
                options={PERIOD_OPTIONS}
                className={`correlation-segmented shrink-0${
                  loading ? " opacity-70" : ""
                }`}
                disabled={loading}
              />
            </section>
          ) : null}

          {error && sessionPair ? (
            <Alert
              title="分析失败"
              description={error}
              type="error"
              showIcon
              action={
                <button
                  type="button"
                  onClick={() =>
                    fetchPairData({
                      a: sessionPair.a,
                      b: sessionPair.b,
                      p: period,
                      preserveOnError: false,
                    })
                  }
                  className="text-xs px-3 py-1 bg-[var(--correlation-brand)] text-[var(--correlation-on-brand)] hover:opacity-70 transition-opacity"
                >
                  重试
                </button>
              }
              className="correlation-card border border-[color:var(--border-color)]"
            />
          ) : null}

          <section className="grid grid-cols-12 gap-6 lg:items-start">
            <aside className="col-span-12 lg:col-span-4 space-y-6">
              <PairInputCard
                loading={loading}
                currentA={codeA}
                currentB={codeB}
                onSubmit={handleSubmit}
              />
              {showLoadingBlocks ? <SkeletonResultCard /> : null}
              {data ? (
                <PairResultCard data={data} periodLabel={periodLabel} />
              ) : null}
            </aside>

            <main className="col-span-12 lg:col-span-8 space-y-6">
              {showLoadingBlocks ? (
                <>
                  <SkeletonChart />
                  <SkeletonChart />
                  <SkeletonTable />
                </>
              ) : showCharts ? (
                <>
                  <LazyPairPerformanceChart
                    data={data}
                    periodLabel={periodLabel}
                  />
                  <LazyPairRollingChart data={data} />
                  <PairCompareTable data={data} />
                </>
              ) : null}
            </main>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function CorrelationPage() {
  return (
    <AntdProvider>
      <CorrelationPageBody />
    </AntdProvider>
  );
}
