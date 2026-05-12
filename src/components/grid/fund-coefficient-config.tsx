"use client";

import { InputNumber } from "antd";
import { HelpCircle } from "lucide-react";

interface FundCoefficientConfigProps {
  amountPerGrid: number;
  onAmountPerGridChange: (value: number | null) => void;
  amountMultiplier: number;
  onAmountMultiplierChange: (value: number | null) => void;
  profitReserveMultiplier: number;
  onProfitReserveMultiplierChange: (value: number | null) => void;
}

export function FundCoefficientConfig({
  amountPerGrid,
  onAmountPerGridChange,
  amountMultiplier,
  onAmountMultiplierChange,
  profitReserveMultiplier,
  onProfitReserveMultiplierChange,
}: FundCoefficientConfigProps) {
  const fields = [
    {
      key: "amountPerGrid",
      label: "每份金额",
      value: amountPerGrid,
      onChange: onAmountPerGridChange,
      tooltip: "每个网格档位的投资金额",
      precision: 0,
      min: 100,
    },
    {
      key: "amountMultiplier",
      label: "金额加码系数",
      value: amountMultiplier,
      onChange: onAmountMultiplierChange,
      tooltip:
        "逐级增加买入金额。0=按固定金额买入。公式：每份金额 + 每份金额 × 系数 × (1 - 当前档位)",
      precision: 1,
      min: 0,
    },
    {
      key: "profitReserveMultiplier",
      label: "保留利润系数",
      value: profitReserveMultiplier,
      onChange: onProfitReserveMultiplierChange,
      tooltip:
        "卖出时是否保留利润。0=不保留利润（当前档位全部卖出），0.5=保留一半利润，1=保留全部利润（只卖回本），2=保留两倍利润",
      precision: 1,
      min: 0,
    },
  ];

  return (
    <div className="space-y-4 p-6 md:p-7">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="ds-card-eyebrow mb-1.5">Capital</p>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[var(--foreground)]">
              资金系数
            </h3>
            <div className="group relative">
              <HelpCircle className="h-4 w-4 cursor-help text-[var(--muted-foreground)] transition-colors hover:text-[var(--accent)]" />
              <div className="pointer-events-none absolute left-0 top-full z-[99999] mt-2 hidden w-64 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-xs leading-relaxed text-[var(--foreground)] shadow-[var(--ds-shadow-lg)] group-hover:block">
                控制每个档位的资金分配和利润保留策略
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* 第一行：每份金额（占满一行） */}
        <div className="space-y-2">
          <label
            htmlFor={fields[0].key}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--foreground)]"
          >
            <span className="text-[var(--loss)]">*</span>
            {fields[0].label}
            <div className="group relative">
              <HelpCircle className="h-3.5 w-3.5 cursor-help text-[var(--muted-foreground)]" />
              <div className="pointer-events-none absolute bottom-full left-0 z-[99999] mb-2 hidden w-56 rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 text-xs leading-snug text-[var(--foreground)] shadow-[var(--ds-shadow-md)] group-hover:block">
                {fields[0].tooltip}
              </div>
            </div>
          </label>
          <InputNumber
            id={fields[0].key}
            value={fields[0].value}
            onChange={(value) => fields[0].onChange(value)}
            precision={fields[0].precision}
            min={fields[0].min}
            controls={false}
            className="w-full"
            style={{
              width: "100%",
              textAlign: "center",
              fontWeight: 600,
              fontSize: "16px",
            }}
          />
        </div>

        {/* 第二行：金额加码系数和保留利润系数（一行2列） */}
        <div className="grid grid-cols-2 gap-4">
          {fields.slice(1).map((field) => (
            <div key={field.key} className="space-y-2">
              <label
                htmlFor={field.key}
                className="flex items-center gap-1 text-xs font-semibold text-[var(--foreground)]"
              >
                <span className="text-[var(--loss)]">*</span>
                {field.label}
                <div className="group relative">
                  <HelpCircle className="h-3.5 w-3.5 cursor-help text-[var(--muted-foreground)]" />
                  <div className="pointer-events-none absolute bottom-full left-0 z-[99999] mb-2 hidden w-56 rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 text-xs leading-snug text-[var(--foreground)] shadow-[var(--ds-shadow-md)] group-hover:block">
                    {field.tooltip}
                  </div>
                </div>
              </label>
              <InputNumber
                id={field.key}
                value={field.value}
                onChange={(value) => field.onChange(value)}
                precision={field.precision}
                min={field.min}
                controls={false}
                className="w-full"
                style={{
                  width: "100%",
                  textAlign: "center",
                  fontWeight: 600,
                  fontSize: "16px",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
