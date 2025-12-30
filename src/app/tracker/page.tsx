"use client";

/**
 * 点位追踪页面
 * 完全按照 demo.jsx 的 PageTracker 功能和UI实现
 */

import { Info, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { TerminalLayout } from "@/components/etf-terminal/layout";
import { InputGroup } from "@/components/etf-terminal/shared-components";
import {
  fetchPriceByCode,
  getEffectiveTradingDate,
} from "@/lib/etf-terminal-utils";
import { supabase } from "@/lib/supabase-client";

const appId = "etf-manager-default";

interface PointTrackerItem {
  id: number;
  name: string;
  code: string;
  current: number;
  min: number;
  max: number;
  note?: string;
  lastUpdated?: string;
}

interface FavoritesState {
  pointTrackers: PointTrackerItem[];
}

async function loadUserSettings(userId: string): Promise<FavoritesState> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("point_trackers")
    .eq("user_id", userId)
    .eq("app_id", appId)
    .maybeSingle();

  if (error || !data) {
    return { pointTrackers: [] };
  }

  return {
    pointTrackers: data.point_trackers || [],
  };
}

async function saveToFirestore(
  userId: string,
  newData: FavoritesState
): Promise<void> {
  try {
    await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        app_id: appId,
        point_trackers: newData.pointTrackers,
      },
      {
        onConflict: "user_id,app_id",
      }
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Save error:", err);
  }
}

export default function TrackerPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [userId, setUserId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoritesState>({
    pointTrackers: [],
  });
  const [newItem, setNewItem] = useState({
    name: "",
    code: "",
    current: 0,
    min: 0,
    max: 0,
    note: "",
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 初始化用户ID（模拟匿名登录）
  useEffect(() => {
    const tempUserId = localStorage.getItem("etf_terminal_temp_user_id");
    if (tempUserId) {
      setUserId(tempUserId);
    } else {
      const newTempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem("etf_terminal_temp_user_id", newTempId);
      setUserId(newTempId);
    }
  }, []);

  // 加载用户数据
  useEffect(() => {
    if (!userId) return;

    loadUserSettings(userId).then((data) => {
      setFavorites(data);
    });
  }, [userId]);

  const refreshAllPrices = useCallback(async () => {
    if (!userId || !favorites.pointTrackers || favorites.pointTrackers.length === 0)
      return;
    setIsRefreshing(true);
    try {
      const updatedTrackers = await Promise.all(
        favorites.pointTrackers.map(async (item) => {
          if (item.code) {
            const data = await fetchPriceByCode(item.code);
            return { ...item, current: data.current, lastUpdated: data.date };
          }
          return item;
        })
      );
      const newFavorites = { ...favorites, pointTrackers: updatedTrackers };
      setFavorites(newFavorites);
      saveToFirestore(userId, newFavorites);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Refresh error:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [favorites, userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (favorites.pointTrackers?.some((t) => t.code && !t.lastUpdated)) {
        refreshAllPrices();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [favorites.pointTrackers, refreshAllPrices]);

  const addTracker = () => {
    if (!userId || !newItem.name) return;
    const list = favorites.pointTrackers || [];
    const newList = [
      ...list,
      { ...newItem, id: Date.now(), lastUpdated: "未同步" },
    ];
    const newFavorites = { ...favorites, pointTrackers: newList };
    setFavorites(newFavorites);
    saveToFirestore(userId, newFavorites);
    setNewItem({ name: "", code: "", current: 0, min: 0, max: 0, note: "" });
  };

  const removeTracker = (id: number) => {
    if (!userId) return;
    const newList = (favorites.pointTrackers || []).filter((t) => t.id !== id);
    const newFavorites = { ...favorites, pointTrackers: newList };
    setFavorites(newFavorites);
    saveToFirestore(userId, newFavorites);
  };

  const updateField = (id: number, field: string, val: string | number) => {
    if (!userId) return;
    const newList = (favorites.pointTrackers || []).map((t) =>
      t.id === id ? { ...t, [field]: val } : t
    );
    const newFavorites = { ...favorites, pointTrackers: newList };
    setFavorites(newFavorites);
    saveToFirestore(userId, newFavorites);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <TerminalLayout theme={theme} onToggleTheme={toggleTheme}>
      <div className="space-y-6">
        <div
          className={`p-6 rounded-2xl border ${
            theme === "dark"
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-slate-200 shadow-sm"
          }`}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">点位管理</h2>
            <button
              onClick={refreshAllPrices}
              disabled={isRefreshing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                isRefreshing
                  ? "bg-slate-200 text-slate-500"
                  : "bg-blue-100 text-blue-600 hover:bg-blue-200"
              }`}
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? "animate-spin" : ""}
              />
              {isRefreshing ? "同步中..." : "同步最新价格"}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
            <InputGroup
              label="标的名称"
              value={newItem.name}
              onChange={(v) => setNewItem({ ...newItem, name: v })}
            />
            <InputGroup
              label="标的代码"
              value={newItem.code}
              onChange={(v) => setNewItem({ ...newItem, code: v })}
            />
            <InputGroup
              label="历史低点"
              type="number"
              value={newItem.min}
              onChange={(v) =>
                setNewItem({ ...newItem, min: v === "" ? 0 : Number.parseFloat(v) })
              }
            />
            <InputGroup
              label="历史高点"
              type="number"
              value={newItem.max}
              onChange={(v) =>
                setNewItem({ ...newItem, max: v === "" ? 0 : Number.parseFloat(v) })
              }
            />
            <InputGroup
              label="初始点位"
              type="number"
              value={newItem.current}
              onChange={(v) =>
                setNewItem({
                  ...newItem,
                  current: v === "" ? 0 : Number.parseFloat(v),
                })
              }
            />
            <button
              onClick={addTracker}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <Plus size={20} /> 添加
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {(favorites.pointTrackers || []).map((item) => {
            const range = item.max - item.min;
            const pos =
              range <= 0 ? 0 : ((item.current - item.min) / range) * 100;
            const clampedPos = Math.max(0, Math.min(100, pos));
            return (
              <div
                key={item.id}
                className={`p-6 rounded-2xl border ${
                  theme === "dark"
                    ? "bg-slate-800 border-slate-700"
                    : "bg-white border-slate-200"
                } shadow-sm`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">{item.name}</h3>
                      {item.code && (
                        <span className="text-xs font-mono opacity-50">
                          #{item.code}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded opacity-60">
                        区间: {item.min} - {item.max}
                      </span>
                      <span className="text-[10px] opacity-40">
                        上次更新: {item.lastUpdated || "未知"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="text-xs opacity-50 mb-1">当前点位</span>
                      <input
                        type="number"
                        className="w-24 p-1 text-lg bg-transparent border-b border-blue-500 font-bold text-right outline-none"
                        value={Number.isNaN(item.current) ? "" : item.current}
                        onChange={(e) =>
                          updateField(
                            item.id,
                            "current",
                            e.target.value === ""
                              ? 0
                              : Number.parseFloat(e.target.value)
                          )
                        }
                      />
                    </div>
                    <button
                      onClick={() => removeTracker(item.id)}
                      className="p-2 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
                <div className="relative pt-6 pb-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full relative">
                    <div
                      className="absolute h-8 w-1 -top-2 bg-blue-600 z-10 shadow-lg transition-all duration-700"
                      style={{ left: `${clampedPos}%` }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-slate-800 px-1 rounded shadow-sm border border-blue-100">
                        {clampedPos.toFixed(1)}%
                      </div>
                    </div>
                    <div className="absolute left-0 -bottom-6 text-[10px] opacity-60">
                      最低 {item.min}
                    </div>
                    <div className="absolute right-0 -bottom-6 text-[10px] opacity-60">
                      最高 {item.max}
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex gap-2 items-center border-t border-slate-50 dark:border-slate-700 pt-3">
                  <Info size={14} className="opacity-40" />
                  <input
                    type="text"
                    placeholder="备注内容..."
                    className="flex-1 bg-transparent text-sm italic opacity-70 outline-none border-b border-transparent focus:border-slate-300"
                    value={item.note || ""}
                    onChange={(e) => updateField(item.id, "note", e.target.value)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </TerminalLayout>
  );
}

