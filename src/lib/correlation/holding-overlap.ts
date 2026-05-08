/**
 * B 成分重叠风险计算。
 *
 * 输入：两个 ETF 的成分股权重快照。
 * 输出：B 分数（0-1）、状态、可信度。
 *
 * 关键规则：
 * - 权重必须先转换为 0-1（百分比 / 100）。不重新归一化到总和 1。
 * - 重叠分数 = sum(min(weightA, weightB)) over shared keys。
 * - 完整成分股 (full) 可信度高；前十大估算 (top10) 可信度中等。
 * - 若一只是 full、一只是 top10，pair 取较低可信度。
 */

import type {
  ConfidenceLevel,
  EtfHoldings,
  HoldingItem,
  HoldingOverlapResult,
  HoldingSource,
} from "@/types/correlation";

const WEIGHT_SUM_TOLERANCE = 0.05;

function isValidWeight(w: unknown): w is number {
  return typeof w === "number" && Number.isFinite(w) && w >= 0;
}

/**
 * 把权重单位转换为 0-1。
 * 启发：若权重最大值 > 1.5，认为是百分比单位。
 * 设计上不依赖单只最大值，而看权重总和是否 > 1.5。
 */
export function toFractionWeights(items: HoldingItem[]): HoldingItem[] {
  if (!items.length) return items;
  const sum = items.reduce(
    (acc, item) => (isValidWeight(item.weight) ? acc + item.weight : acc),
    0
  );
  const looksLikePercent = sum > 1.5;
  if (!looksLikePercent) return items.map((item) => ({ ...item }));
  return items.map((item) => ({
    ...item,
    weight: isValidWeight(item.weight) ? item.weight / 100 : item.weight,
  }));
}

function classifyHoldingConfidence(
  source: HoldingSource,
  weightSum: number
): ConfidenceLevel {
  if (source === "full") {
    if (Math.abs(weightSum - 1) <= WEIGHT_SUM_TOLERANCE) return "high";
    return "medium";
  }
  return "medium";
}

function combinedConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  const order: ConfidenceLevel[] = ["low", "medium", "high"];
  const ai = order.indexOf(a);
  const bi = order.indexOf(b);
  return order[Math.min(ai, bi)];
}

export function computeHoldingOverlap(
  holdingsA: EtfHoldings | null | undefined,
  holdingsB: EtfHoldings | null | undefined
): HoldingOverlapResult {
  if (!holdingsA || !holdingsA.items?.length) {
    return {
      score: null,
      reason: holdingsA === null ? "non-equity-etf" : "missing-holdings",
      meta: { sharedKeys: 0, confidence: "low", sources: null },
    };
  }
  if (!holdingsB || !holdingsB.items?.length) {
    return {
      score: null,
      reason: holdingsB === null ? "non-equity-etf" : "missing-holdings",
      meta: { sharedKeys: 0, confidence: "low", sources: null },
    };
  }

  const itemsA = toFractionWeights(holdingsA.items.filter((i) => isValidWeight(i.weight)));
  const itemsB = toFractionWeights(holdingsB.items.filter((i) => isValidWeight(i.weight)));

  if (!itemsA.length || !itemsB.length) {
    return {
      score: null,
      reason: "weight-unparseable",
      meta: { sharedKeys: 0, confidence: "low", sources: null },
    };
  }

  const mapA = new Map<string, number>();
  for (const item of itemsA) {
    if (!item.key) continue;
    mapA.set(item.key, (mapA.get(item.key) ?? 0) + item.weight);
  }

  let score = 0;
  let sharedKeys = 0;
  for (const item of itemsB) {
    if (!item.key) continue;
    const wa = mapA.get(item.key);
    if (wa === undefined) continue;
    sharedKeys++;
    score += Math.min(wa, item.weight);
  }

  const clamped = Math.max(0, Math.min(1, score));
  const sumA = itemsA.reduce((acc, i) => acc + i.weight, 0);
  const sumB = itemsB.reduce((acc, i) => acc + i.weight, 0);
  const confA = classifyHoldingConfidence(holdingsA.source, sumA);
  const confB = classifyHoldingConfidence(holdingsB.source, sumB);
  const confidence = combinedConfidence(confA, confB);

  return {
    score: clamped,
    reason: "ok",
    meta: {
      sharedKeys,
      confidence,
      sources: [holdingsA.source, holdingsB.source],
    },
  };
}
