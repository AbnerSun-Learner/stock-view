/**
 * 收藏相关类型定义
 */

export type ContactType = "phone" | "email";

export interface UserIdentity {
  userId: string;
  contact: string;
  contactType: ContactType;
  createdAt: string;
}

export interface Favorite {
  userId: string;
  symbol: string;
  name: string | null;
  createdAt: string;
}

export interface PriceSnapshot {
  symbol: string;
  highestClose: number;
  latestClose: number;
  target80: number;
  expectedDropPct: number;
  fetchedAt: string;
}

