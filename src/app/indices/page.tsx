import { IndexListView } from "@/components/indices/index-list-view";
import { getIndexListSnapshotResult } from "@/lib/indices/server/fetch-index-data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "行情中心 · 指数 · Stillwell",
  description:
    "扫描沪深300、科创50指数 PE/PB 与历史分位，进入单指数详情查看走势与估值。",
};

export const dynamic = "force-dynamic";

export default async function IndicesListPage() {
  const snapshot = await getIndexListSnapshotResult();
  return <IndexListView initialRows={snapshot.rows} notice={snapshot.notice} />;
}
