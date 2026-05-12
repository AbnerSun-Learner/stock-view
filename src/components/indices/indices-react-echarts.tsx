"use client";

import { ChartShell } from "@/components/correlation/chart-shell";
import * as echarts from "echarts";
import type { EChartsOption } from "echarts-for-react";
import ReactECharts from "echarts-for-react";

interface IndicesReactEChartsProps {
  height: number;
  option: EChartsOption;
  className?: string;
}

export function IndicesReactECharts({
  height,
  option,
  className,
}: IndicesReactEChartsProps) {
  return (
    <ChartShell height={height}>
      <div className={`w-full h-full min-h-0 box-border ${className ?? ""}`}>
        <ReactECharts
          echarts={echarts}
          option={option}
          style={{ height: "100%", width: "100%" }}
          opts={{ renderer: "svg" }}
          notMerge
          lazyUpdate
        />
      </div>
    </ChartShell>
  );
}
