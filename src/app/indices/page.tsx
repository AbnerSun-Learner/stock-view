import { IndexListView } from "@/components/indices/index-list-view";
import { getMarketCenterEtfPool } from "@/lib/etfs/server/etf-pool-server";
import { getIndexListSnapshotResult } from "@/lib/indices/server/fetch-index-data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "行情中心 · Stillwell",
  description: "浏览核心指数与 ETF 池，进入详情页查看走势、估值与产品档案。",
};

export const dynamic = "force-dynamic";

export default async function IndicesListPage() {
  const [snapshot, etfPool] = await Promise.all([
    getIndexListSnapshotResult(),
    getMarketCenterEtfPool(),
  ]);

  return (
    <IndexListView
      initialRows={snapshot.rows}
      notice={snapshot.notice}
      etfPool={etfPool}
    />
  );
}
