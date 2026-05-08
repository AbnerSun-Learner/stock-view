/**
 * 把 fetch + 计算结果组合成 /api/correlation 的最终响应。
 */

import type {
  CorrelationApiResponse,
  CorrelationPeriod,
  CorrelationSummary,
  MissingDataItem,
  PairResult,
  PairStatus,
} from "@/types/correlation";
import { computeHoldingOverlap } from "./holding-overlap";
import { computePairScore } from "./score";
import { computeReturnCorrelation } from "./return-correlation";
import type { FetchedEtfData } from "./fetch-data";

export type { CorrelationApiResponse, CorrelationSummary, MissingDataItem };
/** @deprecated 改用 CorrelationApiResponse */
export type CorrelationResponse = CorrelationApiResponse;

const HIGH_RISK_THRESHOLD = 0.6;

function buildPairs(
  codes: string[],
  fetched: Map<string, FetchedEtfData>,
  period: CorrelationPeriod
): PairResult[] {
  const pairs: PairResult[] = [];
  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      const a = codes[i];
      const b = codes[j];
      const dataA = fetched.get(a);
      const dataB = fetched.get(b);

      const returnResult = computeReturnCorrelation(
        dataA?.kline ?? { code: a, points: [] },
        dataB?.kline ?? { code: b, points: [] },
        period
      );
      const holdingResult = computeHoldingOverlap(
        dataA?.holdings ?? undefined,
        dataB?.holdings ?? undefined
      );
      pairs.push(
        computePairScore({
          pair: [a, b],
          returnResult,
          holdingResult,
        })
      );
    }
  }
  return pairs;
}

function buildSummary(pairs: PairResult[]): CorrelationSummary {
  const byStatus: Record<PairStatus, number> = {
    complete: 0,
    partial: 0,
    unavailable: 0,
  };
  let max: number | null = null;
  let sum = 0;
  let highRisk = 0;
  let topRiskPair: [string, string] | null = null;

  for (const p of pairs) {
    byStatus[p.status]++;
    if (p.status === "complete" && p.finalScore !== null) {
      sum += p.finalScore;
      if (max === null || p.finalScore > max) {
        max = p.finalScore;
        topRiskPair = p.pair;
      }
      if (p.finalScore >= HIGH_RISK_THRESHOLD) highRisk++;
    }
  }

  const completePairs = byStatus.complete;
  const avg = completePairs > 0 ? sum / completePairs : null;

  let headline: string;
  if (pairs.length === 0) {
    headline = "未生成两两组合";
  } else if (completePairs === 0) {
    headline = "数据不足，无法形成完整结论";
  } else if (highRisk === 0 && (max ?? 0) < HIGH_RISK_THRESHOLD) {
    headline = "整体两两重复度较低，分散度参考良好";
  } else if (highRisk === 1) {
    headline = "存在 1 对高重复风险组合，建议重点关注";
  } else {
    headline = `存在 ${highRisk} 对高重复风险组合，建议精简持仓`;
  }

  return {
    total: pairs.length,
    completePairs: byStatus.complete,
    partialPairs: byStatus.partial,
    unavailablePairs: byStatus.unavailable,
    maxFinalScore: max,
    averageFinalScore: avg,
    highRiskPairs: highRisk,
    topRiskPair,
    headline,
  };
}

function buildMissing(fetched: FetchedEtfData[]) {
  const kline: MissingDataItem[] = [];
  const holdings: MissingDataItem[] = [];
  for (const f of fetched) {
    if (!f.kline) {
      kline.push({ code: f.code, reason: "未能获取行情或行情样本不足" });
    }
    if (!f.holdings) {
      holdings.push({
        code: f.code,
        reason: "未能获取股票成分（可能为商品/债券类 ETF 或接口暂时不可用）",
      });
    }
  }
  return { kline, holdings };
}

export function buildCorrelationResponse(
  codes: string[],
  fetched: FetchedEtfData[],
  period: CorrelationPeriod
): CorrelationApiResponse {
  const fetchMap = new Map(fetched.map((f) => [f.code, f]));
  const pairs = buildPairs(codes, fetchMap, period);
  return {
    period,
    codes,
    pairs,
    summary: buildSummary(pairs),
    missing: buildMissing(fetched),
    generatedAt: new Date().toISOString(),
  };
}
