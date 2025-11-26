/**
 * 收藏列表组件
 */

import { LIMITS } from "@/constants/stock";
import { formatEtfLabel } from "@/lib/utils";
import type { FavoriteItem } from "@/types/stock";
import { CloseOutlined } from "@ant-design/icons";

type FavoritesListProps = {
  favorites: FavoriteItem[];
  onItemClick: (symbol: string) => void;
  onDelete?: (symbol: string) => void;
};

export function FavoritesList({
  favorites,
  onItemClick,
  onDelete,
}: FavoritesListProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">收藏</h2>
        <span className="text-[11px] text-slate-400">
          本地存储 · 最大 {LIMITS.maxFavorites} 条
        </span>
      </div>
      {favorites.length === 0 ? (
        <p className="text-xs text-slate-400">
          暂无收藏。查询ETF后，可在结果区点击「收藏」。
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {favorites.map((item) => (
            <div key={item.symbol} className="group inline-flex">
              <div className="inline-flex items-center rounded-full bg-slate-100 text-xs text-slate-700 transition-colors group-hover:bg-slate-200">
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.symbol);
                    }}
                    className="flex items-center justify-center pl-2 pr-[2px] py-1 text-slate-400 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
                    aria-label={`删除 ${item.symbol}`}
                    title={`删除 ${formatEtfLabel(item.symbol, item.name)}`}
                  >
                    <CloseOutlined className="text-[10px]" />
                  </button>
                )}
                <button
                  onClick={() => onItemClick(item.symbol)}
                  className="rounded-full pr-3 pl-[0px] py-1 text-xs text-slate-700"
                >
                  {formatEtfLabel(item.symbol, item.name)}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
