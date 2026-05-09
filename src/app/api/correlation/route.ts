import { buildCorrelationResponse } from "@/lib/correlation/build-response";
import { dedupeNormalizedCodes } from "@/lib/correlation/etf-code";
import { fetchAllEtfData } from "@/lib/correlation/fetch-data";
import type {
  CorrelationApiError,
  CorrelationApiResponse,
  CorrelationPeriod,
} from "@/types/correlation";
import { NextRequest, NextResponse } from "next/server";

const MAX_CODES = 10;
const ALLOWED_PERIODS: CorrelationPeriod[] = ["1y", "3y", "5y", "10y", "max"];

function parsePeriod(raw: string | null): CorrelationPeriod {
  if (raw && (ALLOWED_PERIODS as string[]).includes(raw)) {
    return raw as CorrelationPeriod;
  }
  return "1y";
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<CorrelationApiResponse | CorrelationApiError>> {
  const { searchParams } = new URL(request.url);
  const codesParam = searchParams.get("codes") ?? "";
  const period = parsePeriod(searchParams.get("period"));

  const { codes, invalid } = dedupeNormalizedCodes(codesParam);

  if (invalid.length && codes.length === 0) {
    return NextResponse.json(
      {
        error: "未识别到合法的 ETF 代码",
        invalid: invalid.map((i) => i.raw),
      },
      { status: 400 }
    );
  }

  if (codes.length < 2) {
    return NextResponse.json(
      { error: "请至少输入 2 个有效的 ETF 代码" },
      { status: 400 }
    );
  }

  if (codes.length > MAX_CODES) {
    return NextResponse.json(
      { error: `最多支持 ${MAX_CODES} 个 ETF` },
      { status: 400 }
    );
  }

  try {
    const fetched = await fetchAllEtfData(codes);
    const response = buildCorrelationResponse(codes, fetched, period);
    return NextResponse.json(response);
  } catch (error) {
    console.error("[correlation] api error", error);
    return NextResponse.json(
      { error: "相关性分析处理失败，请稍后再试" },
      { status: 500 }
    );
  }
}
