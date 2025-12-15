/**
 * 收藏同步工具（localStorage + Vercel KV 双向同步）
 * 策略：服务端优先，冲突时以服务端数据为准
 */

import { LIMITS, STORAGE_KEYS } from "@/constants/stock";
import type { Favorite } from "@/types/favorites";
import type { FavoriteItem } from "@/types/stock";
import { safeKVOperation } from "./kv";

/**
 * 从 localStorage 读取收藏列表
 */
export function getFavoritesFromLocal(): FavoriteItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.favorites);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (typeof item === "string") {
          return { symbol: item, name: null };
        }
        if (
          item &&
          typeof item === "object" &&
          "symbol" in item &&
          typeof item.symbol === "string"
        ) {
          return {
            symbol: item.symbol,
            name:
              typeof item.name === "string" && item.name.trim().length > 0
                ? item.name
                : null,
          };
        }
        return null;
      })
      .filter((item): item is FavoriteItem => Boolean(item))
      .slice(0, LIMITS.maxFavorites);
  } catch {
    return [];
  }
}

/**
 * 保存收藏列表到 localStorage
 */
export function saveFavoritesToLocal(favorites: FavoriteItem[]): void {
  if (typeof window === "undefined") return;

  try {
    const limited = favorites.slice(0, LIMITS.maxFavorites);
    localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(limited));
  } catch (error) {
    console.error("Failed to save favorites to localStorage:", error);
  }
}

/**
 * 从 Vercel KV 读取用户的收藏列表
 */
export async function getFavoritesFromKV(
  userId: string
): Promise<FavoriteItem[]> {
  return safeKVOperation(async (kv) => {
    // 读取集合中的所有收藏 key
    const favoriteKeys = await kv.keys(`favorite:${userId}:*`);

    if (!favoriteKeys || favoriteKeys.length === 0) {
      return [];
    }

    // 批量读取收藏数据
    const favorites = await Promise.all(
      favoriteKeys.map(async (key) => {
        const favorite = await kv.get<Favorite>(key as string);
        if (!favorite) return null;
        return {
          symbol: favorite.symbol,
          name: favorite.name ?? null,
        } as FavoriteItem;
      })
    );

    return favorites.filter((item): item is FavoriteItem => Boolean(item));
  }, []);
}

/**
 * 同步收藏到 Vercel KV（增量同步）
 * 返回：{ synced: number, removed: number }
 */
export async function syncFavoritesToKV(
  userId: string,
  favorites: FavoriteItem[]
): Promise<{ synced: number; removed: number }> {
  if (favorites.length > LIMITS.maxFavorites) {
    throw new Error(`收藏数量超过上限 ${LIMITS.maxFavorites}`);
  }

  return safeKVOperation(
    async (kv) => {
      // 获取服务端现有的收藏
      const existingKeys = await kv.keys(`favorite:${userId}:*`);
      const existingSymbols = new Set(
        existingKeys.map((key) => {
          const parts = (key as string).split(":");
          return parts[parts.length - 1]; // 获取 symbol
        })
      );

      // 要同步的 symbol 集合
      const toSyncSymbols = new Set(favorites.map((f) => f.symbol));

      // 同步新收藏或更新现有收藏
      let synced = 0;
      for (const favorite of favorites) {
        const key = `favorite:${userId}:${favorite.symbol}`;
        const favoriteData: Favorite = {
          userId,
          symbol: favorite.symbol,
          name: favorite.name ?? null,
          createdAt: new Date().toISOString(),
        };
        await kv.set(key, favoriteData);
        synced++;
      }

      // 删除客户端未提供的收藏（增量同步）
      let removed = 0;
      for (const symbol of existingSymbols) {
        if (!toSyncSymbols.has(symbol)) {
          const key = `favorite:${userId}:${symbol}`;
          await kv.del(key);
          removed++;
        }
      }

      return { synced, removed };
    },
    { synced: 0, removed: 0 }
  );
}

/**
 * 首次加载时从服务端同步到本地
 * 策略：服务端优先，如果服务端有数据则覆盖本地
 */
export async function syncFromServerToLocal(
  userId: string
): Promise<FavoriteItem[]> {
  const serverFavorites = await getFavoritesFromKV(userId);

  if (serverFavorites.length > 0) {
    // 服务端有数据，覆盖本地
    saveFavoritesToLocal(serverFavorites);
    return serverFavorites;
  }

  // 服务端无数据，保持本地数据
  return getFavoritesFromLocal();
}

/**
 * 本地变更时增量同步到服务端
 * 策略：将本地收藏列表同步到服务端
 */
export async function syncFromLocalToServer(
  userId: string
): Promise<{ synced: number; removed: number }> {
  const localFavorites = getFavoritesFromLocal();
  return syncFavoritesToKV(userId, localFavorites);
}

/**
 * 双向同步：首次加载时的完整同步流程
 * 1. 尝试从服务端读取
 * 2. 如果服务端有数据，覆盖本地
 * 3. 如果服务端无数据，保持本地，并同步到服务端
 */
export async function performInitialSync(
  userId: string
): Promise<FavoriteItem[]> {
  const serverFavorites = await getFavoritesFromKV(userId);
  const localFavorites = getFavoritesFromLocal();

  if (serverFavorites.length > 0) {
    // 服务端优先：覆盖本地
    saveFavoritesToLocal(serverFavorites);
    return serverFavorites;
  }

  // 服务端无数据，将本地数据同步到服务端
  if (localFavorites.length > 0) {
    await syncFavoritesToKV(userId, localFavorites);
  }

  return localFavorites;
}
