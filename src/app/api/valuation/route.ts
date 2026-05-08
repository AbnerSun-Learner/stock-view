import { formatShanghaiDate, isAfterMarketClose } from "@/lib/market-calendar";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export interface ValuationPoint {
  date: string;
  value: number;
  close?: number;
  pb?: number | null;
}

export interface ValuationResponse {
  symbol: string;
  name: string;
  data: ValuationPoint[];
  latest?: {
    date: string;
    pe: number;
    close?: number;
    pb?: number | null;
  };
}

const SYMBOL_TO_INDEX_CODE: Record<string, string> = {
  "000300": "000300.SH",
  "000016": "000016.SH",
  "000905": "000905.SH",
  "399006": "399673.SZ",
  "000852": "000852.SH",
  "000100": "000903.SH",
  "000906": "000906.SH",
};

const SYMBOL_TO_NAME: Record<string, string> = {
  "000300": "沪深300",
  "000016": "上证50",
  "000905": "中证500",
  "399006": "创业板50",
  "000852": "中证1000",
  "000100": "中证100",
  "000906": "中证800",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CACHE_TTL_MS = 5 * 60 * 1000;
/** 交易日 15:00 收盘后缩短缓存，便于尽快展示当日收盘数据 */
const CACHE_TTL_AFTER_CLOSE_MS = 60 * 1000;
const cache = new Map<string, { data: ValuationResponse; ts: number }>();

function getCacheTtl(): number {
  return isAfterMarketClose() ? CACHE_TTL_AFTER_CLOSE_MS : CACHE_TTL_MS;
}

function generateToken(): string {
  return createHash("md5").update(formatShanghaiDate()).digest("hex");
}

function msToDateStr(ms: number): string {
  return formatShanghaiDate(new Date(ms));
}

async function getLeguAuth(): Promise<{ csrf: string; cookie: string }> {
  const res = await fetch("https://legulegu.com/stockdata/sz50-ttm-lyr", {
    headers: { "User-Agent": UA },
  });
  const html = await res.text();
  const csrf =
    html.match(/<meta\s+name="_csrf"\s+content="([^"]+)"/)?.[1] ?? "";

  let cookies: string[] = [];
  const headers = res.headers as unknown;
  if (
    typeof (headers as { getSetCookie?: () => string[] }).getSetCookie ===
    "function"
  ) {
    cookies = (headers as { getSetCookie(): string[] }).getSetCookie();
  } else {
    const raw = res.headers.get("set-cookie");
    if (raw) cookies = [raw];
  }
  const cookie = cookies.map((c) => c.split(";")[0].trim()).join("; ");
  return { csrf, cookie };
}

interface LeguPeItem {
  date: number;
  close: number;
  addTtmPe: number;
}

interface LeguPbItem {
  date: number;
  addPb: number;
}

async function fetchLeguData(
  symbol: string
): Promise<ValuationResponse | null> {
  const indexCode = SYMBOL_TO_INDEX_CODE[symbol];
  if (!indexCode) return null;

  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.ts < getCacheTtl()) return cached.data;

  const { csrf, cookie } = await getLeguAuth();
  const token = generateToken();

  const headers: Record<string, string> = {
    "User-Agent": UA,
    "X-CSRF-Token": csrf,
    Cookie: cookie,
    Referer: "https://legulegu.com/stockdata/sz50-ttm-lyr",
  };

  const [peRes, pbRes] = await Promise.all([
    fetch(
      `https://legulegu.com/api/stockdata/index-basic-pe?token=${token}&indexCode=${indexCode}`,
      { headers }
    ),
    fetch(
      `https://legulegu.com/api/stockdata/index-basic-pb?token=${token}&indexCode=${indexCode}`,
      { headers }
    ),
  ]);

  if (!peRes.ok) return null;

  const peJson = (await peRes.json()) as { data?: LeguPeItem[] };
  const peItems = peJson.data ?? [];

  const pbMap = new Map<string, number>();
  if (pbRes.ok) {
    const pbJson = (await pbRes.json()) as { data?: LeguPbItem[] };
    for (const item of pbJson.data ?? []) {
      if (typeof item.addPb === "number" && !isNaN(item.addPb)) {
        pbMap.set(msToDateStr(item.date), item.addPb);
      }
    }
  }

  const data: ValuationPoint[] = [];
  for (const item of peItems) {
    if (typeof item.addTtmPe !== "number" || isNaN(item.addTtmPe)) continue;
    const dateStr = msToDateStr(item.date);
    const pb = pbMap.get(dateStr);
    data.push({
      date: dateStr,
      value: Math.round(item.addTtmPe * 100) / 100,
      close: Math.round(item.close * 100) / 100,
      pb: typeof pb === "number" ? Math.round(pb * 10000) / 10000 : null,
    });
  }

  if (!data.length) return null;

  const name = SYMBOL_TO_NAME[symbol] ?? symbol;
  const result: ValuationResponse = { symbol, name, data };
  cache.set(symbol, { data: result, ts: Date.now() });
  return result;
}

function avg(arr: number[]): number {
  return arr.length
    ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100
    : 0;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "000300";

  try {
    const result = await fetchLeguData(symbol);
    if (!result?.data?.length) {
      return NextResponse.json({ error: "估值数据暂不可用" }, { status: 503 });
    }

    const rawData = result.data;
    const lastRaw = rawData[rawData.length - 1];
    const latest = {
      date: lastRaw.date,
      pe: lastRaw.value,
      close: lastRaw.close,
      pb: lastRaw.pb,
    };

    let data: ValuationPoint[] = rawData;
    if (data.length > 600) {
      const byMonth = new Map<
        string,
        { values: number[]; closes: number[]; pbs: number[] }
      >();
      for (const p of data) {
        const month = p.date.slice(0, 7) + "-01";
        if (!byMonth.has(month))
          byMonth.set(month, { values: [], closes: [], pbs: [] });
        const bucket = byMonth.get(month)!;
        bucket.values.push(p.value);
        if (typeof p.close === "number") bucket.closes.push(p.close);
        if (typeof p.pb === "number") bucket.pbs.push(p.pb);
      }
      data = Array.from(byMonth.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, bucket]) => {
          const point: ValuationPoint = { date, value: avg(bucket.values) };
          if (bucket.closes.length) point.close = avg(bucket.closes);
          if (bucket.pbs.length) point.pb = avg(bucket.pbs);
          return point;
        });

      // 聚合会把最后一个点变成当月 01 号，追加真实最新交易日点，避免“03-01”误导
      const lastAggregatedDate = data[data.length - 1]?.date;
      if (latest.date && latest.date !== lastAggregatedDate) {
        data.push({
          date: latest.date,
          value: latest.pe,
          close: latest.close,
          pb: latest.pb,
        });
      }
    }

    return NextResponse.json({
      symbol,
      name: result.name ?? symbol,
      data,
      latest,
    } satisfies ValuationResponse);
  } catch (e) {
    console.error("valuation api error", e);
    return NextResponse.json({ error: "获取估值数据失败" }, { status: 500 });
  }
}
