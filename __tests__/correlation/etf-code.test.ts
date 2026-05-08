import {
  dedupeNormalizedCodes,
  normalizeEtfCode,
  splitInputCodes,
} from "@/lib/correlation/etf-code";

describe("normalizeEtfCode", () => {
  it("接受纯 6 位代码", () => {
    expect(normalizeEtfCode("510300")).toEqual({
      raw: "510300",
      code: "510300",
      valid: true,
      reason: "ok",
    });
  });

  it("剥离 .SH / .SZ / .BJ 后缀", () => {
    expect(normalizeEtfCode("510300.SH").code).toBe("510300");
    expect(normalizeEtfCode("159915.sz").code).toBe("159915");
    expect(normalizeEtfCode("123456.BJ").code).toBe("123456");
  });

  it("空输入或非数字返回 invalid-format", () => {
    expect(normalizeEtfCode("").reason).toBe("empty");
    expect(normalizeEtfCode("abc").reason).toBe("invalid-format");
    expect(normalizeEtfCode("12345").reason).toBe("invalid-format");
    expect(normalizeEtfCode("1234567").reason).toBe("invalid-format");
  });
});

describe("splitInputCodes", () => {
  it("支持多种分隔符", () => {
    const result = splitInputCodes("510300,510500 159915；518880\n513100，512880");
    expect(result).toEqual([
      "510300",
      "510500",
      "159915",
      "518880",
      "513100",
      "512880",
    ]);
  });

  it("忽略空字符串", () => {
    expect(splitInputCodes(" , , 510300 ")).toEqual(["510300"]);
  });
});

describe("dedupeNormalizedCodes", () => {
  it("去重并分离非法输入", () => {
    const result = dedupeNormalizedCodes("510300, 510300.SH, abc, 159915");
    expect(result.codes).toEqual(["510300", "159915"]);
    expect(result.invalid.map((i) => i.raw)).toEqual(["abc"]);
  });

  it("纯非法输入时 codes 为空", () => {
    const result = dedupeNormalizedCodes("abc, def");
    expect(result.codes).toEqual([]);
    expect(result.invalid).toHaveLength(2);
  });
});
