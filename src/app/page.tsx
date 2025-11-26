/**
 * 首页：类 Google 搜索布局 + ETF查询结果展示
 */

"use client";

import { FavoritesList } from "@/components/stock/FavoritesList";
import { HistoryList } from "@/components/stock/HistoryList";
import { OverviewCard } from "@/components/stock/OverviewCard";
import { SearchBox } from "@/components/stock/SearchBox";
import { SimplePriceChart } from "@/components/stock/SimplePriceChart";
import { LIMITS, STORAGE_KEYS } from "@/constants/stock";
import { normalizeFavoriteEntry, normalizeHistoryEntry } from "@/lib/utils";
import type { EtfResponse, FavoriteItem, HistoryItem } from "@/types/stock";
import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EtfResponse | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 读取本地收藏与历史
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

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

  // 计算与 -80% 点位的"预期跌幅百分比"
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

  // 判断当前股票是否已收藏
  const isFavorite = useMemo(
    () =>
      !!symbol &&
      favorites.some(
        (item) => item.symbol.toUpperCase() === symbol.toUpperCase()
      ),
    [favorites, symbol]
  );

  // 处理搜索
  const handleSearch = async (inputSymbol?: string) => {
    const code = (inputSymbol ?? symbol).trim();
    if (!code) {
      return;
    }

    setSymbol(code);
    setLoading(true);
    setError(null);

    try {
      const resp = await fetch(`/api/stock?symbol=${encodeURIComponent(code)}`);
      const json = (await resp.json()) as EtfResponse & {
        error?: string;
      };

      if (!resp.ok) {
        throw new Error(json.error || "查询失败");
      }

      setData(json);

      // 写入历史记录（去重，最多保留指定条数）
      setHistory((prev) => {
        const filtered = prev.filter(
          (h) => h.symbol.toUpperCase() !== json.symbol.toUpperCase()
        );
        const next = [
          { symbol: json.symbol, name: json.name ?? null, time: Date.now() },
          ...filtered,
        ].slice(0, LIMITS.maxHistory);

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
        e instanceof Error ? e.message : "查询ETF数据失败，请稍后再试";
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // 切换收藏状态
  const toggleFavorite = () => {
    if (!data) {
      return;
    }

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
        ].slice(0, LIMITS.maxFavorites);
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

  // 删除收藏
  const handleDeleteFavorite = (symbol: string) => {
    const code = symbol.toUpperCase();
    setFavorites((prev) => {
      const next = prev.filter((item) => item.symbol.toUpperCase() !== code);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          STORAGE_KEYS.favorites,
          JSON.stringify(next)
        );
      }

      return next;
    });
  };

  // 清除缓存
  const handleClearCache = async () => {
    try {
      const resp = await fetch("/api/stock", { method: "DELETE" });
      if (resp.ok) {
        alert("缓存已清除");
        // 如果当前有数据，重新查询以获取最新数据
        if (data) {
          handleSearch();
        }
      } else {
        alert("清除缓存失败");
      }
    } catch {
      alert("清除缓存失败");
    }
  };

  // 清空历史记录
  const handleClearHistory = () => {
    setHistory([]);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEYS.history);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center px-4 pb-16 pt-20">
        {/* 顶部品牌区 */}
        <div className="mb-10 flex flex-col items-center">
          <div className="mb-4 text-5xl font-semibold tracking-tight text-slate-900">
            <span className="text-sky-500">ETF</span>
            <span className="text-slate-800">View</span>
          </div>
          <p className="text-sm text-slate-500">
            从历史最高价出发，量化你与
            <span className="font-semibold text-rose-500"> -80% </span>
            的距离。
          </p>
        </div>

        {/* 搜索框区域 */}
        <SearchBox
          symbol={symbol}
          loading={loading}
          onSymbolChange={setSymbol}
          onSearch={() => handleSearch()}
          onClearCache={handleClearCache}
        />

        {/* 收藏 & 历史 */}
        <section className="mt-10 grid w-full max-w-4xl gap-6 md:grid-cols-2">
          <FavoritesList
            favorites={favorites}
            onItemClick={(symbol) => handleSearch(symbol)}
            onDelete={handleDeleteFavorite}
          />
          <HistoryList
            history={history}
            onItemClick={(symbol) => handleSearch(symbol)}
            onClear={handleClearHistory}
          />
        </section>

        {/* 结果展示 */}
        <section className="mt-10 w-full max-w-4xl">
          {!data && !error && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center text-sm text-slate-400">
              输入ETF代码并点击「查询」，将展示日K、历史最高价、-80%点位与当前价。
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {data && (
            <div className="space-y-6">
              <OverviewCard
                data={data}
                expectedDropPercent={expectedDropPercent}
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
              />

              {/* 简易 K 线图区域 */}
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
