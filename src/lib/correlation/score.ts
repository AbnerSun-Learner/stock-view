/**
 * 综合分与建议合成。
 *
 * 关键规则：
 * - A 和 B 都可用时才生成 finalScore。
 * - 仅 A 或仅 B 可用时返回 partialScore，不进入完整建议区间。
 * - 建议区间使用半开半闭：[0, 0.3) [0.3, 0.6) [0.6, 0.8) [0.8, 1]。
 */

import type {
  AdviceLevel,
  AvailableSignal,
  ConfidenceLevel,
  HoldingOverlapResult,
  PairResult,
  PairStatus,
  ReturnCorrelationResult,
} from "@/types/correlation";

const WEIGHT_A = 0.5;
const WEIGHT_B = 0.5;

const REASON_TEXT: Record<string, string> = {
  "missing-kline": "缺少行情数据",
  "insufficient-samples": "共同交易日样本不足",
  "missing-holdings": "缺少成分股数据",
  "non-equity-etf": "非股票成分 ETF",
  "weight-unparseable": "成分权重无法解析",
};

export function getAdviceLevel(score: number): AdviceLevel {
  if (score < 0.3) return "diversified";
  if (score < 0.6) return "watch";
  if (score < 0.8) return "concentrated";
  return "redundant";
}

export const ADVICE_LEVEL_LABEL: Record<AdviceLevel, string> = {
  diversified: "分散较好",
  watch: "存在一定重叠",
  concentrated: "相关性偏高",
  redundant: "高度重复",
};

export const ADVICE_LEVEL_DETAIL: Record<AdviceLevel, string> = {
  diversified: "可继续持有",
  watch: "新增前需谨慎",
  concentrated: "建议降低重复方向权重",
  redundant: "建议考虑替换其中一个",
};

function lowerConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  const order: ConfidenceLevel[] = ["low", "medium", "high"];
  return order[Math.min(order.indexOf(a), order.indexOf(b))];
}

function buildCompleteAdvice(
  level: AdviceLevel,
  scoreA: number,
  scoreB: number
): string {
  const aHigh = scoreA >= 0.5;
  const bHigh = scoreB >= 0.5;
  const head = `${ADVICE_LEVEL_LABEL[level]}。`;
  if (aHigh && bHigh)
    return `${head}走势同向且底层成分接近，是典型的重复持仓，${ADVICE_LEVEL_DETAIL[level]}。`;
  if (aHigh)
    return `${head}走势同向明显但底层成分重复有限，可能受共同市场因子影响，${ADVICE_LEVEL_DETAIL[level]}。`;
  if (bHigh)
    return `${head}底层成分重复明显但短期走势不完全同步，长期分散度有限，${ADVICE_LEVEL_DETAIL[level]}。`;
  return `${head}${ADVICE_LEVEL_DETAIL[level]}。`;
}

function buildPartialAdvice(
  signal: AvailableSignal,
  score: number
): string {
  if (signal === "return") {
    return `仅基于走势数据的部分判断：${score >= 0.6 ? "短期同向较明显" : "短期同向不明显"}。底层成分数据不足，无法形成完整结论。`;
  }
  return `仅基于成分数据的部分判断：${score >= 0.5 ? "底层重叠明显" : "底层重叠有限"}。走势数据不足，无法形成完整结论。`;
}

function reasonText(reason: string): string {
  return REASON_TEXT[reason] ?? "数据不足";
}

export interface ComputePairScoreInput {
  pair: [string, string];
  returnResult: ReturnCorrelationResult;
  holdingResult: HoldingOverlapResult;
}

export function computePairScore(input: ComputePairScoreInput): PairResult {
  const { pair, returnResult, holdingResult } = input;
  const aOk = returnResult.reason === "ok" && returnResult.score !== null;
  const bOk = holdingResult.reason === "ok" && holdingResult.score !== null;

  if (aOk && bOk) {
    const finalScore =
      (returnResult.score as number) * WEIGHT_A +
      (holdingResult.score as number) * WEIGHT_B;
    const level = getAdviceLevel(finalScore);
    const confidence = lowerConfidence(
      returnResult.meta.confidence,
      holdingResult.meta.confidence
    );
    return {
      pair,
      status: "complete",
      finalScore,
      partialScore: null,
      availableSignals: ["return", "holding"],
      confidence,
      adviceLevel: level,
      adviceText: buildCompleteAdvice(
        level,
        returnResult.score as number,
        holdingResult.score as number
      ),
      missingReason: null,
      signals: { return: returnResult, holding: holdingResult },
    };
  }

  const availableSignals: AvailableSignal[] = [];
  if (aOk) availableSignals.push("return");
  if (bOk) availableSignals.push("holding");

  if (availableSignals.length === 1) {
    const signal = availableSignals[0];
    const score =
      signal === "return"
        ? (returnResult.score as number)
        : (holdingResult.score as number);
    const missingSide = signal === "return" ? holdingResult.reason : returnResult.reason;
    return {
      pair,
      status: "partial",
      finalScore: null,
      partialScore: score,
      availableSignals,
      confidence: "low",
      adviceLevel: null,
      adviceText: buildPartialAdvice(signal, score),
      missingReason: reasonText(missingSide),
      signals: { return: returnResult, holding: holdingResult },
    };
  }

  // 两路信号都不可用
  const reasonsTextParts = [
    returnResult.reason !== "ok" ? `走势：${reasonText(returnResult.reason)}` : null,
    holdingResult.reason !== "ok" ? `成分：${reasonText(holdingResult.reason)}` : null,
  ].filter((x): x is string => Boolean(x));

  return {
    pair,
    status: "unavailable",
    finalScore: null,
    partialScore: null,
    availableSignals: [],
    confidence: "low",
    adviceLevel: null,
    adviceText: "数据不足，无法形成结论。",
    missingReason: reasonsTextParts.join("；") || "数据不足",
    signals: { return: returnResult, holding: holdingResult },
  };
}

export type { PairStatus };
