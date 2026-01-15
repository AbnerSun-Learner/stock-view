import { useEffect, useState } from "react";
import { loadUserSchemes, saveSchemeToSupabase } from "@/lib/grid-utils";
import type { GridParams, GridRow, SavedScheme, StressTest } from "@/types/grid";

interface UseGridSchemesProps {
  isAuthenticated: boolean;
  userId?: string;
}

export function useGridSchemes({ isAuthenticated, userId }: UseGridSchemesProps) {
  const [savedSchemes, setSavedSchemes] = useState<SavedScheme[]>([]);

  // 初始化：加载本地存储的方案
  useEffect(() => {
    const saved = localStorage.getItem("gridTradingSchemes");
    if (saved) {
      try {
        setSavedSchemes(JSON.parse(saved));
      } catch (error) {
        console.error("加载本地方案失败:", error);
      }
    }
  }, []);

  // 加载用户保存的方案
  useEffect(() => {
    if (isAuthenticated && userId) {
      loadUserSchemes(userId).then((data) => {
        if (data.length > 0) {
          setSavedSchemes(data);
        }
      });
    }
  }, [isAuthenticated, userId]);

  const saveScheme = async (
    schemeName: string,
    params: GridParams,
    gridData: GridRow[],
    stressTest: StressTest
  ): Promise<void> => {
    if (!schemeName.trim()) {
      throw new Error("请输入方案名称");
    }
    if (gridData.length === 0 || !stressTest) {
      throw new Error("请先生成网格");
    }

    if (!stressTest) {
      throw new Error("请先生成网格");
    }

    const newScheme: SavedScheme = {
      id: Date.now().toString(),
      name: schemeName,
      timestamp: Date.now(),
      params,
      gridData,
      stressTest,
    };

    // 如果已登录，保存到 Supabase
    if (isAuthenticated && userId) {
      await saveSchemeToSupabase(userId, newScheme);
      const updated = await loadUserSchemes(userId);
      setSavedSchemes(updated);
    } else {
      // 未登录，保存到本地存储
      const updated = [...savedSchemes, newScheme];
      setSavedSchemes(updated);
      localStorage.setItem("gridTradingSchemes", JSON.stringify(updated));
    }
  };

  return {
    savedSchemes,
    setSavedSchemes,
    saveScheme,
  };
}
