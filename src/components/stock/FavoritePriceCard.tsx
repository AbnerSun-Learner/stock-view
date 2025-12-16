/**
 * 收藏 ETF 价格信息卡片组件
 */

import { calculateDropFromHighest, formatEtfLabel } from "@/lib/utils";
import type { EtfResponse } from "@/types/stock";
import { StarFilled } from "@ant-design/icons";

interface FavoritePriceCardProps {
  symbol: string;
  name: string | null;
  data: EtfResponse | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onClick?: () => void;
  onUnfavorite?: () => void;
}

export function FavoritePriceCard({
  symbol,
  name,
  data,
  loading = false,
  error = null,
  onRetry,
  onClick,
  onUnfavorite,
}: FavoritePriceCardProps) {
  const handleClick = () => {
    if (onClick && !loading && !error) {
      onClick();
    }
  };

  const dropFromHighestPercent =
    data && data.highest
      ? calculateDropFromHighest(data.current.price, data.highest.price)
      : null;

  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 transition-all ${
        onClick && !loading && !error
          ? "cursor-pointer hover:shadow-md hover:ring-slate-300"
          : ""
      }`}
      onClick={handleClick}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          {formatEtfLabel(symbol, name)}
        </h3>
        <div className="flex items-center gap-3">
          {dropFromHighestPercent !== null &&
            Number.isFinite(dropFromHighestPercent) && (
              <span className="text-xs font-medium text-slate-500">
                距最高价{" "}
                <span
                  className={
                    dropFromHighestPercent > 0
                      ? "text-emerald-600"
                      : "text-slate-700"
                  }
                >
                  {dropFromHighestPercent > 0
                    ? `-${dropFromHighestPercent.toFixed(1)}%`
                    : "0.0%"}
                </span>
              </span>
            )}
          {onUnfavorite && (
            <button
              type="button"
              aria-label="取消收藏"
              onClick={(e) => {
                e.stopPropagation();
                onUnfavorite();
              }}
              className="flex h-6 w-6 items-center justify-center text-amber-500 hover:text-amber-600"
            >
              <StarFilled />
            </button>
          )}
          {loading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          )}
        </div>
      </div>

      {loading && !data && (
        <div className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
        </div>
      )}

      {error && (
        <div className="space-y-2">
          <p className="text-xs text-red-600">{error}</p>
          {onRetry && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              className="text-xs text-sky-600 hover:text-sky-700"
            >
              重试
            </button>
          )}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-3">
          {/* 历史最高价 */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">历史最高价</span>
            <span className="text-sm font-semibold text-slate-900">
              {data.highest?.price.toFixed(3) ?? "—"}
            </span>
          </div>

          {/* 当前收盘价 */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">当前收盘价</span>
            <span className="text-sm font-semibold text-slate-900">
              {data.current.price.toFixed(3)}
            </span>
          </div>

          {/* -80% 目标价位 */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">-80% 目标价位</span>
            <span className="text-sm font-semibold text-slate-900">
              {data.target80.price?.toFixed(3) ?? "—"}
            </span>
          </div>

          {/* 预期跌幅百分比 */}
          {data.expectedDropRatio !== null && (
            <div className="mt-3 rounded-lg bg-slate-50 p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">预期跌幅</span>
                <span
                  className={`text-xs font-semibold ${
                    data.expectedDropRatio > 0
                      ? "text-rose-600"
                      : "text-emerald-600"
                  }`}
                >
                  {(data.expectedDropRatio * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
