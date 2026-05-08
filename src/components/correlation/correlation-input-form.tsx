"use client";

import type { CorrelationPeriod } from "@/types/correlation";
import { Input, Segmented } from "antd";
import { useState } from "react";

interface CorrelationInputFormProps {
  loading: boolean;
  initialCodes?: string;
  initialPeriod?: CorrelationPeriod;
  onSubmit: (codes: string, period: CorrelationPeriod) => void;
}

export function CorrelationInputForm({
  loading,
  initialCodes = "",
  initialPeriod = "1y",
  onSubmit,
}: CorrelationInputFormProps) {
  const [codes, setCodes] = useState(initialCodes);
  const [period, setPeriod] = useState<CorrelationPeriod>(initialPeriod);

  function handleSubmit() {
    onSubmit(codes, period);
  }

  return (
    <div className="border border-[color:var(--border-color)] p-6 md:p-8 space-y-6">
      <div>
        <label className="block text-xs font-medium tracking-[0.18em] uppercase text-[var(--muted-foreground)] mb-3">
          ETF Codes
        </label>
        <Input.TextArea
          value={codes}
          onChange={(e) => setCodes(e.target.value)}
          placeholder="例如：510300, 510050, 513100"
          rows={2}
          autoSize={{ minRows: 2, maxRows: 4 }}
          className="correlation-textarea"
          style={{ borderRadius: 0 }}
        />
        <p className="mt-2 text-xs text-[var(--muted-foreground)] leading-relaxed">
          支持 6 位国内 ETF 代码，逗号、空格或换行分隔。最少 2 个，最多 10 个。
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <label className="block text-xs font-medium tracking-[0.18em] uppercase text-[var(--muted-foreground)] mb-3">
            Time Window
          </label>
          <Segmented<CorrelationPeriod>
            value={period}
            onChange={(v) => setPeriod(v)}
            options={[
              { label: "近 1 年", value: "1y" },
              { label: "近 3 年", value: "3y" },
            ]}
            className="valuation-segmented"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="h-10 px-8 text-xs font-medium tracking-wide bg-[var(--foreground)] text-[var(--page-bg)] hover:opacity-70 transition-opacity duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ letterSpacing: "0.06em" }}
        >
          {loading ? "分析中…" : "开始分析"}
        </button>
      </div>
    </div>
  );
}
