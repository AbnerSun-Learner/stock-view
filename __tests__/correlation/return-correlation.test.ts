import {
  alignReturns,
  computeReturnCorrelation,
  pearson,
} from "@/lib/correlation/return-correlation";
import type { EtfPriceSeries, PricePoint } from "@/types/correlation";

function buildSeries(
  code: string,
  startDate: string,
  prices: number[]
): EtfPriceSeries {
  const start = new Date(startDate + "T00:00:00Z");
  const points: PricePoint[] = prices.map((close, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return {
      date: d.toISOString().slice(0, 10),
      close,
    };
  });
  return { code, points };
}

function buildLongSeries(
  code: string,
  length: number,
  generator: (i: number) => number
): EtfPriceSeries {
  const prices: number[] = [];
  for (let i = 0; i < length; i++) prices.push(generator(i));
  return buildSeries(code, "2023-01-01", prices);
}

describe("pearson", () => {
  it("完全正相关返回 1", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 6);
  });

  it("完全负相关返回 -1", () => {
    expect(pearson([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 6);
  });

  it("方差为 0 时返回 null", () => {
    expect(pearson([1, 1, 1, 1], [1, 2, 3, 4])).toBeNull();
  });

  it("样本数小于 2 时返回 null", () => {
    expect(pearson([1], [2])).toBeNull();
  });
});

describe("alignReturns", () => {
  it("按共同交易日做内连接", () => {
    const a = buildSeries("A", "2024-01-01", [10, 11, 12, 13]);
    const b = buildSeries("B", "2024-01-02", [20, 22, 24, 26]);
    const { ra, rb } = alignReturns(a, b, "1y");
    // 共同日期：2024-01-02 ~ 2024-01-04，3 个共同日期 → 2 个收益率
    expect(ra).toHaveLength(2);
    expect(rb).toHaveLength(2);
  });

  it("剔除非正价格", () => {
    const a = buildSeries("A", "2024-01-01", [10, 0, 12, 13]);
    const b = buildSeries("B", "2024-01-01", [20, 22, 24, 26]);
    const { ra } = alignReturns(a, b, "1y");
    // 第二天 a 价格为 0 应被剔除，剩下 2024-01-01 / 2024-01-03 / 2024-01-04
    expect(ra.length).toBeLessThan(3);
  });
});

describe("computeReturnCorrelation", () => {
  it("近 1 年样本数不足时不可用", () => {
    const a = buildLongSeries("A", 50, (i) => 10 + i * 0.1);
    const b = buildLongSeries("B", 50, (i) => 20 + i * 0.2);
    const result = computeReturnCorrelation(a, b, "1y");
    expect(result.score).toBeNull();
    expect(result.reason).toBe("insufficient-samples");
  });

  it("完全同步序列得到分数接近 1", () => {
    const a = buildLongSeries("A", 200, (i) => 10 * (1 + 0.001 * Math.sin(i)));
    const b = buildLongSeries("B", 200, (i) => 20 * (1 + 0.001 * Math.sin(i)));
    const result = computeReturnCorrelation(a, b, "1y");
    expect(result.reason).toBe("ok");
    expect(result.score).toBeCloseTo(1, 3);
  });

  it("完全反向序列得分被截断为 0", () => {
    const a = buildLongSeries("A", 200, (i) => 10 + 0.5 * Math.sin(i));
    const b = buildLongSeries("B", 200, (i) => 20 - 0.5 * Math.sin(i));
    const result = computeReturnCorrelation(a, b, "1y");
    expect(result.reason).toBe("ok");
    expect(result.score).toBe(0);
    expect(result.meta.pearson).toBeLessThan(0);
  });

  it("近 3 年阈值高于近 1 年", () => {
    const a = buildLongSeries("A", 200, (i) => 10 + i * 0.01);
    const b = buildLongSeries("B", 200, (i) => 20 + i * 0.02);
    const r1y = computeReturnCorrelation(a, b, "1y");
    const r3y = computeReturnCorrelation(a, b, "3y");
    expect(r1y.reason).toBe("ok");
    expect(r3y.reason).toBe("insufficient-samples");
  });

  it("缺少行情时返回 missing-kline", () => {
    const empty: EtfPriceSeries = { code: "A", points: [] };
    const b = buildLongSeries("B", 200, (i) => 20 + i);
    const result = computeReturnCorrelation(empty, b, "1y");
    expect(result.reason).toBe("missing-kline");
  });
});
