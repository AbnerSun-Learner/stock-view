"use client";

import { InputNumber } from "antd";
import { HelpCircle } from "lucide-react";
import { useMemo } from "react";

interface BaseInfoConfigProps {
  minTradeUnit: number;
  onMinTradeUnitChange: (value: number | null) => void;
  priceUnit: number;
  onPriceUnitChange: (value: number | null) => void;
  basePrice: number;
  onBasePriceChange: (value: number | null) => void;
  minPrice: number;
  onMinPriceChange: (value: number | null) => void;
}

export function BaseInfoConfig({
  minTradeUnit,
  onMinTradeUnitChange,
  priceUnit,
  onPriceUnitChange,
  basePrice,
  onBasePriceChange,
  minPrice,
  onMinPriceChange,
}: BaseInfoConfigProps) {
  // 计算价格精度对应的小数位数
  const priceDecimals = useMemo(() => {
    if (priceUnit >= 1) return 0;
    if (priceUnit >= 0.1) return 1;
    if (priceUnit >= 0.01) return 2;
    if (priceUnit >= 0.001) return 3;
    return 4;
  }, [priceUnit]);

  const fields: Array<{
    key: string;
    label: string;
    value: number;
    onChange: (value: number | null) => void;
    tooltip: string;
    precision: number;
    min: number;
  }> = [
    {
      key: "minTradeUnit",
      label: "最小交易单位",
      value: minTradeUnit,
      onChange: onMinTradeUnitChange,
      tooltip: "单次交易的最小股数",
      precision: 0,
      min: 1,
    },
    {
      key: "priceUnit",
      label: "价格精度",
      value: priceUnit,
      onChange: onPriceUnitChange,
      tooltip: "价格精度，如 0.001 表示保留3位小数",
      precision: 4,
      min: 0.0001,
    },
    {
      key: "basePrice",
      label: "基准价",
      value: basePrice,
      onChange: onBasePriceChange,
      tooltip: "网格交易的起始价格",
      precision: priceDecimals,
      min: 0.0001,
    },
    {
      key: "minPrice",
      label: "最低价",
      value: minPrice,
      onChange: onMinPriceChange,
      tooltip: "网格交易的最低价格限制",
      precision: priceDecimals,
      min: 0.0001,
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          基准信息
        </h3>
        <div className="group relative">
          <HelpCircle className="w-4 h-4 cursor-help text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" />
          <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-[99999] w-64 p-3 text-xs rounded-lg bg-slate-900 dark:bg-slate-950 text-slate-100 shadow-xl whitespace-normal pointer-events-none">
            设置网格交易的基础参数，包括交易单位、价格精度和价格区间
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <label
              htmlFor={field.key}
              className="flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300"
            >
              <span className="text-red-500">*</span>
              {field.label}
              <div className="group relative">
                <HelpCircle className="w-3.5 h-3.5 cursor-help text-slate-400" />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-[99999] w-48 p-2 text-xs rounded-lg bg-slate-900 text-slate-100 shadow-lg whitespace-normal pointer-events-none">
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
  );
}
