/**
 * 搜索框组件（包含历史记录展示，最多 4 条）
 */

import { formatEtfLabel } from "@/lib/utils";
import type { HistoryItem } from "@/types/stock";

type SearchBoxProps = {
  symbol: string;
  loading: boolean;
  history: HistoryItem[];
  onSymbolChange: (value: string) => void;
  onSearch: () => void;
  onClearCache: () => void;
  onHistoryClick: (symbol: string) => void;
};

export function SearchBox({
  symbol,
  loading,
  history,
  onSymbolChange,
  onSearch,
  onClearCache,
  onHistoryClick,
}: SearchBoxProps) {
  const recentHistory = history.slice(0, 4);

  return (
    <section className="w-full max-w-2xl">
      <div className="flex items-center rounded-full bg-white shadow-lg shadow-slate-200/60 ring-1 ring-slate-200">
        <input
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value)}
          placeholder="输入 ETF 代码"
          className="flex-1 rounded-full bg-transparent px-6 py-3 text-sm outline-none placeholder:text-slate-400"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSearch();
            }
          }}
        />
        <button
          onClick={onSearch}
          className="mr-2 rounded-full bg-sky-500 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={loading || !symbol.trim()}
        >
          {loading ? "查询中..." : "查询"}
        </button>
      </div>

      {recentHistory.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {recentHistory.map((item) => (
            <button
              key={`${item.symbol}-${item.time}`}
              onClick={() => onHistoryClick(item.symbol)}
              className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-700 transition-colors hover:bg-slate-200"
            >
              {formatEtfLabel(item.symbol, item.name)}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          数据源：东方财富网日度前复权数据（实时更新）。
        </p>
      </div>
    </section>
  );
}
