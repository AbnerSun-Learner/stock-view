/**
 * 收藏与微信推送相关类型定义
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

export type WeChatBindingStatus = "active" | "revoked";

export interface WeChatBinding {
  userId: string;
  contact: string;
  openId: string;
  unionId?: string;
  boundAt: string;
  status: WeChatBindingStatus;
}

export type PushLogStatus = "success" | "failed";

export interface PushLogItem {
  symbol: string;
  name: string;
  highestClose: number;
  latestClose: number;
  target80: number;
  expectedDropPct: number;
}

export interface PushLog {
  userId: string;
  contact: string;
  sentAt: string;
  items: PushLogItem[];
  status: PushLogStatus;
  retryCount: number;
  error?: string;
  dedupKey: string;
}
