/**
 * 股票相关常量定义
 */

export const STORAGE_KEYS = {
  favorites: "stock-view:favorites",
  history: "stock-view:history",
} as const;

export const LIMITS = {
  maxFavorites: 50,
  maxHistory: 20,
  recentCandlesDays: 120, // 约 6 个月交易日
} as const;

export const CHART_CONFIG = {
  width: 800,
  height: 260,
  paddingLeft: 40,
  paddingRight: 16,
  paddingTop: 16,
  paddingBottom: 24,
  gridLines: 4,
} as const;
