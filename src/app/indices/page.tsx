import { IndexListView } from "@/components/indices/index-list-view";
import { getMockIndexListRows } from "@/lib/indices/mock-data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "指数列表 · Stillwell",
  description:
    "扫描指数代码与类别，查看 PE / 分位摘要并进入单指数详情（MOCK 演示）。",
};

export default function IndicesListPage() {
  const initialRows = getMockIndexListRows();
  return <IndexListView initialRows={initialRows} />;
}
