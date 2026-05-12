import type { IndexChartWindow } from "@/types/indices";

export const DEFAULT_INDEX_CHART_WINDOW: IndexChartWindow = "5Y";

export const INDEX_CHART_WINDOW_OPTIONS: {
  label: string;
  value: IndexChartWindow;
}[] = [
  { label: "年初至今", value: "YTD" },
  { label: "近1年", value: "1Y" },
  { label: "近3年", value: "3Y" },
  { label: "近5年", value: "5Y" },
  { label: "近10年", value: "10Y" },
  { label: "上市以来", value: "LISTED" },
  { label: "全部", value: "ALL" },
];
