"use client";

import { SkeletonChart } from "@/components/correlation/pair-skeleton";
import dynamic from "next/dynamic";

/**
 * Recharts 拆到独立 chunk，减轻首包；与 ChartShell 搭配使用 ssr: false。
 */
export const LazyPairPerformanceChart = dynamic(
  () =>
    import("@/components/correlation/pair-performance-chart").then((m) => ({
      default: m.PairPerformanceChart,
    })),
  { loading: () => <SkeletonChart />, ssr: false }
);

export const LazyPairRollingChart = dynamic(
  () =>
    import("@/components/correlation/pair-rolling-chart").then((m) => ({
      default: m.PairRollingChart,
    })),
  { loading: () => <SkeletonChart />, ssr: false }
);
