"use client";

import { AntdProvider } from "@/components/antd-provider";
import { CorrelationDetailTable } from "@/components/correlation/correlation-detail-table";
import { CorrelationInputForm } from "@/components/correlation/correlation-input-form";
import { CorrelationMatrix } from "@/components/correlation/correlation-matrix";
import { CorrelationMissingSection } from "@/components/correlation/correlation-missing-section";
import { CorrelationNavbar } from "@/components/correlation/correlation-navbar";
import { CorrelationSummaryCard } from "@/components/correlation/correlation-summary-card";
import type {
  CorrelationApiError,
  CorrelationApiResponse,
  CorrelationPeriod,
} from "@/types/correlation";
import { message } from "antd";
import { useCallback, useState } from "react";

export default function CorrelationPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CorrelationApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (codes: string, period: CorrelationPeriod) => {
      const trimmed = codes.trim();
      if (!trimmed) {
        message.warning("请先输入 ETF 代码");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const url = `/api/correlation?codes=${encodeURIComponent(
          trimmed
        )}&period=${period}`;
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as
          | CorrelationApiResponse
          | CorrelationApiError;
        if (!res.ok) {
          const errResp = json as CorrelationApiError;
          const text = errResp?.error || "分析失败，请稍后再试";
          setError(text);
          setData(null);
          message.error(text);
          return;
        }
        setData(json as CorrelationApiResponse);
      } catch (e) {
        const text = e instanceof Error ? e.message : "网络异常";
        setError(text);
        setData(null);
        message.error(text);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return (
    <AntdProvider>
      <div className="min-h-screen bg-[var(--page-bg)] text-[var(--foreground)]">
        <CorrelationNavbar />

        <div className="pt-20">
          <div className="max-w-7xl mx-auto px-8 md:px-16 py-16">
            <div className="mb-12">
              <p className="text-xs font-medium tracking-[0.2em] uppercase text-[var(--muted-foreground)] mb-4">
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
            </div>

            <div className="space-y-8">
              <CorrelationInputForm loading={loading} onSubmit={handleSubmit} />

              {error && !data ? (
                <div className="border border-[color:var(--border-color)] p-6 md:p-8">
                  <p className="text-xs font-medium tracking-[0.18em] uppercase text-[var(--muted-foreground)] mb-2">
                    Error
                  </p>
                  <p className="text-sm text-[var(--foreground)]">{error}</p>
                </div>
              ) : null}

              {!data && !loading && !error ? (
                <div className="h-64 flex items-center justify-center border border-dashed border-[color:var(--border-color)]">
                  <div className="text-center px-6">
                    <p
                      className="text-sm text-[var(--muted-foreground)] mb-2"
                      style={{ letterSpacing: "0.03em" }}
                    >
                      输入至少 2 只 ETF，点击「开始分析」查看两两相关性
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] opacity-70">
                      综合分由走势相关 (A) 和成分重叠 (B) 加权得到
                    </p>
                  </div>
                </div>
              ) : null}

              {data ? (
                <>
                  <CorrelationSummaryCard
                    summary={data.summary}
                    generatedAt={data.generatedAt}
                  />
                  <CorrelationMatrix codes={data.codes} pairs={data.pairs} />
                  <CorrelationDetailTable pairs={data.pairs} />
                  <CorrelationMissingSection missing={data.missing} />
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </AntdProvider>
  );
}
