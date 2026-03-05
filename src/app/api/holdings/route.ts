import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

export interface HoldingItem {
  rank: number;
  name: string;
  code: string;
  weight: number;
  industry: string;
}

const ETF_SYMBOLS = new Set(["513050"]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "000300";
  const mode = ETF_SYMBOLS.has(symbol) ? "etf" : "index";
  const scriptPath = path.join(process.cwd(), "scripts", "fetch_holdings.py");

  try {
    const out = execSync(
      `python3 "${scriptPath}" "${mode}" "${symbol}"`,
      { encoding: "utf-8", timeout: 120000, maxBuffer: 5 * 1024 * 1024 }
    );
    const parsed = JSON.parse(out) as { holdings: HoldingItem[] };
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ holdings: [] }, { status: 503 });
  }
}
