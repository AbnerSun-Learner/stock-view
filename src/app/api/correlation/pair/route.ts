/**
 * /api/correlation/pair — 两只 ETF 的完整相关性分析。
 *
 * 外部数据仅经 TuShare（见 scripts/fetch_etf_*.py）拉取，由 fetchAllEtfData 聚合。
 *
 * 参数：
 *   a: ETF 代码 A（6 位数字）
 *   b: ETF 代码 B（6 位数字）
 *   period: 时间窗口，默认 1y
 *
 * 返回：
 *   包含走势分析、成分重叠、时序图表数据的完整响应。
 */

import { buildPairResponse } from "@/lib/correlation/build-pair-response";
import { dedupeNormalizedCodes } from "@/lib/correlation/etf-code";
import { fetchAllEtfData } from "@/lib/correlation/fetch-data";
import { isPairAnalysisUserError } from "@/lib/correlation/pair-analysis-error";
import type {
  CorrelationApiError,
  CorrelationPeriod,
} from "@/types/correlation";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_PERIODS: CorrelationPeriod[] = ["1y", "3y", "5y", "10y", "max"];

function parsePeriod(raw: string | null): CorrelationPeriod {
  if (raw && (ALLOWED_PERIODS as string[]).includes(raw)) {
    return raw as CorrelationPeriod;
  }
  return "1y";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const aParam = searchParams.get("a") ?? "";
  const bParam = searchParams.get("b") ?? "";
  const period = parsePeriod(searchParams.get("period"));

  const normalizedA = dedupeNormalizedCodes(aParam);
  const normalizedB = dedupeNormalizedCodes(bParam);

  const codeA = normalizedA.codes[0] ?? null;
  const codeB = normalizedB.codes[0] ?? null;

  if (!codeA || !codeB) {
    return NextResponse.json(
      { error: "请提供两只有效的 ETF 代码" } as CorrelationApiError,
      { status: 400 }
    );
  }

  if (codeA === codeB) {
    return NextResponse.json(
      { error: "两只 ETF 代码不能相同" } as CorrelationApiError,
      { status: 400 }
    );
  }

  try {
    // 串行拉取两只 ETF：默认并发会为每只做 kline/holdings/spot 子进程，易与 TuShare 代理
    // 并发断连（RemoteDisconnected），导致 spot 全空、对比表「资产规模」等为 —。
    const fetched = await fetchAllEtfData([codeA, codeB], 1);
    const dataA = fetched.find((d) => d.code === codeA);
    const dataB = fetched.find((d) => d.code === codeB);
    if (!dataA || !dataB) {
      return NextResponse.json(
        { error: "未能获取指定 ETF 数据" } as CorrelationApiError,
        { status: 500 }
      );
    }

    const response = buildPairResponse(codeA, codeB, dataA, dataB, period);
    return NextResponse.json(response);
  } catch (error) {
    if (isPairAnalysisUserError(error)) {
      return NextResponse.json(
        { error: error.message } as CorrelationApiError,
        { status: 422 }
      );
    }
    console.error("[correlation/pair] api error", error);
    return NextResponse.json(
      { error: "相关性分析处理失败，请稍后再试" } as CorrelationApiError,
      { status: 500 }
    );
  }
}
