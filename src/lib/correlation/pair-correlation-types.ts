/**
 * ETF 两两相关性 API（/api/correlation/pair）的请求体与时间序列数据结构。
 */

import type { CorrelationPeriod } from "@/types/correlation";
import type { EtfProfile } from "./etf-profiles";

export interface ScatterPoint {
  ra: number;
  rb: number;
}

/** 业绩走势图：横轴为区间内每个「收益日」对应日期；纵轴为相对区间起点的复利累计涨跌（%）；另含当日收益率（%）供与行情软件对照 */
export interface PerformancePoint {
  date: string;
  cumChangePctA: number;
  cumChangePctB: number;
  dayChangePctA: number;
  dayChangePctB: number;
}

export interface RollingPoint {
  date: string;
  value: number;
}

export interface PairCorrelationData {
  a: EtfProfile;
  b: EtfProfile;
  period: CorrelationPeriod;
  sampleSize: number;
  pearson: number;
  rSquared: number;
  scoreA: number;
  scoreB: number;
  finalScore: number;
  headline: string;
  detail: string;
  scatter: ScatterPoint[];
  performanceSeries: PerformancePoint[];
  rolling: RollingPoint[];
  rangeLabel: string;
}

const PERIOD_LABEL: Record<CorrelationPeriod, string> = {
  "1y": "近 1 年",
  "3y": "近 3 年",
  "5y": "近 5 年",
  "10y": "近 10 年",
  max: "成立至今",
};

export function getPeriodLabel(period: CorrelationPeriod): string {
  return PERIOD_LABEL[period];
}
