import { IndexListView } from "@/components/indices/index-list-view";
import { getMockIndexListRows } from "@/lib/indices/mock-data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "行情中心 · 指数 · Stillwell",
  description:
    "MOCK：扫描指数 PE/PB 与分位，进入单指数详情查看走势、估值与行业构成。",
};

export default function IndicesListPage() {
  const initialRows = getMockIndexListRows();
  return <IndexListView initialRows={initialRows} />;
}
