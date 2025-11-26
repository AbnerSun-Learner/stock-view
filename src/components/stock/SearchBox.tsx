/**
 * 搜索框组件
 */

type SearchBoxProps = {
  symbol: string;
  loading: boolean;
  onSymbolChange: (value: string) => void;
  onSearch: () => void;
  onClearCache: () => void;
};

export function SearchBox({
  symbol,
  loading,
  onSymbolChange,
  onSearch,
  onClearCache,
}: SearchBoxProps) {
  return (
    <section className="w-full max-w-2xl">
      <div className="flex items-center rounded-full bg-white shadow-lg shadow-slate-200/60 ring-1 ring-slate-200">
        <input
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value)}
          placeholder="输入 ETF 代码，如：510300（沪深300ETF）、159919（300ETF）"
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
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          数据源：东方财富网日度前复权数据（实时更新）。
        </p>
        <button
          onClick={onClearCache}
          className="text-xs text-slate-500 hover:text-slate-700 underline"
        >
          清除缓存
        </button>
      </div>
    </section>
  );
}
