import { IndexDetailView } from "@/components/indices/index-detail-view";
import { getMockIndexDetail } from "@/lib/indices/mock-data";
import { normalizeIndexCode } from "@/lib/indices/normalize-code";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { code } = await params;
  const detail = getMockIndexDetail(normalizeIndexCode(code));
  if (!detail) {
    return {
      title: "未找到指数 · Stillwell",
      description: "请求的指数代码不存在或暂未收录（MOCK）。",
    };
  }
  return {
    title: `${detail.name}（${detail.code}）· 行情中心 · Stillwell`,
    description: `${detail.name}（${detail.code}）价格与估值走势、分位仪表盘及申万行业构成（MOCK）。`,
  };
}

export default async function IndexDetailPage({ params }: PageProps) {
  const { code } = await params;
  const detail = getMockIndexDetail(normalizeIndexCode(code));
  if (!detail) notFound();

  return <IndexDetailView detail={detail} />;
}
