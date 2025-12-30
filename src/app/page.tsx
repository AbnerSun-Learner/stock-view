/**
 * 首页：默认展示 7080 指数页面
 */

"use client";

import { TerminalLayout } from "@/components/etf-terminal/layout";
import {
  fetchIndexData as fetchIndexDataFromAPI,
  formatNum,
} from "@/lib/etf-terminal-utils";
import { supabase } from "@/lib/supabase-client";
import { Search, Star } from "lucide-react";
import { useEffect, useState } from "react";

const appId = "etf-manager-default";

interface Index7080Item {
  name: string;
  code: string;
  current: number;
  peak: number;
  peakDate: string;
  tradingDate: string;
}

interface FavoritesState {
  indices7080: Index7080Item[];
}

async function loadUserSettings(userId: string): Promise<FavoritesState> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("indices7080")
    .eq("user_id", userId)
    .eq("app_id", appId)
    .maybeSingle();

  if (error || !data) {
    return { indices7080: [] };
  }

  return {
    indices7080: data.indices7080 || [],
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
        indices7080: newData.indices7080,
      },
      {
        onConflict: "user_id,app_id",
      }
    );
  } catch (err) {
    console.error("Save error:", err);
  }
}

function ResultCard({
  item,
  metrics,
  onFavorite,
  isFav,
  theme,
}: {
  item: Index7080Item;
  metrics: { dropFromPeak: number; target70: number; distTo70: number };
  onFavorite: () => void;
  isFav: boolean;
  theme: "light" | "dark";
}) {
  const { dropFromPeak, target70, distTo70 } = metrics;
  return (
    <div
      className={`p-5 rounded-2xl border ${
        theme === "dark"
          ? "bg-slate-800 border-slate-700"
          : "bg-white border-slate-200"
      } shadow-sm relative overflow-hidden`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-lg font-bold">
            {item.name}{" "}
            <span className="text-sm font-normal opacity-60">
              ({item.code})
            </span>
          </h4>
          <p className="text-2xl font-mono font-bold mt-1 text-blue-500">
            {formatNum(item.current)}
          </p>
        </div>
        <button
          onClick={onFavorite}
          className={`p-2 rounded-full ${
            isFav ? "text-yellow-500" : "text-slate-400 hover:text-yellow-500"
          }`}
        >
          <Star fill={isFav ? "currentColor" : "none"} size={24} />
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>距离历史最高 ({formatNum(item.peak)})</span>
            <span className="font-bold text-red-500">
              已跌 {formatNum(dropFromPeak)}%
            </span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500"
              style={{ width: `${Math.min(100, dropFromPeak)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>距离跌幅 70% 底部 ({formatNum(target70)})</span>
            <span className="font-bold text-green-500">
              尚余 {formatNum(distTo70)}% 跌幅
            </span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500"
              style={{ width: `${Math.max(0, 100 - distTo70)}%` }}
            />
          </div>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-[10px] opacity-50 flex justify-between">
        <span>数据交易日: {item.tradingDate}</span>
        <span>历史最高日期: {item.peakDate}</span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [userId, setUserId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoritesState>({
    indices7080: [],
  });
  const [searchCode, setSearchCode] = useState("");
  const [currentResult, setCurrentResult] = useState<Index7080Item | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  // 初始化用户ID（模拟匿名登录）
  useEffect(() => {
    const tempUserId = localStorage.getItem("etf_terminal_temp_user_id");
    if (tempUserId) {
      setUserId(tempUserId);
    } else {
      const newTempId = `temp_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 11)}`;
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

  const fetchIndexData = async () => {
    if (!searchCode || loading) return;
    setLoading(true);
    try {
      const data = await fetchIndexDataFromAPI(searchCode);
      const result: Index7080Item = {
        name: data.name || searchCode,
        code: searchCode,
        current: data.current,
        peak: data.peak,
        peakDate: data.peakDate,
        tradingDate: data.tradingDate,
      };
      setCurrentResult(result);
    } catch (error) {
      console.error("查询指数失败:", error);
      alert("查询失败，请检查代码是否正确");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      fetchIndexData();
    }
  };

  const handleFavorite = (item: Index7080Item) => {
    if (!userId) return;
    const list = favorites.indices7080 || [];
    const exists = list.find((i) => i.code === item.code);
    const newList = exists
      ? list.filter((i) => i.code !== item.code)
      : [...list, item];
    const newFavorites = { ...favorites, indices7080: newList };
    setFavorites(newFavorites);
    saveToFirestore(userId, newFavorites);
  };

  const calculateMetrics = (curr: number, peak: number) => {
    const dropFromPeak = ((peak - curr) / peak) * 100;
    const target70 = peak * 0.3;
    const distTo70 = ((curr - target70) / curr) * 100;
    return { dropFromPeak, target70, distTo70 };
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <TerminalLayout theme={theme} onToggleTheme={toggleTheme}>
      <div className="space-y-6">
        <section
          className={`p-6 rounded-2xl ${
            theme === "dark" ? "bg-slate-800" : "bg-white"
          } shadow-sm border border-transparent dark:border-slate-700`}
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Search className="text-blue-500" /> 指数查询 (数据源: 东方财富)
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="输入指数代码 (如: 000300)"
              className={`flex-1 p-3 rounded-lg border ${
                theme === "dark"
                  ? "bg-slate-900 border-slate-700"
                  : "bg-slate-50 border-slate-200"
              } outline-none focus:ring-2 focus:ring-blue-500`}
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              onClick={fetchIndexData}
              disabled={loading || !searchCode}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {loading ? "查询中..." : "查询"}
            </button>
          </div>
        </section>

        {currentResult && (
          <ResultCard
            item={currentResult}
            metrics={calculateMetrics(
              currentResult.current,
              currentResult.peak
            )}
            onFavorite={() => handleFavorite(currentResult)}
            isFav={favorites.indices7080?.some(
              (i) => i.code === currentResult.code
            )}
            theme={theme}
          />
        )}

        {favorites.indices7080?.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold mb-4">我的收藏</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {favorites.indices7080.map((item) => (
                <ResultCard
                  key={item.code}
                  item={item}
                  metrics={calculateMetrics(item.current, item.peak)}
                  onFavorite={() => handleFavorite(item)}
                  isFav
                  theme={theme}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </TerminalLayout>
  );
}
