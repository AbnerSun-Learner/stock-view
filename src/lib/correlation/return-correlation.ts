/**
 * A 走势相关风险计算。
 *
 * 输入：两个 ETF 的前复权收盘价序列 + 时间窗口。
 * 输出：A 分数（0-1）、状态、可信度。
 *
 * 关键规则：
 * - 按共同交易日做内连接（inner join），仅保留两边都有有效收盘价的日期。
 * - 剔除停牌、零值、负值。
 * - Pearson 相关系数计算后，负相关一律转 0。
 * - 样本数量低于阈值时不可用。
 */

import type {
  ConfidenceLevel,
  CorrelationPeriod,
  EtfPriceSeries,
  PricePoint,
  ReturnCorrelationResult,
} from "@/types/correlation";

const MIN_SAMPLES_BY_PERIOD: Record<CorrelationPeriod, number> = {
  "1y": 120,
  "3y": 360,
  "5y": 600,
  "10y": 1200,
  max: 1200,
};

const TRADING_DAYS_BY_PERIOD: Record<CorrelationPeriod, number> = {
  "1y": 252,
  "3y": 756,
  "5y": 1260,
  "10y": 2520,
  max: Infinity,
};

interface AlignedReturns {
  ra: number[];
  rb: number[];
  dates: string[];
}

function isValidClose(close: number): boolean {
  return Number.isFinite(close) && close > 0;
}

function indexByDate(points: PricePoint[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of points) {
    if (!p?.date) continue;
    if (!isValidClose(p.close)) continue;
    map.set(p.date, p.close);
  }
  return map;
}

/**
 * 截取最近 N 个有效交易日的收盘价。
 * 假设输入已按日期升序排列。
 */
function takeRecent(points: PricePoint[], maxDays: number): PricePoint[] {
  const filtered = points.filter((p) => isValidClose(p.close));
  if (maxDays === Infinity || filtered.length <= maxDays) return filtered;
  return filtered.slice(filtered.length - maxDays);
}

export function alignReturns(
  seriesA: EtfPriceSeries,
  seriesB: EtfPriceSeries,
  period: CorrelationPeriod
): AlignedReturns {
  const window = TRADING_DAYS_BY_PERIOD[period];
  const a = takeRecent(seriesA.points, window + 1);
  const b = takeRecent(seriesB.points, window + 1);
  const mapA = indexByDate(a);
  const mapB = indexByDate(b);

  const sharedDates: string[] = [];
  for (const date of mapA.keys()) {
    if (mapB.has(date)) sharedDates.push(date);
  }
  sharedDates.sort();

  if (sharedDates.length < 2) return { ra: [], rb: [], dates: [] };

  const ra: number[] = [];
  const rb: number[] = [];
  const dates: string[] = [];
  for (let i = 1; i < sharedDates.length; i++) {
    const prev = sharedDates[i - 1];
    const curr = sharedDates[i];
    const prevA = mapA.get(prev)!;
    const prevB = mapB.get(prev)!;
    const currA = mapA.get(curr)!;
    const currB = mapB.get(curr)!;
    if (!isValidClose(prevA) || !isValidClose(prevB)) continue;
    const retA = currA / prevA - 1;
    const retB = currB / prevB - 1;
    if (!Number.isFinite(retA) || !Number.isFinite(retB)) continue;
    ra.push(retA);
    rb.push(retB);
    dates.push(curr);
  }

  return { ra, rb, dates };
}

export function pearson(
  xs: number[],
  ys: number[],
  start = 0,
  end = xs.length
): number | null {
  if (xs.length !== ys.length) return null;
  const n = end - start;
  if (n < 2) return null;

  let meanX = 0;
  let meanY = 0;
  for (let i = start; i < end; i++) {
    meanX += xs[i];
    meanY += ys[i];
  }
  meanX /= n;
  meanY /= n;

  let cov = 0;
  let varX = 0;
  let varY = 0;
  for (let i = start; i < end; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  if (varX === 0 || varY === 0) return null;

  const r = cov / Math.sqrt(varX * varY);
  if (!Number.isFinite(r)) return null;
  return Math.max(-1, Math.min(1, r));
}

function classifyConfidence(
  sampleSize: number,
  threshold: number
): ConfidenceLevel {
  if (sampleSize >= threshold * 1.5) return "high";
  if (sampleSize >= threshold) return "medium";
  return "low";
}

export function computeReturnCorrelation(
  seriesA: EtfPriceSeries,
  seriesB: EtfPriceSeries,
  period: CorrelationPeriod
): ReturnCorrelationResult {
  if (!seriesA?.points?.length || !seriesB?.points?.length) {
    return {
      score: null,
      reason: "missing-kline",
      meta: { pearson: null, sampleSize: 0, confidence: "low" },
    };
  }

  const { ra, rb } = alignReturns(seriesA, seriesB, period);
  const minSamples = MIN_SAMPLES_BY_PERIOD[period];

  if (ra.length < minSamples) {
    return {
      score: null,
      reason: "insufficient-samples",
      meta: {
        pearson: null,
        sampleSize: ra.length,
        confidence: "low",
      },
    };
  }

  const r = pearson(ra, rb);
  if (r === null) {
    return {
      score: null,
      reason: "insufficient-samples",
      meta: {
        pearson: null,
        sampleSize: ra.length,
        confidence: "low",
      },
    };
  }

  const score = Math.max(0, r);
  return {
    score,
    reason: "ok",
    meta: {
      pearson: r,
      sampleSize: ra.length,
      confidence: classifyConfidence(ra.length, minSamples),
    },
  };
}
