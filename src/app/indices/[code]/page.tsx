import { IndexDetailView } from "@/components/indices/index-detail-view";
import { normalizeIndexCode } from "@/lib/indices/normalize-code";
import { getIndexDetail } from "@/lib/indices/server/fetch-index-data";
import { getSupportedIndexMeta } from "@/lib/indices/supported-indices";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ code: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { code } = await params;
  const meta = getSupportedIndexMeta(normalizeIndexCode(code));
  if (!meta) {
    return {
      title: "未找到指数 · Stillwell",
      description: "请求的指数代码不存在、暂未收录，或 TuShare 暂无可用数据。",
    };
  }
  return {
    title: `${meta.name}（${meta.code}）· 行情中心 · Stillwell`,
    description: `${meta.name}（${meta.code}）价格与估值走势、PE/PB 分位仪表盘。`,
  };
}

export default async function IndexDetailPage({ params }: PageProps) {
  const { code } = await params;
  const detail = await getIndexDetail(normalizeIndexCode(code));
  if (!detail) notFound();

  return <IndexDetailView detail={detail} />;
}
