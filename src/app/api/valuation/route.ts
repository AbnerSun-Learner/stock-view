import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import path from "path";

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
  /** 原始日频数据中最新一条的日期、PE、close、PB（不受月度聚合影响） */
  latest?: {
    date: string;
    pe: number;
    close?: number;
    pb?: number | null;
  };
}

const SYMBOL_TO_LG: Record<string, string> = {
  "000300": "沪深300",
  "000016": "上证50",
  "000905": "中证500",
  "399006": "创业板50",
  "000852": "中证1000",
  "000100": "中证100",
  "000906": "中证800",
};

const ETF_SYMBOLS = new Set(["513050"]);

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { data: ValuationResponse; ts: number }>();

function fetchFromPython(symbol: string): Promise<ValuationResponse | null> {
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return Promise.resolve(cached.data);

  const scriptPath = path.join(process.cwd(), "scripts", "fetch_valuation.py");
  const isEtf = ETF_SYMBOLS.has(symbol);
  const mode = isEtf ? "etf" : "lg";
  const arg = isEtf ? symbol : (SYMBOL_TO_LG[symbol] || symbol);

  return new Promise((resolve) => {
    execFile(
      "python3",
      [scriptPath, mode, arg],
      { encoding: "utf-8", timeout: 60000, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err) { resolve(null); return }
        try {
          const parsed = JSON.parse(stdout) as ValuationResponse;
          if (parsed.data?.length) {
            cache.set(symbol, { data: parsed, ts: Date.now() });
            resolve(parsed);
            return;
          }
        } catch { /* parse error */ }
        resolve(null);
      }
    );
  });
}

function avg(arr: number[]): number {
  return arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : 0;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "000300";

  try {
    const fromPython = await fetchFromPython(symbol);
    if (!fromPython?.data?.length) {
      return NextResponse.json(
        { error: "估值数据暂不可用" },
        { status: 503 }
      );
    }

    const rawData = fromPython.data;
    const lastRaw = rawData[rawData.length - 1];
    const latest = {
      date: lastRaw.date,
      pe: lastRaw.value,
      close: lastRaw.close,
      pb: lastRaw.pb,
    };

    let data: ValuationPoint[] = rawData;
    if (data.length > 600) {
      const byMonth = new Map<string, { values: number[]; closes: number[]; pbs: number[] }>();
      for (const p of data) {
        const month = p.date.slice(0, 7) + "-01";
        if (!byMonth.has(month)) byMonth.set(month, { values: [], closes: [], pbs: [] });
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
    }

    return NextResponse.json({
      symbol,
      name: fromPython.name ?? symbol,
      data,
      latest,
    } satisfies ValuationResponse);
  } catch (e) {
    console.error("valuation api error", e);
    return NextResponse.json({ error: "获取估值数据失败" }, { status: 500 });
  }
}
