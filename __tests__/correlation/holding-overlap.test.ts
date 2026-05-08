import {
  computeHoldingOverlap,
  toFractionWeights,
} from "@/lib/correlation/holding-overlap";
import type { EtfHoldings } from "@/types/correlation";

function buildHoldings(
  code: string,
  source: "full" | "top10",
  items: Array<[string, number, string?]>
): EtfHoldings {
  return {
    code,
    source,
    items: items.map(([key, weight, name]) => ({ key, weight, name })),
  };
}

describe("toFractionWeights", () => {
  it("总和大于 1.5 视为百分比，转换为 0-1", () => {
    const items = [
      { key: "a", weight: 50 },
      { key: "b", weight: 30 },
    ];
    const out = toFractionWeights(items);
    expect(out[0].weight).toBeCloseTo(0.5, 6);
    expect(out[1].weight).toBeCloseTo(0.3, 6);
  });

  it("总和小于 1.5 不重新缩放", () => {
    const items = [
      { key: "a", weight: 0.5 },
      { key: "b", weight: 0.3 },
    ];
    const out = toFractionWeights(items);
    expect(out[0].weight).toBeCloseTo(0.5, 6);
    expect(out[1].weight).toBeCloseTo(0.3, 6);
  });
});

describe("computeHoldingOverlap", () => {
  it("成分股无交集时 B 为 0", () => {
    const a = buildHoldings("A", "full", [
      ["X", 0.4],
      ["Y", 0.6],
    ]);
    const b = buildHoldings("B", "full", [
      ["P", 0.5],
      ["Q", 0.5],
    ]);
    const result = computeHoldingOverlap(a, b);
    expect(result.score).toBe(0);
    expect(result.reason).toBe("ok");
    expect(result.meta.sharedKeys).toBe(0);
  });

  it("成分股完全相同且权重一致时 B 接近 1", () => {
    const a = buildHoldings("A", "full", [
      ["X", 0.5],
      ["Y", 0.5],
    ]);
    const b = buildHoldings("B", "full", [
      ["X", 0.5],
      ["Y", 0.5],
    ]);
    const result = computeHoldingOverlap(a, b);
    expect(result.score).toBeCloseTo(1, 6);
  });

  it("百分比单位的权重能正确归一化", () => {
    const a = buildHoldings("A", "full", [
      ["X", 50],
      ["Y", 50],
    ]);
    const b = buildHoldings("B", "full", [
      ["X", 50],
      ["Y", 50],
    ]);
    const result = computeHoldingOverlap(a, b);
    expect(result.score).toBeCloseTo(1, 6);
  });

  it("不重新缩放 top10 估算的权重总和（percent 输入）", () => {
    // 模拟 510500 中证 500ETF：top10 权重总和约 6%（percent 单位），
    // 与一只完全相同的 ETF 配对，B 分数应被自然压制到 0.06 量级，
    // 而不是因重新归一化被错误放大到 1。
    const a = buildHoldings("A", "top10", [
      ["S1", 3.0],
      ["S2", 3.0],
    ]);
    const b = buildHoldings("B", "top10", [
      ["S1", 3.0],
      ["S2", 3.0],
    ]);
    const result = computeHoldingOverlap(a, b);
    expect(result.score).toBeCloseTo(0.06, 4);
    expect(result.meta.sources).toEqual(["top10", "top10"]);
  });

  it("不重新缩放 top10 估算的权重总和（fraction 输入低于阈值）", () => {
    // 边界情况：调用方已传入 fraction 形式且 sum < 1.5，
    // 应保持原值不变，不应触发自动百分比转换。
    const a = buildHoldings("A", "top10", [
      ["S1", 0.05],
      ["S2", 0.04],
    ]);
    const b = buildHoldings("B", "top10", [
      ["S1", 0.05],
      ["S2", 0.04],
    ]);
    const result = computeHoldingOverlap(a, b);
    expect(result.score).toBeCloseTo(0.09, 4);
  });

  it("一只 full、一只 top10 时 pair 可信度取较低", () => {
    const a = buildHoldings("A", "full", [["X", 0.5]]);
    const b = buildHoldings("B", "top10", [["X", 0.5]]);
    const result = computeHoldingOverlap(a, b);
    expect(result.meta.confidence).toBe("medium");
  });

  it("传入 null 表示非股票成分 ETF", () => {
    const a = buildHoldings("A", "full", [["X", 0.5]]);
    const result = computeHoldingOverlap(a, null);
    expect(result.score).toBeNull();
    expect(result.reason).toBe("non-equity-etf");
  });

  it("成分缺失时返回 missing-holdings", () => {
    const a = buildHoldings("A", "full", [["X", 0.5]]);
    const result = computeHoldingOverlap(a, undefined);
    expect(result.reason).toBe("missing-holdings");
  });
});
