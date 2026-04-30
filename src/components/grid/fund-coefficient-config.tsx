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
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          资金系数
        </h3>
        <div className="group relative">
          <HelpCircle className="w-4 h-4 cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" />
          <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-[99999] w-64 p-3 text-xs rounded-lg bg-slate-900 dark:bg-slate-950 text-slate-100 shadow-xl whitespace-normal pointer-events-none">
            控制每个档位的资金分配和利润保留策略
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* 第一行：每份金额（占满一行） */}
        <div className="space-y-2">
          <label
            htmlFor={fields[0].key}
            className="flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300"
          >
            <span className="text-red-500">*</span>
            {fields[0].label}
            <div className="group relative">
              <HelpCircle className="w-3.5 h-3.5 cursor-help text-slate-400" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-[99999] w-56 p-2 text-xs rounded-lg bg-slate-900 text-slate-100 shadow-lg whitespace-normal pointer-events-none">
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
                className="flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                <span className="text-red-500">*</span>
                {field.label}
                <div className="group relative">
                  <HelpCircle className="w-3.5 h-3.5 cursor-help text-slate-400" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-[99999] w-56 p-2 text-xs rounded-lg bg-slate-900 text-slate-100 shadow-lg whitespace-normal pointer-events-none">
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
