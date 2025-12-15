/**
 * 收藏存储工具单元测试
 */

import {
  getFavoritesFromLocal,
  saveFavoritesToLocal,
} from "@/lib/favorites-store";
import type { FavoriteItem } from "@/types/stock";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock window
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("favorites-store", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("getFavoritesFromLocal", () => {
    it("应该返回空数组当 localStorage 为空时", () => {
      const result = getFavoritesFromLocal();
      expect(result).toEqual([]);
    });

    it("应该正确解析字符串格式的收藏", () => {
      const favorites = ["510300", "159919"];
      localStorageMock.setItem(
        "stock_view_favorites",
        JSON.stringify(favorites)
      );

      const result = getFavoritesFromLocal();
      expect(result).toEqual([
        { symbol: "510300", name: null },
        { symbol: "159919", name: null },
      ]);
    });

    it("应该正确解析对象格式的收藏", () => {
      const favorites = [
        { symbol: "510300", name: "沪深300ETF" },
        { symbol: "159919", name: null },
      ];
      localStorageMock.setItem(
        "stock_view_favorites",
        JSON.stringify(favorites)
      );

      const result = getFavoritesFromLocal();
      expect(result).toEqual([
        { symbol: "510300", name: "沪深300ETF" },
        { symbol: "159919", name: null },
      ]);
    });

    it("应该过滤无效的收藏项", () => {
      const favorites = [
        { symbol: "510300", name: "沪深300ETF" },
        null,
        "invalid",
        { symbol: "159919" },
      ];
      localStorageMock.setItem(
        "stock_view_favorites",
        JSON.stringify(favorites)
      );

      const result = getFavoritesFromLocal();
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((item) => item.symbol)).toBe(true);
    });
  });

  describe("saveFavoritesToLocal", () => {
    it("应该保存收藏到 localStorage", () => {
      const favorites: FavoriteItem[] = [
        { symbol: "510300", name: "沪深300ETF" },
        { symbol: "159919", name: null },
      ];

      saveFavoritesToLocal(favorites);

      const stored = localStorageMock.getItem("stock_view_favorites");
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual(favorites);
    });

    it("应该限制收藏数量为 50", () => {
      const favorites: FavoriteItem[] = Array.from({ length: 60 }, (_, i) => ({
        symbol: `51030${i}`,
        name: null,
      }));

      saveFavoritesToLocal(favorites);

      const stored = localStorageMock.getItem("stock_view_favorites");
      const parsed = JSON.parse(stored!);
      expect(parsed.length).toBe(50);
    });
  });
});
