/**
 * 历史记录列表组件
 */

import { formatDate, formatEtfLabel } from "@/lib/utils";
import type { HistoryItem } from "@/types/stock";

type HistoryListProps = {
  history: HistoryItem[];
  onItemClick: (symbol: string) => void;
  onClear: () => void;
};

export function HistoryList({
  history,
  onItemClick,
  onClear,
}: HistoryListProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">历史记录</h2>
        <button
          className="text-[11px] text-slate-400 hover:text-slate-600"
          onClick={onClear}
        >
          清空
        </button>
      </div>
      {history.length === 0 ? (
        <p className="text-xs text-slate-400">
          暂无历史记录。查询记录会自动出现在这里。
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {history.map((item) => (
            <button
              key={`${item.symbol}-${item.time}`}
              onClick={() => onItemClick(item.symbol)}
              className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-200"
            >
              <span className="mr-1 font-medium">
                {formatEtfLabel(item.symbol, item.name)}
              </span>
              <span className="text-[10px] text-slate-400">
                {formatDate(item.time)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
