import type { HoldingItem } from "@/types/holdings";
import { execSync } from "child_process";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

/** ETF 场内代码，6 位数字；`/api/holdings` 仅供辅助调试或非估值场景使用。 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") ?? "")
    .replace(/\D/g, "")
    .slice(0, 6);
  if (!symbol || symbol.length !== 6) {
    return NextResponse.json(
      { holdings: [] as HoldingItem[] },
      { status: 400 }
    );
  }

  const scriptPath = path.join(
    process.cwd(),
    "scripts",
    "fetch_etf_holdings.py"
  );

  try {
    const out = execSync(`python3 "${scriptPath}" "${symbol}"`, {
      encoding: "utf-8",
      timeout: 120000,
      maxBuffer: 5 * 1024 * 1024,
    });
    const parsed = JSON.parse(out) as {
      items?: { key: string; name: string; weight: number }[];
    };
    const items = parsed.items ?? [];
    const holdings: HoldingItem[] = items.map((it, i) => ({
      rank: i + 1,
      name: it.name,
      code: it.key,
      weight: it.weight,
      industry: "",
    }));
    return NextResponse.json({ holdings });
  } catch {
    return NextResponse.json(
      { holdings: [] as HoldingItem[] },
      { status: 503 }
    );
  }
}
