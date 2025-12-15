/**
 * 用户标识工具（UUID 生成、存储）
 */

import { v4 as uuidv4 } from "uuid";

const USER_ID_KEY = "stock_view_user_id";
const USER_ID_COOKIE_KEY = "stock_view_user_id";

/**
 * 生成新的用户 ID（UUID v4）
 */
export function generateUserId(): string {
  return uuidv4();
}

/**
 * 从 localStorage 获取用户 ID
 * 如果不存在，生成新 ID 并存储
 */
export function getUserIdFromStorage(): string {
  if (typeof window === "undefined") {
    // 服务端环境，返回空字符串
    return "";
  }

  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    userId = generateUserId();
    localStorage.setItem(USER_ID_KEY, userId);
  }

  return userId;
}

/**
 * 从 cookie 获取用户 ID（服务端使用）
 */
export function getUserIdFromCookie(
  cookieHeader?: string | null
): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const userIdCookie = cookies.find((c) =>
    c.startsWith(`${USER_ID_COOKIE_KEY}=`)
  );

  if (!userIdCookie) return null;

  return userIdCookie.split("=")[1] || null;
}

/**
 * 设置用户 ID 到 cookie（服务端响应头）
 */
export function setUserIdCookie(userId: string): string {
  return `${USER_ID_COOKIE_KEY}=${userId}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

/**
 * 验证用户 ID 格式（UUID v4）
 */
export function isValidUserId(userId: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(userId);
}
