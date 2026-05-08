/**
 * ETF 相关性工具核心类型。
 *
 * 配套规格：docs/superpowers/specs/2026-05-08-etf-correlation-tool-design.md
 * 阶段 1 关注计算核心。所有外部交互（API、UI）都基于这里的类型展开。
 */

export type CorrelationPeriod = "1y" | "3y";

export type ConfidenceLevel = "high" | "medium" | "low";

export type AdviceLevel =
  | "diversified"
  | "watch"
  | "concentrated"
  | "redundant";

export type PairStatus = "complete" | "partial" | "unavailable";

export type SignalReason =
  | "ok"
  | "missing-kline"
  | "insufficient-samples"
  | "missing-holdings"
  | "non-equity-etf"
  | "weight-unparseable";

export type AvailableSignal = "return" | "holding";

export type HoldingSource = "full" | "top10";

export interface PricePoint {
  /** ISO 日期字符串，例如 2026-05-08 */
  date: string;
  /** 前复权收盘价 */
  close: number;
}

export interface EtfPriceSeries {
  code: string;
  /** 已按日期升序排列的前复权收盘价序列 */
  points: PricePoint[];
}

export interface HoldingItem {
  /** 标准化后的成分股唯一键，例如 600519.SH */
  key: string;
  /** 展示用名称，可缺失 */
  name?: string;
  /** 0-1 之间的可见组合权重；不重新归一化为总和 1 */
  weight: number;
}

export interface EtfHoldings {
  code: string;
  /** 是否为完整成分；前十大估算时为 false */
  source: HoldingSource;
  items: HoldingItem[];
}

export interface ReturnCorrelationResult {
  /** A 分数（0-1）。仅当 reason === "ok" 时有效。 */
  score: number | null;
  reason: SignalReason;
  /** 用于解释的辅助信息 */
  meta: {
    pearson: number | null;
    sampleSize: number;
    confidence: ConfidenceLevel;
  };
}

export interface HoldingOverlapResult {
  /** B 分数（0-1）。仅当 reason === "ok" 时有效。 */
  score: number | null;
  reason: SignalReason;
  meta: {
    sharedKeys: number;
    confidence: ConfidenceLevel;
    /** 两个 ETF 的成分来源组合，用于上层做可信度归并 */
    sources: [HoldingSource, HoldingSource] | null;
  };
}

export interface PairResult {
  pair: [string, string];
  status: PairStatus;
  /** A 和 B 都可用时生成；否则为 null。 */
  finalScore: number | null;
  /** 仅 A 或仅 B 可用时生成；status === "complete" 时为 null。 */
  partialScore: number | null;
  availableSignals: AvailableSignal[];
  confidence: ConfidenceLevel;
  adviceLevel: AdviceLevel | null;
  adviceText: string;
  missingReason: string | null;
  signals: {
    return: ReturnCorrelationResult;
    holding: HoldingOverlapResult;
  };
}

export interface CorrelationSummary {
  total: number;
  completePairs: number;
  partialPairs: number;
  unavailablePairs: number;
  /** 仅基于 status === "complete" 的 pair 计算 */
  maxFinalScore: number | null;
  averageFinalScore: number | null;
  highRiskPairs: number;
  /** 最高综合分对应的 ETF 代码组 */
  topRiskPair: [string, string] | null;
  /** 简明结论文案 */
  headline: string;
}

export interface MissingDataItem {
  code: string;
  reason: string;
}

export interface CorrelationApiResponse {
  period: CorrelationPeriod;
  codes: string[];
  pairs: PairResult[];
  summary: CorrelationSummary;
  missing: {
    kline: MissingDataItem[];
    holdings: MissingDataItem[];
  };
  generatedAt: string;
}

export interface CorrelationApiError {
  error: string;
  invalid?: string[];
}
