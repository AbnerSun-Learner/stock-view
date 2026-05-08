import { computePairScore, getAdviceLevel } from "@/lib/correlation/score";
import type {
  HoldingOverlapResult,
  ReturnCorrelationResult,
} from "@/types/correlation";

function okReturn(score: number, sampleSize = 200): ReturnCorrelationResult {
  return {
    score,
    reason: "ok",
    meta: {
      pearson: score === 0 ? -0.1 : score,
      sampleSize,
      confidence: "high",
    },
  };
}

function missingReturn(): ReturnCorrelationResult {
  return {
    score: null,
    reason: "missing-kline",
    meta: { pearson: null, sampleSize: 0, confidence: "low" },
  };
}

function okHolding(score: number): HoldingOverlapResult {
  return {
    score,
    reason: "ok",
    meta: { sharedKeys: 5, confidence: "high", sources: ["full", "full"] },
  };
}

function missingHolding(): HoldingOverlapResult {
  return {
    score: null,
    reason: "missing-holdings",
    meta: { sharedKeys: 0, confidence: "low", sources: null },
  };
}

function nonEquityHolding(): HoldingOverlapResult {
  return {
    score: null,
    reason: "non-equity-etf",
    meta: { sharedKeys: 0, confidence: "low", sources: null },
  };
}

describe("getAdviceLevel", () => {
  it("半开半闭区间归类", () => {
    expect(getAdviceLevel(0)).toBe("diversified");
    expect(getAdviceLevel(0.299)).toBe("diversified");
    expect(getAdviceLevel(0.3)).toBe("watch");
    expect(getAdviceLevel(0.599)).toBe("watch");
    expect(getAdviceLevel(0.6)).toBe("concentrated");
    expect(getAdviceLevel(0.799)).toBe("concentrated");
    expect(getAdviceLevel(0.8)).toBe("redundant");
    expect(getAdviceLevel(1)).toBe("redundant");
  });
});

describe("computePairScore", () => {
  it("A 和 B 都可用时生成 finalScore", () => {
    const result = computePairScore({
      pair: ["510300", "510050"],
      returnResult: okReturn(0.8),
      holdingResult: okHolding(0.4),
    });
    expect(result.status).toBe("complete");
    expect(result.finalScore).toBeCloseTo(0.6, 6);
    expect(result.partialScore).toBeNull();
    expect(result.adviceLevel).toBe("concentrated");
    expect(result.availableSignals).toEqual(["return", "holding"]);
  });

  it("仅 A 可用时 status=partial 且不生成 finalScore", () => {
    const result = computePairScore({
      pair: ["510300", "518880"],
      returnResult: okReturn(0.7),
      holdingResult: nonEquityHolding(),
    });
    expect(result.status).toBe("partial");
    expect(result.finalScore).toBeNull();
    expect(result.partialScore).toBeCloseTo(0.7, 6);
    expect(result.adviceLevel).toBeNull();
    expect(result.availableSignals).toEqual(["return"]);
    expect(result.missingReason).toContain("非股票成分");
  });

  it("仅 B 可用时 status=partial", () => {
    const result = computePairScore({
      pair: ["510300", "510050"],
      returnResult: missingReturn(),
      holdingResult: okHolding(0.6),
    });
    expect(result.status).toBe("partial");
    expect(result.partialScore).toBeCloseTo(0.6, 6);
    expect(result.availableSignals).toEqual(["holding"]);
  });

  it("两路都失败时 status=unavailable", () => {
    const result = computePairScore({
      pair: ["510300", "510050"],
      returnResult: missingReturn(),
      holdingResult: missingHolding(),
    });
    expect(result.status).toBe("unavailable");
    expect(result.adviceLevel).toBeNull();
    expect(result.adviceText).toContain("数据不足");
    expect(result.missingReason).toContain("走势");
    expect(result.missingReason).toContain("成分");
  });

  it("complete pair 的可信度取 A、B 中的较低值", () => {
    const result = computePairScore({
      pair: ["510300", "510050"],
      returnResult: {
        ...okReturn(0.5),
        meta: { pearson: 0.5, sampleSize: 50, confidence: "low" },
      },
      holdingResult: okHolding(0.5),
    });
    expect(result.confidence).toBe("low");
  });

  it("partial pair 的可信度统一为 low", () => {
    const result = computePairScore({
      pair: ["510300", "518880"],
      returnResult: okReturn(0.9),
      holdingResult: nonEquityHolding(),
    });
    expect(result.confidence).toBe("low");
  });

  it("A 高 B 低时建议文案体现共同因子", () => {
    const result = computePairScore({
      pair: ["510300", "513100"],
      returnResult: okReturn(0.7),
      holdingResult: okHolding(0.1),
    });
    expect(result.adviceText).toContain("走势同向");
  });

  it("A 低 B 高时建议文案体现底层重复", () => {
    const result = computePairScore({
      pair: ["510300", "510050"],
      returnResult: okReturn(0.2),
      holdingResult: okHolding(0.8),
    });
    expect(result.adviceText).toContain("底层成分重复");
  });
});
