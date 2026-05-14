#!/usr/bin/env node

import { execFile } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const SUPPORTED_INDICES_PATH = path.join(
  ROOT_DIR,
  "data",
  "indices",
  "supported-indices.json"
);
const SNAPSHOT_PATH = path.join(
  ROOT_DIR,
  "data",
  "indices",
  "list-snapshot.json"
);
const DAILY_SCRIPT_PATH = path.join(
  ROOT_DIR,
  "scripts",
  "fetch_index_daily.py"
);

const PYTHON_BIN = process.env.PYTHON_BIN || "python3";
const PROCESS_TIMEOUT_MS = boundedInt(
  process.env.CORRELATION_SCRIPT_TIMEOUT_MS,
  90_000,
  15_000,
  180_000
);
const PREFETCH_CONCURRENCY = boundedInt(
  process.env.INDEX_SNAPSHOT_PREFETCH_CONCURRENCY,
  1,
  1,
  3
);
const MAX_BUFFER = 16 * 1024 * 1024;
const VISIBLE_CATEGORIES = new Set(["宽基", "行业"]);

function boundedInt(raw, fallback, min, max) {
  const parsed = Number.parseInt(raw || "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isFinitePositiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function parsePricePoints(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      if (!isIsoDate(item.date) || !isFinitePositiveNumber(item.close))
        return [];
      return [{ date: item.date, close: item.close }];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function latestClose(prices) {
  return prices[prices.length - 1]?.close ?? null;
}

function historyHigh(prices) {
  if (prices.length === 0) return null;
  return Math.max(...prices.map((point) => point.close));
}

function drawdownFromHighPct(close, high) {
  if (close === null || high === null || high <= 0) return null;
  return Math.round((close / high - 1) * 1000) / 10;
}

function buildListRow(meta, prices) {
  const close = latestClose(prices);
  const high = historyHigh(prices);
  const asOfDate = prices[prices.length - 1]?.date ?? "";

  return {
    code: meta.code,
    name: meta.name,
    category: meta.category,
    displayOrder: meta.displayOrder,
    asOfDate,
    close,
    historyHigh: high,
    drawdownFromHighPct: drawdownFromHighPct(close, high),
    peTtm: null,
    pePercentileCurrent: null,
    percentile5yPe: null,
    percentile10yPe: null,
    pb: null,
    pbPercentileCurrent: null,
    pbPercentile5y: null,
    pbPercentile10y: null,
  };
}

async function fetchIndexPrices(code) {
  const { stdout } = await execFileAsync(
    PYTHON_BIN,
    [DAILY_SCRIPT_PATH, code],
    {
      cwd: ROOT_DIR,
      timeout: PROCESS_TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
      encoding: "utf-8",
    }
  );
  const text = stdout.trim();
  if (!text) throw new Error("empty stdout");
  const payload = JSON.parse(text);
  const points = parsePricePoints(payload?.points);
  if (points.length === 0) throw new Error("empty price points");
  return points;
}

async function mapWithConcurrency(values, concurrency, task) {
  const results = new Array(values.length);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, values.length);

  async function worker() {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await task(values[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

async function readSupportedIndices() {
  const raw = await readFile(SUPPORTED_INDICES_PATH, "utf-8");
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows))
    throw new Error("supported indices must be an array");
  return rows.filter((meta) => VISIBLE_CATEGORIES.has(meta.category));
}

async function writeSnapshot(snapshot) {
  await mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true });
  const tempPath = `${SNAPSHOT_PATH}.${process.pid}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf-8");
  await rename(tempPath, SNAPSHOT_PATH);
}

async function main() {
  const metas = await readSupportedIndices();
  const outcomes = await mapWithConcurrency(
    metas,
    PREFETCH_CONCURRENCY,
    async (meta) => {
      try {
        const prices = await fetchIndexPrices(meta.code);
        return {
          ok: true,
          row: buildListRow(meta, prices),
        };
      } catch (error) {
        return {
          ok: false,
          failure: {
            code: meta.code,
            name: meta.name,
            reason: error instanceof Error ? error.message : String(error),
          },
        };
      }
    }
  );

  const rows = outcomes.flatMap((outcome) =>
    outcome.ok && outcome.row ? [outcome.row] : []
  );
  const failures = outcomes.flatMap((outcome) =>
    !outcome.ok && outcome.failure ? [outcome.failure] : []
  );

  if (failures.length > 0) {
    console.error("[indices] snapshot prefetch failed:");
    for (const failure of failures) {
      console.error(`- ${failure.code} ${failure.name}: ${failure.reason}`);
    }
    process.exit(1);
  }

  const marketDates = new Set(rows.map((row) => row.asOfDate));
  if (marketDates.size !== 1) {
    console.error(
      `[indices] inconsistent market dates: ${Array.from(marketDates).join(
        ", "
      )}`
    );
    process.exit(1);
  }

  const [marketDate] = Array.from(marketDates);
  const snapshot = {
    generatedAt: new Date().toISOString(),
    marketDate,
    marketTimeZone: "Asia/Shanghai",
    rows: rows.sort((a, b) => a.displayOrder - b.displayOrder),
    failures,
  };

  await writeSnapshot(snapshot);
  console.log(
    `[indices] snapshot generated: marketDate=${marketDate}, rows=${rows.length}, failures=${failures.length}`
  );
}

main().catch((error) => {
  console.error("[indices] snapshot prefetch crashed", error);
  process.exit(1);
});
