/**
 * ETF 代码标准化。
 *
 * 阶段 0 探测确认 AKShare 的 fund_etf_hist_em 直接接受纯 6 位代码，
 * 因此第一版去除可能存在的 .SH / .SZ 后缀，只保留 6 位数字。
 */

const SEPARATOR_REGEX = /[\s,，;；\n\r]+/;

const ETF_CODE_REGEX = /^\d{6}$/;

export interface NormalizedEtfCode {
  /** 用户原始输入片段（去前后空格，未做任何转换） */
  raw: string;
  /** 标准化后的 6 位代码；如果非法则为 null */
  code: string | null;
  valid: boolean;
  reason: "ok" | "empty" | "invalid-format";
}

export function splitInputCodes(input: string): string[] {
  if (!input) return [];
  return input
    .split(SEPARATOR_REGEX)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function normalizeEtfCode(input: string): NormalizedEtfCode {
  const raw = (input ?? "").trim();
  if (!raw) return { raw, code: null, valid: false, reason: "empty" };

  const stripped = raw.toUpperCase().replace(/\.(SH|SZ|BJ)$/, "");

  if (!ETF_CODE_REGEX.test(stripped)) {
    return { raw, code: null, valid: false, reason: "invalid-format" };
  }

  return { raw, code: stripped, valid: true, reason: "ok" };
}

export interface DedupedCodes {
  codes: string[];
  invalid: NormalizedEtfCode[];
}

export function dedupeNormalizedCodes(input: string): DedupedCodes {
  const parts = splitInputCodes(input);
  const seen = new Set<string>();
  const codes: string[] = [];
  const invalid: NormalizedEtfCode[] = [];

  for (const part of parts) {
    const normalized = normalizeEtfCode(part);
    if (!normalized.valid || !normalized.code) {
      invalid.push(normalized);
      continue;
    }
    if (seen.has(normalized.code)) continue;
    seen.add(normalized.code);
    codes.push(normalized.code);
  }

  return { codes, invalid };
}
