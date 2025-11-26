/**
 * ETF相关类型定义
 */

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type PricePoint = {
  price: number;
  time: number;
};

export type EtfResponse = {
  symbol: string;
  name: string | null;
  highest: PricePoint | null;
  target80: { price: number | null };
  current: PricePoint;
  expectedDropRatio: number | null;
  candles: Candle[];
};

export type FavoriteItem = {
  symbol: string;
  name: string | null;
};

export type HistoryItem = {
  symbol: string;
  name: string | null;
  time: number;
};
