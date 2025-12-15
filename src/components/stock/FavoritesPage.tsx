/**
 * 收藏页面组件
 */

"use client";

import {
  getFavoritesFromLocal,
  performInitialSync,
} from "@/lib/favorites-store";
import {
  fetchBatchPrices,
  updatePriceDataMap,
  type PriceData,
} from "@/lib/price-fetcher";
import { getUserIdFromStorage } from "@/lib/user-id";
import type { FavoriteItem } from "@/types/stock";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FavoritePriceCard } from "./FavoritePriceCard";
import { PushSettings } from "./PushSettings";

export function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceDataMap, setPriceDataMap] = useState<Map<string, PriceData>>(
    new Map()
  );

  // 初始化：加载收藏数据
  useEffect(() => {
    async function loadFavorites() {
      try {
        const userId = getUserIdFromStorage();
        if (!userId) {
          setLoading(false);
          return;
        }

        // 执行初始同步（服务端优先）
        const syncedFavorites = await performInitialSync(userId);
        setFavorites(syncedFavorites);

        // 如果有联系方式，同步到服务端
        const storedContact = localStorage.getItem("stock_view_user_contact");
        const storedContactType = localStorage.getItem(
          "stock_view_user_contact_type"
        );
        if (storedContact && storedContactType && syncedFavorites.length > 0) {
          try {
            await fetch("/api/favorites", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                contact: storedContact,
                contactType: storedContactType,
                favorites: syncedFavorites.map((f) => ({
                  symbol: f.symbol,
                  name: f.name,
                })),
              }),
            });
          } catch (error) {
            console.error("Failed to sync favorites to server:", error);
          }
        }
      } catch (error) {
        console.error("Failed to load favorites:", error);
        // 失败时回退到本地数据
        const localFavorites = getFavoritesFromLocal();
        setFavorites(localFavorites);
      } finally {
        setLoading(false);
      }
    }

    loadFavorites();
  }, []);

  // 批量获取价格数据
  const fetchPriceData = useCallback(
    async (symbols: string[], retrySymbol?: string) => {
      const symbolsToFetch = retrySymbol ? [retrySymbol] : symbols;

      // 初始化加载状态
      setPriceDataMap((prev) => {
        const next = new Map(prev);
        symbolsToFetch.forEach((symbol) => {
          next.set(symbol, {
            symbol,
            data: null,
            loading: true,
            error: null,
          });
        });
        return next;
      });

      // 使用统一的价格获取工具
      await fetchBatchPrices(symbolsToFetch, { batchSize: 5 }, (result) => {
        setPriceDataMap((prev) => updatePriceDataMap(prev, [result]));
      });
    },
    []
  );

  // 当收藏列表变化时，获取价格数据
  useEffect(() => {
    if (favorites.length > 0) {
      const symbols = favorites.map((f) => f.symbol);
      fetchPriceData(symbols);
    }
  }, [favorites, fetchPriceData]);

  // 处理收藏项点击（跳转到首页并触发查询）
  const handleFavoriteClick = (symbol: string) => {
    router.push(`/?symbol=${encodeURIComponent(symbol)}`);
  };

  // 处理删除收藏（保留以备将来使用，如添加删除按钮）
  // const handleDeleteFavorite = async (symbol: string) => {
  //   const updated = favorites.filter((item) => item.symbol !== symbol);
  //   setFavorites(updated);

  //   // 同步删除到服务端
  //   const userId = getUserIdFromStorage();
  //   if (userId) {
  //     try {
  //       await fetch(
  //         `/api/favorites/${encodeURIComponent(symbol)}?userId=${userId}`,
  //         {
  //           method: "DELETE",
  //         }
  //       );
  //     } catch (error) {
  //       console.error("Failed to delete favorite from server:", error);
  //     }
  //   }

  //   // 从价格数据中移除
  //   setPriceDataMap((prev) => {
  //     const next = new Map(prev);
  //     next.delete(symbol);
  //     return next;
  //   });
  // };

  // 重试获取价格数据
  const handleRetryPrice = (symbol: string) => {
    fetchPriceData([symbol], symbol);
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-4">
        <div className="text-sm text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">我的收藏</h1>
        <p className="mt-1 text-sm text-slate-500">
          查看您收藏的所有 ETF 及其价格信息
        </p>
      </div>

      {/* 微信推送设置 */}
      <div className="mb-6">
        <PushSettings />
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200/70">
          <div className="text-center">
            <p className="text-sm text-slate-500">
              暂无收藏。在首页查询 ETF 后，可在结果区点击「收藏」。
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              去首页查询
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {favorites.map((favorite) => {
            const priceData = priceDataMap.get(favorite.symbol) || {
              symbol: favorite.symbol,
              data: null,
              loading: false,
              error: null,
            };

            return (
              <FavoritePriceCard
                key={favorite.symbol}
                symbol={favorite.symbol}
                name={favorite.name}
                data={priceData.data}
                loading={priceData.loading}
                error={priceData.error}
                onRetry={() => handleRetryPrice(favorite.symbol)}
                onClick={() => handleFavoriteClick(favorite.symbol)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
