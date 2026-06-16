import { EtfDetailView } from "@/components/etfs/etf-detail-view";
import { getMarketCenterEtfPool } from "@/lib/etfs/server/etf-pool-server";
import type { EtfPoolItem } from "@/types/etf";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import EtfDetailLoading from "./loading";

interface PageProps {
  params: Promise<{ code: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { code } = await params;
  const etf = await getEtfDetail(code);

  if (!etf) {
    return {
      title: "未找到 ETF · Stillwell",
      description: "请求的 ETF 代码不存在，或暂未收录在行情中心 ETF 池。",
    };
  }

  return {
    title: `${etf.etfName}（${etf.etfCode}）· 行情中心 · Stillwell`,
    description: `${etf.etfName}（${etf.etfCode}）ETF 档案、跟踪指数、规模、成交额与费率信息。`,
  };
}

export default async function EtfDetailPage({ params }: PageProps) {
  const { code } = await params;

  return (
    <Suspense fallback={<EtfDetailLoading />}>
      <EtfDetailContent code={code} />
    </Suspense>
  );
}

async function EtfDetailContent({ code }: EtfDetailContentProps) {
  const etf = await getEtfDetail(code);
  if (!etf) notFound();

  return <EtfDetailView etf={etf} />;
}

async function getEtfDetail(code: string): Promise<EtfPoolItem | null> {
  const normalizedCode = normalizeEtfCode(code);
  if (!normalizedCode) return null;

  const etfPool = await getMarketCenterEtfPool();
  return etfPool.find((item) => item.etfCode === normalizedCode) ?? null;
}

function normalizeEtfCode(code: string): string | null {
  const matched = code.trim().match(/\d{6}/);
  return matched ? matched[0] : null;
}

interface EtfDetailContentProps {
  code: string;
}
