import "server-only";

import type {
  IndexPricePoint,
  IndexValuationPoint,
  IndustryCompositionByLevel,
  IndustryWeightRow,
} from "@/types/indices";

const SUPABASE_REST_PAGE_SIZE = 1000;

const EMPTY_INDUSTRY_COMPOSITION: IndustryCompositionByLevel = {
  asOfDate: null,
  sw1: [],
  sw2: [],
  sw3: [],
};

interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

interface FetchRowsOptions {
  table: string;
  params: URLSearchParams;
}

interface IndexDailyPriceRow {
  trade_date: string;
  close: number;
}

interface IndexDailyValuationRow {
  trade_date: string;
  pe_ttm: number | null;
  pb: number | null;
}

interface IndexIndustryWeightRow {
  as_of_date: string;
  sw_level: "sw1" | "sw2" | "sw3";
  industry_name: string;
  weight_pct: number;
}

export interface IndexDbDetailData {
  prices: IndexPricePoint[];
  valuations: IndexValuationPoint[];
  industryComposition: IndustryCompositionByLevel;
}

export async function fetchIndexDetailFromDatabase(
  code: string
): Promise<IndexDbDetailData | null> {
  const [prices, valuations, industryComposition] = await Promise.all([
    fetchIndexPricesFromDatabase(code),
    fetchIndexValuationsFromDatabase(code),
    fetchIndexIndustryCompositionFromDatabase(code),
  ]);

  if (!prices?.length) return null;

  return {
    prices,
    valuations: valuations ?? [],
    industryComposition: industryComposition ?? EMPTY_INDUSTRY_COMPOSITION,
  };
}

async function fetchIndexPricesFromDatabase(
  code: string
): Promise<IndexPricePoint[] | null> {
  const params = new URLSearchParams({
    select: "trade_date,close",
    index_code: `eq.${code}`,
    order: "trade_date.asc",
  });

  const rows = await fetchSupabaseRows<IndexDailyPriceRow>({
    table: "index_daily_prices",
    params,
  });
  if (!rows) return null;

  return rows
    .flatMap((row) => {
      if (!isIsoDate(row.trade_date)) return [];
      if (!Number.isFinite(row.close) || row.close <= 0) return [];

      return [{ date: row.trade_date, close: row.close }];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchIndexValuationsFromDatabase(
  code: string
): Promise<IndexValuationPoint[] | null> {
  const params = new URLSearchParams({
    select: "trade_date,pe_ttm,pb",
    index_code: `eq.${code}`,
    order: "trade_date.asc",
  });

  const rows = await fetchSupabaseRows<IndexDailyValuationRow>({
    table: "index_daily_valuations",
    params,
  });
  if (!rows) return null;

  return rows
    .flatMap((row) => {
      if (!isIsoDate(row.trade_date)) return [];
      if (!isNullablePositiveNumber(row.pe_ttm)) return [];
      if (!isNullablePositiveNumber(row.pb)) return [];

      return [
        {
          date: row.trade_date,
          peTtm: row.pe_ttm,
          pb: row.pb,
        },
      ];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchIndexIndustryCompositionFromDatabase(
  code: string
): Promise<IndustryCompositionByLevel | null> {
  const params = new URLSearchParams({
    select: "as_of_date,sw_level,industry_name,weight_pct",
    index_code: `eq.${code}`,
    order: "as_of_date.desc,sw_level.asc,weight_pct.desc",
  });

  const rows = await fetchSupabaseRows<IndexIndustryWeightRow>({
    table: "index_industry_weights",
    params,
  });
  if (!rows) return null;

  const latestAsOfDate = rows.find((row) =>
    isIsoDate(row.as_of_date)
  )?.as_of_date;
  if (!latestAsOfDate) return EMPTY_INDUSTRY_COMPOSITION;

  const latestRows = rows.filter((row) => row.as_of_date === latestAsOfDate);

  return {
    asOfDate: latestAsOfDate,
    sw1: mapIndustryRows(latestRows, "sw1"),
    sw2: mapIndustryRows(latestRows, "sw2"),
    sw3: mapIndustryRows(latestRows, "sw3"),
  };
}

async function fetchSupabaseRows<T>({
  table,
  params,
}: FetchRowsOptions): Promise<T[] | null> {
  const config = getSupabaseConfig();
  if (!config) return null;

  const out: T[] = [];
  let offset = 0;

  while (true) {
    const page = await fetchSupabasePage({
      table,
      params,
      config,
      offset,
    });
    if (!page) return null;

    out.push(...(page.rows as T[]));
    if (page.rows.length < SUPABASE_REST_PAGE_SIZE) return out;

    offset += SUPABASE_REST_PAGE_SIZE;
  }
}

async function fetchSupabasePage({
  table,
  params,
  config,
  offset,
}: {
  table: string;
  params: URLSearchParams;
  config: SupabaseConfig;
  offset: number;
}): Promise<{ rows: unknown[] } | null> {
  const url = new URL(`/rest/v1/${table}`, config.url);
  params.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    headers: {
      apikey: config.publishableKey,
      Authorization: `Bearer ${config.publishableKey}`,
      Range: `${offset}-${offset + SUPABASE_REST_PAGE_SIZE - 1}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.warn("[indices] database read failed", {
      table,
      status: response.status,
      statusText: response.statusText,
    });
    return null;
  }

  const body: unknown = await response.json();
  if (!Array.isArray(body)) {
    console.warn("[indices] database read returned non-array body", { table });
    return null;
  }

  return { rows: body.map(normalizeSupabaseRow) };
}

function normalizeSupabaseRow(row: unknown): unknown {
  if (!row || typeof row !== "object") return row;

  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      normalizeSupabaseValue(value),
    ])
  );
}

function normalizeSupabaseValue(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const numeric = Number(value);
  if (value.trim() !== "" && Number.isFinite(numeric)) return numeric;

  return value;
}

function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    console.warn("[indices] missing Supabase server env keys", {
      hasSupabaseUrl: Boolean(url),
      hasPublishableKey: Boolean(publishableKey),
    });
    return null;
  }

  return {
    url,
    publishableKey,
  };
}

function mapIndustryRows(
  rows: readonly IndexIndustryWeightRow[],
  level: IndexIndustryWeightRow["sw_level"]
): IndustryWeightRow[] {
  return rows
    .filter((row) => row.sw_level === level)
    .flatMap((row) => {
      if (!row.industry_name || !Number.isFinite(row.weight_pct)) return [];

      return [
        {
          name: row.industry_name,
          weightPct: row.weight_pct,
        },
      ];
    });
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isNullablePositiveNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && value > 0);
}
