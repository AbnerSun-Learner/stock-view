import type { TrackingEtfRow } from "@/types/indices";

/** ETF 表默认排序：规模降序 → 成交额降序 → 代码升序（PRD §5.5） */
export function sortTrackingEtfs(
  rows: readonly TrackingEtfRow[]
): TrackingEtfRow[] {
  return [...rows].sort((a, b) => {
    const au = a.aumYi ?? -1;
    const bu = b.aumYi ?? -1;
    if (bu !== au) return bu - au;
    const at = a.avgDailyTurnoverYi ?? -1;
    const bt = b.avgDailyTurnoverYi ?? -1;
    if (bt !== at) return bt - at;
    return a.code.localeCompare(b.code);
  });
}
