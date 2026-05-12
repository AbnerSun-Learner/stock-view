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
    title: `${detail.name}（${detail.code}）· 指数详情 · Stillwell`,
    description: `${detail.name}（${detail.code}）估值摘要、价格指数走势与跟踪 ETF（MOCK）。`,
  };
}

export default async function IndexDetailPage({ params }: PageProps) {
  const { code } = await params;
  const detail = getMockIndexDetail(normalizeIndexCode(code));
  if (!detail) notFound();

  return <IndexDetailView detail={detail} />;
}
