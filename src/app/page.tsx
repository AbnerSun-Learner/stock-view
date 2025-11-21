/* 首页：类 Google 搜索布局 + 股票查询结果展示 */

"use client";

import { useEffect, useMemo, useState } from "react";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type PricePoint = { price: number; time: number };

type StockResponse = {
  symbol: string;
  name: string | null;
  highest: PricePoint | null;
  target80: { price: number | null };
  current: PricePoint;
  expectedDropRatio: number | null;
  candles: Candle[];
};

type FavoriteItem = {
  symbol: string;
  name: string | null;
};

type HistoryItem = {
  symbol: string;
  name: string | null;
  time: number;
};

const STORAGE_KEYS = {
  favorites: "stock-view:favorites",
  history: "stock-view:history",
};

function formatStockLabel(symbol: string, name?: string | null) {
  return name ? `${symbol}（${name}）` : symbol;
}

function normalizeFavoriteEntry(entry: unknown): FavoriteItem | null {
  if (typeof entry === "string") {
    return { symbol: entry, name: null };
  }
  if (
    entry &&
    typeof entry === "object" &&
    "symbol" in entry &&
    typeof (entry as { symbol?: unknown }).symbol === "string"
  ) {
    const casted = entry as { symbol: string; name?: unknown };
    return {
      symbol: casted.symbol,
      name:
        typeof casted.name === "string" && casted.name.trim().length
          ? casted.name
          : null,
    };
  }
  return null;
}

function normalizeHistoryEntry(entry: unknown): HistoryItem | null {
  if (
    entry &&
    typeof entry === "object" &&
    "symbol" in entry &&
    typeof (entry as { symbol?: unknown }).symbol === "string"
  ) {
    const casted = entry as { symbol: string; name?: unknown; time?: unknown };
    const timeValue =
      typeof casted.time === "number" && Number.isFinite(casted.time)
        ? casted.time
        : Date.now();
    return {
      symbol: casted.symbol,
      name:
        typeof casted.name === "string" && casted.name.trim().length
          ? casted.name
          : null,
      time: timeValue,
    };
  }
  return null;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Home() {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StockResponse | null>(null);

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 读取本地收藏与历史
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const favRaw = window.localStorage.getItem(STORAGE_KEYS.favorites);
      if (favRaw) {
        const parsed = JSON.parse(favRaw);
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map(normalizeFavoriteEntry)
            .filter((item): item is FavoriteItem => Boolean(item));
          setFavorites(normalized);
        }
      }

      const hisRaw = window.localStorage.getItem(STORAGE_KEYS.history);
      if (hisRaw) {
        const parsed = JSON.parse(hisRaw);
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map(normalizeHistoryEntry)
            .filter((item): item is HistoryItem => Boolean(item));
          setHistory(normalized);
        }
      }
    } catch {
      // 读取失败时静默处理
    }
  }, []);

  // 计算与 -80% 点位的“预期跌幅百分比”
  const expectedDropPercent = useMemo(() => {
    if (
      !data ||
      data.expectedDropRatio === null ||
      !Number.isFinite(data.expectedDropRatio)
    ) {
      return null;
    }
    return data.expectedDropRatio * 100;
  }, [data]);

  const isFavorite = useMemo(
    () =>
      !!symbol &&
      favorites.some(
        (item) => item.symbol.toUpperCase() === symbol.toUpperCase()
      ),
    [favorites, symbol]
  );

  const handleSearch = async (inputSymbol?: string) => {
    const code = (inputSymbol ?? symbol).trim();
    if (!code) return;
    setSymbol(code);
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/stock?symbol=${encodeURIComponent(code)}`);
      const json = (await resp.json()) as StockResponse & {
        error?: string;
      };
      if (!resp.ok) {
        throw new Error(json.error || "查询失败");
      }
      setData(json);

      // 写入历史记录（去重，最多保留 20 条）
      setHistory((prev) => {
        const filtered = prev.filter(
          (h) => h.symbol.toUpperCase() !== json.symbol.toUpperCase()
        );
        const next = [
          { symbol: json.symbol, name: json.name ?? null, time: Date.now() },
          ...filtered,
        ].slice(0, 20);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            STORAGE_KEYS.history,
            JSON.stringify(next)
          );
        }
        return next;
      });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "查询股票数据失败，请稍后再试";
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = () => {
    if (!data) return;
    const code = data.symbol.toUpperCase();
    setFavorites((prev) => {
      const exists = prev.some((item) => item.symbol.toUpperCase() === code);
      let next: FavoriteItem[];
      if (exists) {
        next = prev.filter((item) => item.symbol.toUpperCase() !== code);
      } else {
        next = [
          { symbol: data.symbol, name: data.name ?? null },
          ...prev,
        ].slice(0, 50);
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          STORAGE_KEYS.favorites,
          JSON.stringify(next)
        );
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center px-4 pb-16 pt-20">
        {/* 顶部品牌区：类 Google 简洁风格 */}
        <div className="mb-10 flex flex-col items-center">
          <div className="mb-4 text-5xl font-semibold tracking-tight text-slate-900">
            <span className="text-sky-500">Stock</span>
            <span className="text-slate-800">View</span>
          </div>
          <p className="text-sm text-slate-500">
            从历史最高价出发，量化你与
            <span className="font-semibold text-rose-500"> -80% </span>
            的距离。
          </p>
        </div>

        {/* 搜索框区域 */}
        <section className="w-full max-w-2xl">
          <div className="flex items-center rounded-full bg-white shadow-lg shadow-slate-200/60 ring-1 ring-slate-200">
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="输入 A 股代码，如：000001.SZ、600519、002475"
              className="flex-1 rounded-full bg-transparent px-6 py-3 text-sm outline-none placeholder:text-slate-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
            <button
              onClick={() => handleSearch()}
              className="mr-2 rounded-full bg-sky-500 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={loading || !symbol.trim()}
            >
              {loading ? "查询中..." : "查询"}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            数据源：TuShare Pro 日度前复权数据（T+1 更新，非实时）。
          </p>
        </section>

        {/* 收藏 & 历史 */}
        <section className="mt-10 grid w-full max-w-4xl gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">收藏</h2>
              <span className="text-[11px] text-slate-400">
                本地存储 · 最大 50 条
              </span>
            </div>
            {favorites.length === 0 ? (
              <p className="text-xs text-slate-400">
                暂无收藏。查询股票后，可在结果区点击「收藏」。
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {favorites.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => handleSearch(item.symbol)}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200"
                  >
                    {formatStockLabel(item.symbol, item.name)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">历史记录</h2>
              <button
                className="text-[11px] text-slate-400 hover:text-slate-600"
                onClick={() => {
                  setHistory([]);
                  if (typeof window !== "undefined") {
                    window.localStorage.removeItem(STORAGE_KEYS.history);
                  }
                }}
              >
                清空
              </button>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-slate-400">
                暂无历史记录。查询记录会自动出现在这里。
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {history.map((item) => (
                  <button
                    key={`${item.symbol}-${item.time}`}
                    onClick={() => handleSearch(item.symbol)}
                    className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-200"
                  >
                    <span className="mr-1 font-medium">
                      {formatStockLabel(item.symbol, item.name)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatDate(item.time)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 结果展示 */}
        <section className="mt-10 w-full max-w-4xl">
          {!data && !error && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center text-sm text-slate-400">
              输入股票代码并点击「查询」，将展示日K、历史最高价、-80%点位与当前价。
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {data && (
            <div className="space-y-6">
              {/* 概览卡片 */}
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {formatStockLabel(data.symbol, data.name)}
                    </h2>
                    <p className="text-xs text-slate-400">
                      最高点以前复权日 K 收盘价为基准统计（自 1990 年以来）。
                    </p>
                  </div>
                  <button
                    onClick={toggleFavorite}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    {isFavorite ? "取消收藏" : "收藏"}
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <div className="text-[11px] text-slate-500">
                      历史最高收盘价
                    </div>
                    <div className="mt-1 text-base font-semibold text-slate-900">
                      {data.highest ? data.highest.price.toFixed(2) : "--"}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      日期：
                      {data.highest ? formatDate(data.highest.time) : "--"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">
                      -80% 目标价位（0.2×最高）
                    </div>
                    <div className="mt-1 text-base font-semibold text-emerald-600">
                      {data.target80.price === null
                        ? "--"
                        : data.target80.price.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">当前收盘价</div>
                    <div className="mt-1 text-base font-semibold text-slate-900">
                      {data.current.price.toFixed(2)}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      最近交易日：{formatDate(data.current.time)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">
                      当前距离 -80% 的预期跌幅
                    </div>
                    <div className="mt-1 text-base font-semibold">
                      {expectedDropPercent === null
                        ? "--"
                        : `${expectedDropPercent.toFixed(1)}%`}
                    </div>
                    <p className="mt-1 text-[10px] leading-snug text-slate-400">
                      定义：从当前价到 -80% 点，已经/尚需完成的「从最高到 -80%
                      全程」比例。
                    </p>
                  </div>
                </div>
              </div>

              {/* 简易 K 线图区域（先预留容器，后续用专门图表库增强） */}
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">
                  日 K 走势（近 6 个月，仅展示收盘价曲线与关键价位）
                </h3>
                <SimplePriceChart data={data} />
              </div>
        </div>
          )}
        </section>
      </main>
    </div>
  );
}

type SimplePriceChartProps = {
  data: StockResponse;
};

// 简易收盘价折线图，用 SVG 实现，避免引入过重依赖
function SimplePriceChart({ data }: SimplePriceChartProps) {
  const recentCandles = useMemo(() => {
    const all = data.candles;
    if (all.length <= 120) return all;
    return all.slice(-120); // 约 6 个月交易日
  }, [data.candles]);

  const chartData = useMemo(() => {
    const values: number[] = [];
    if (recentCandles.length) {
      values.push(...recentCandles.map((c) => c.close));
    }
    values.push(data.current.price);
    if (data.target80.price !== null) {
      values.push(data.target80.price);
    }
    if (data.highest?.price !== undefined && data.highest?.price !== null) {
      values.push(data.highest.price);
    }
    const minValue = values.length ? Math.min(...values) : 0;
    const maxValue = values.length ? Math.max(...values) : 1;
    const padding =
      maxValue === minValue
        ? Math.max(Math.abs(maxValue) * 0.1, 1)
        : (maxValue - minValue) * 0.1 || 1;
    return {
      yMin: minValue - padding,
      yMax: maxValue + padding,
    };
  }, [recentCandles, data.current.price, data.target80.price, data.highest]);

  const width = 800;
  const height = 260;
  const paddingLeft = 40;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 24;

  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  const xScale = (index: number) => {
    if (recentCandles.length <= 1) return paddingLeft + innerWidth / 2;
    return paddingLeft + (index / (recentCandles.length - 1)) * innerWidth;
  };

  const yScale = (price: number) => {
    const { yMin, yMax } = chartData;
    if (yMax === yMin) return paddingTop + innerHeight / 2;
    const ratio = (price - yMin) / (yMax - yMin);
    return paddingTop + innerHeight - ratio * innerHeight;
  };

  const linePath = useMemo(() => {
    if (!recentCandles.length) return "";
    return recentCandles
      .map((c, idx) => {
        const x = xScale(idx);
        const y = yScale(c.close);
        return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [recentCandles, xScale, yScale]);

  if (!recentCandles.length) {
    return (
      <p className="text-xs text-slate-400">暂无足够的日 K 数据用于绘图。</p>
    );
  }

  const highestPrice = data.highest?.price ?? null;
  const targetPrice = data.target80.price;
  const currentPrice = data.current.price;

  const highestY = highestPrice !== null ? yScale(highestPrice) : null;
  const targetY = targetPrice !== null ? yScale(targetPrice) : null;
  const currentY = yScale(currentPrice);
  const labelPrices = useMemo(() => {
    const base: number[] = [currentPrice];
    if (highestPrice !== null) base.push(highestPrice);
    if (targetPrice !== null) base.push(targetPrice);
    if (recentCandles.length) {
      base.push(Math.min(...recentCandles.map((c) => c.close)));
    }
    const unique = Array.from(new Set(base.map((v) => v.toFixed(2))));
    return unique.map((val) => Number(val)).sort((a, b) => b - a);
  }, [currentPrice, highestPrice, targetPrice, recentCandles]);

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="min-w-full text-slate-500">
        {/* 背景 */}
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="#f8fafc"
          rx={16}
        />

        {/* 网格线 */}
        {Array.from({ length: 4 }).map((_, i) => {
          const y = paddingTop + (innerHeight * i) / 3;
          return (
            <line
              key={i}
              x1={paddingLeft}
              x2={paddingLeft + innerWidth}
              y1={y}
              y2={y}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
              strokeWidth={0.5}
            />
          );
        })}

        {/* 收盘价折线 */}
        <path d={linePath} fill="none" stroke="#0ea5e9" strokeWidth={2} />

        {/* 最高价水平线 */}
        {highestY !== null && highestPrice !== null && (
          <>
            <line
              x1={paddingLeft}
              x2={paddingLeft + innerWidth}
              y1={highestY}
              y2={highestY}
              stroke="#f97316"
              strokeDasharray="6 4"
              strokeWidth={1}
            />
            <text
              x={paddingLeft + 4}
              y={highestY - 4}
              fontSize={10}
              fill="#f97316"
            >
              最高 {highestPrice.toFixed(2)}
            </text>
          </>
        )}

        {/* -80% 目标价位线 */}
        {targetY !== null && targetPrice !== null && (
          <>
            <line
              x1={paddingLeft}
              x2={paddingLeft + innerWidth}
              y1={targetY}
              y2={targetY}
              stroke="#22c55e"
              strokeDasharray="6 4"
              strokeWidth={1}
            />
            <text
              x={paddingLeft + 4}
              y={targetY - 4}
              fontSize={10}
              fill="#16a34a"
            >
              -80% 点位 {targetPrice.toFixed(2)}
            </text>
          </>
        )}

        {/* 当前价线 */}
        <line
          x1={paddingLeft}
          x2={paddingLeft + innerWidth}
          y1={currentY}
          y2={currentY}
          stroke="#64748b"
          strokeDasharray="6 4"
          strokeWidth={1}
        />
        <text x={paddingLeft + 4} y={currentY - 4} fontSize={10} fill="#0f172a">
          当前 {currentPrice.toFixed(2)}
        </text>

        {/* 纵轴刻度：最高 / 当前 / -80% / 最低 */}
        {labelPrices.map((p, idx) => {
          const y = yScale(p);
          return (
            <text key={idx} x={8} y={y + 3} fontSize={10} fill="#94a3b8">
              {p.toFixed(2)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
