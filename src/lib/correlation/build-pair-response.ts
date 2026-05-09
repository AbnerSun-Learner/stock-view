/**
 * 构建两两对比 API 的完整响应。
 *
 * 从两只 ETF 的行情 + 持仓数据出发：
 * 1. 计算走势相关性（Pearson）
 * 2. 计算成分重叠
 * 3. 合成综合分与建议
 * 4. 从对齐的收益率序列推导时序图表数据（散点、业绩走势、滚动相关性）
 */

import type {
  CorrelationPeriod,
  HoldingOverlapResult,
  ReturnCorrelationResult,
} from "@/types/correlation";
import { buildEtfProfile, type EtfProfile } from "./etf-profiles";
import type { FetchedEtfData } from "./fetch-data";
import { computeHoldingOverlap } from "./holding-overlap";
import { PairAnalysisUserError } from "./pair-analysis-error";
import type {
  PairCorrelationData,
  PerformancePoint,
  RollingPoint,
  ScatterPoint,
} from "./pair-correlation-types";
import {
  alignReturns,
  computeReturnCorrelation,
  pearson as pearsonFn,
} from "./return-correlation";
import { computePairScore } from "./score";

const ROLLING_WINDOW = 60;

function buildHeadline(score: number): string {
  if (score < 0.3) return "整体分散度参考良好";
  if (score < 0.6) return "存在一定重叠，新增前需谨慎";
  if (score < 0.8) return "相关性偏高，重复风险显著";
  return "高度重复，建议精简持仓";
}

function buildDetail(a: EtfProfile, b: EtfProfile, score: number): string {
  if (score < 0.3) {
    return `${a.name} 与 ${b.name} 在走势与底层成分上差异明显，可保持当前配置。`;
  }
  if (score < 0.6) {
    return `${a.name} 与 ${b.name} 在部分行业和成分上存在重叠，新增同方向仓位前需评估。`;
  }
  if (score < 0.8) {
    return `${a.name} 与 ${b.name} 走势同向且底层重叠较多，建议降低重复方向权重。`;
  }
  return `${a.name} 与 ${b.name} 高度重复，建议考虑替换其中一只。`;
}

export function buildPairResponse(
  codeA: string,
  codeB: string,
  fetchedA: FetchedEtfData,
  fetchedB: FetchedEtfData,
  period: CorrelationPeriod
): PairCorrelationData {
  // 1. 计算相关性核心指标
  const returnResult: ReturnCorrelationResult = computeReturnCorrelation(
    fetchedA.kline ?? { code: codeA, points: [] },
    fetchedB.kline ?? { code: codeB, points: [] },
    period
  );

  const holdingResult: HoldingOverlapResult = computeHoldingOverlap(
    fetchedA.holdings ?? undefined,
    fetchedB.holdings ?? undefined
  );

  const pairResult = computePairScore({
    pair: [codeA, codeB],
    returnResult,
    holdingResult,
  });

  /**
   * 本页图表与综合分依赖走势 + 成分两路信号同时可用。
   * partial 时用 0 / 空序列填充会变成「看起来像成功但实际全空」，直接拒绝并给出原因。
   */
  if (pairResult.status !== "complete") {
    if (pairResult.status === "unavailable") {
      throw new PairAnalysisUserError(
        pairResult.missingReason ?? "数据不足，无法完成相关性分析"
      );
    }
    throw new PairAnalysisUserError(
      `分析数据不完整（${
        pairResult.missingReason ?? "部分数据源不可用"
      }）。「业绩走势」「历史相关性」「综合相关性」需在行情与重仓数据均就绪时方能展示；请稍后重试或排查网络与该品种是否可被 TuShare 拉取。`
    );
  }

  const a = buildEtfProfile(
    codeA,
    fetchedA.spot ?? null,
    fetchedA.holdings ?? null
  );
  const b = buildEtfProfile(
    codeB,
    fetchedB.spot ?? null,
    fetchedB.holdings ?? null
  );

  // 3. 对齐收益率并计算时序数据
  const { ra, rb, dates } = alignReturns(
    fetchedA.kline ?? { code: codeA, points: [] },
    fetchedB.kline ?? { code: codeB, points: [] },
    period
  );

  // 散点：每日收益率对
  const scatter: ScatterPoint[] = ra.map((r, i) => ({
    ra: r,
    rb: rb[i],
  }));

  // 业绩走势：复利累积（相对区间首个收益日的前一日收盘隐式锚点）；同日展示当日简单收益
  const performanceSeries: PerformancePoint[] = [];
  let wealthA = 1;
  let wealthB = 1;
  for (let i = 0; i < ra.length; i++) {
    wealthA *= 1 + ra[i];
    wealthB *= 1 + rb[i];
    performanceSeries.push({
      date: dates[i],
      cumChangePctA: (wealthA - 1) * 100,
      cumChangePctB: (wealthB - 1) * 100,
      dayChangePctA: ra[i] * 100,
      dayChangePctB: rb[i] * 100,
    });
  }

  // 滚动相关性：60 日窗口 Pearson，直接传索引避免重复 slice
  const rolling: RollingPoint[] = [];
  for (let i = ROLLING_WINDOW; i < ra.length; i++) {
    const r = pearsonFn(ra, rb, i - ROLLING_WINDOW, i);
    if (r !== null) {
      rolling.push({ date: dates[i], value: r });
    }
  }

  // 4. 组装核心指标
  const scoreA = returnResult.score as number;
  const scoreB = holdingResult.score as number;
  const finalScore = pairResult.finalScore as number;
  const pearson = returnResult.meta.pearson ?? 0;

  const rangeLabel =
    dates.length >= 2 ? `${dates[0]} — ${dates[dates.length - 1]}` : "—";

  return {
    a,
    b,
    period,
    sampleSize: returnResult.meta.sampleSize,
    pearson,
    rSquared: pearson * pearson,
    scoreA,
    scoreB,
    finalScore,
    headline: buildHeadline(finalScore),
    detail: buildDetail(a, b, finalScore),
    scatter,
    performanceSeries,
    rolling,
    rangeLabel,
  };
}
