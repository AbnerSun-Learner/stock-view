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
import { normalizeEtfCode } from "@/lib/correlation/etf-code";
import type { PairCorrelationData } from "@/lib/correlation/pair-correlation-types";
import { getPeriodLabel } from "@/lib/correlation/pair-correlation-types";
import type { CorrelationPeriod } from "@/types/correlation";
import { Alert, App, Segmented } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

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

function parsePeriodParam(raw: string | null): CorrelationPeriod {
  if (
    raw &&
    (PERIOD_OPTIONS as { value: CorrelationPeriod }[]).some(
      (x) => x.value === raw
    )
  ) {
    return raw as CorrelationPeriod;
  }
  return "1y";
}

/** 解析 URL：`/correlation?a=510300&b=159915&period=1y`，与 `/api/correlation/pair` 参数一致 */
function correlationQueryFromSearchParams(searchParams: URLSearchParams): {
  aNorm: ReturnType<typeof normalizeEtfCode>;
  bNorm: ReturnType<typeof normalizeEtfCode>;
  period: CorrelationPeriod;
} {
  const aNorm = normalizeEtfCode(searchParams.get("a") ?? "");
  const bNorm = normalizeEtfCode(searchParams.get("b") ?? "");
  const period = parsePeriodParam(searchParams.get("period"));
  return { aNorm, bNorm, period };
}

function samePairParamsInUrl(
  searchParams: URLSearchParams,
  codeA_: string,
  codeB_: string,
  period_: CorrelationPeriod
): boolean {
  const {
    aNorm,
    bNorm,
    period: periodUrl,
  } = correlationQueryFromSearchParams(searchParams);
  if (
    !(
      aNorm.valid &&
      bNorm.valid &&
      aNorm.code &&
      bNorm.code &&
      aNorm.code !== bNorm.code
    )
  ) {
    return false;
  }
  return (
    aNorm.code === codeA_ && bNorm.code === codeB_ && periodUrl === period_
  );
}

function PairPageSuspenseFallback() {
  return (
    <div className="correlation-page min-h-screen flex items-center justify-center text-[var(--muted-foreground)] text-sm tracking-wide">
      载入中…
    </div>
  );
}

function CorrelationPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  const { message: messageApi } = App.useApp();
  const messageRef = useRef(messageApi);
  useEffect(() => {
    messageRef.current = messageApi;
  }, [messageApi]);

  const pairFetchInflightRef = useRef(0);
  const pairFetchAbortRef = useRef<AbortController | null>(null);
  const dataRef = useRef<PairCorrelationData | null>(null);
  const urlPairKeyRef = useRef<string | null>(null);

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
    dataRef.current = data;
  }, [data]);

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

  /** URL ?a=&b=&period=：回填、维护 session，并在 query 变化时拉数 */
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- Next searchParams → 表单与拉数单次对齐 */
    const {
      aNorm,
      bNorm,
      period: pFromQs,
    } = correlationQueryFromSearchParams(searchParams);
    setPeriod(pFromQs);
    if (aNorm.valid && aNorm.code) setCodeA(aNorm.code);
    if (bNorm.valid && bNorm.code) setCodeB(bNorm.code);

    const validPair =
      aNorm.valid &&
      bNorm.valid &&
      aNorm.code &&
      bNorm.code &&
      aNorm.code !== bNorm.code;

    if (!validPair) {
      setSessionPair(null);
      setData(null);
      urlPairKeyRef.current = null;
      return;
    }

    const codeAStr = aNorm.code!;
    const codeBStr = bNorm.code!;

    setSessionPair({ a: codeAStr, b: codeBStr });

    const pairKey = `${codeAStr}|${codeBStr}`;
    const preserveOnError =
      urlPairKeyRef.current === pairKey && dataRef.current !== null;
    urlPairKeyRef.current = pairKey;

    fetchPairData({
      a: codeAStr,
      b: codeBStr,
      p: pFromQs,
      preserveOnError,
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [searchKey, fetchPairData, searchParams]);

  const pushPairQuery = useCallback(
    (a: string, b: string, p: CorrelationPeriod) => {
      const qs = new URLSearchParams({ a, b, period: p });
      router.replace(`${pathname}?${qs.toString()}`, { scroll: false });
    },
    [pathname, router]
  );

  const handleSubmit = useCallback(
    (nextA: string, nextB: string) => {
      const a = nextA.trim();
      const b = nextB.trim();
      if (!a || !b) {
        messageRef.current.warning("请输入两只 ETF 代码");
        return;
      }
      if (a === b) {
        messageRef.current.warning("两只 ETF 不能相同");
        return;
      }
      if (!/^\d{6}$/.test(a) || !/^\d{6}$/.test(b)) {
        messageRef.current.warning("ETF 代码需为 6 位数字");
        return;
      }
      if (samePairParamsInUrl(searchParams, a, b, period)) {
        fetchPairData({ a, b, p: period, preserveOnError: false });
        return;
      }
      setData(null);
      setError(null);
      pushPairQuery(a, b, period);
    },
    [period, pushPairQuery, fetchPairData, searchParams]
  );

  const handlePeriodChange = useCallback(
    (next: CorrelationPeriod) => {
      if (!sessionPair) return;
      pushPairQuery(sessionPair.a, sessionPair.b, next);
    },
    [sessionPair, pushPairQuery]
  );

  const periodLabel = getPeriodLabel(period);
  /** 仅在首次发起对比尚无结果时占位，刷新时间窗口时保留上一版内容与卡片 */
  const showLoadingBlocks = sessionPair !== null && loading && data === null;
  const showCharts = data !== null;

  return (
    <div className="correlation-page min-h-screen text-[var(--foreground)]">
      <CorrelationNavbar surface="correlation" />

      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-8 md:px-16 py-16 space-y-12">
          <header>
            <p className="correlation-eyebrow text-xs font-semibold tracking-[0.2em] uppercase mb-4">
              Index Comparison
            </p>
            <h1 className="text-4xl md:text-5xl font-light tracking-[-0.02em] text-[var(--foreground)] mb-4">
              指数对比
            </h1>
            <p
              className="text-base text-[var(--muted-foreground)] leading-[1.8] max-w-xl"
              style={{ letterSpacing: "0.02em" }}
            >
              结合净值涨跌联动与底层成分重叠，看清两只指数基金标的的真实重合度与分散度。
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
              title="对比失败"
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
      <Suspense fallback={<PairPageSuspenseFallback />}>
        <CorrelationPageContent />
      </Suspense>
    </AntdProvider>
  );
}
