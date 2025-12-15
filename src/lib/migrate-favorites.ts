/**
 * 收藏数据迁移工具（localStorage → Vercel KV）
 */

import { getFavoritesFromLocal, syncFavoritesToKV } from "./favorites-store";
import { getUserIdFromStorage } from "./user-id";

/**
 * 迁移本地收藏到服务端
 * 返回迁移结果
 */
export async function migrateFavoritesToServer(): Promise<{
  success: boolean;
  migrated: number;
  error?: string;
}> {
  try {
    const userId = getUserIdFromStorage();
    if (!userId) {
      return {
        success: false,
        migrated: 0,
        error: "无法获取用户 ID",
      };
    }

    const localFavorites = getFavoritesFromLocal();
    if (localFavorites.length === 0) {
      return {
        success: true,
        migrated: 0,
      };
    }

    const result = await syncFavoritesToKV(userId, localFavorites);
    return {
      success: true,
      migrated: result.synced,
    };
  } catch (error) {
    console.error("Failed to migrate favorites:", error);
    return {
      success: false,
      migrated: 0,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}
