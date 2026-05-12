/** 与列表、详情 URL 一致的 code 规范化（PRD §2.3） */
export function normalizeIndexCode(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  return s.toUpperCase();
}
