/**
 * 概览卡片组件
 */

import {
  calculateDropFromHighest,
  calculateDropToTarget80,
  formatDate,
  formatEtfLabel,
  formatTimeSince,
} from "@/lib/utils";
import type { EtfResponse } from "@/types/stock";
import {
  QuestionCircleOutlined,
  StarFilled,
  StarOutlined,
} from "@ant-design/icons";
import { Tooltip } from "antd";

type OverviewCardProps = {
  data: EtfResponse;
  expectedDropPercent: number | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
};

// 趋势指示组件
function TrendIndicator({
  currentPrice,
  highestPrice,
  target80Price,
}: {
  currentPrice: number;
  highestPrice: number | null;
  target80Price: number | null;
}) {
  if (!highestPrice || target80Price === null) {
    return null;
  }

  // 计算当前价在最高价和-80%点位之间的位置（0-1之间）
  const range = highestPrice - target80Price;
  const position = range > 0 ? (currentPrice - target80Price) / range : 0.5;

  // 判断当前价相对于最高价和-80%点位的位置
  const isAboveTarget80 = currentPrice >= target80Price;
  const isBelowHighest = currentPrice < highestPrice;

  // 根据位置决定颜色和箭头方向
  let colorClass = "text-slate-600";
  let arrow = "→";
  let bgColorClass = "bg-slate-100";

  if (currentPrice >= highestPrice) {
    // 当前价高于或等于最高价
    colorClass = "text-rose-600";
    arrow = "↑";
    bgColorClass = "bg-rose-50";
  } else if (currentPrice <= target80Price) {
    // 当前价低于或等于-80%点位
    colorClass = "text-emerald-600";
    arrow = "↓";
    bgColorClass = "bg-emerald-50";
  } else {
    // 当前价在最高价和-80%点位之间
    if (position > 0.5) {
      // 更接近最高价
      colorClass = "text-amber-600";
      arrow = "↘";
      bgColorClass = "bg-amber-50";
    } else {
      // 更接近-80%点位
      colorClass = "text-blue-600";
      arrow = "↘";
      bgColorClass = "bg-blue-50";
    }
  }

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bgColorClass} ${colorClass}`}
    >
      <span className="text-sm">{arrow}</span>
      <span>
        {isAboveTarget80 && isBelowHighest
          ? "介于最高价与-80%点位之间"
          : currentPrice >= highestPrice
          ? "已超过最高价"
          : "已低于-80%点位"}
      </span>
    </div>
  );
}

export function OverviewCard({
  data,
  expectedDropPercent,
  isFavorite,
  onToggleFavorite,
}: OverviewCardProps) {
  // 计算跌幅百分比
  const dropFromHighest =
    data.highest && data.current
      ? calculateDropFromHighest(data.current.price, data.highest.price)
      : null;

  const dropToTarget80 =
    data.target80.price !== null && data.current
      ? calculateDropToTarget80(data.current.price, data.target80.price)
      : null;

  // 计算时间差
  const timeSinceHighest = data.highest
    ? formatTimeSince(data.highest.time)
    : null;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {formatEtfLabel(data.symbol, data.name)}
          </h2>
          <div className="mt-1 text-[11px] text-slate-400">
            最近交易日：{formatDate(data.current.time)}
          </div>
        </div>
        <button
          onClick={onToggleFavorite}
          aria-label={isFavorite ? "取消收藏" : "收藏"}
          className="flex h-8 w-8 items-center justify-center text-slate-700 transition hover:text-amber-500"
        >
          {isFavorite ? (
            <StarFilled className="text-amber-500" />
          ) : (
            <StarOutlined />
          )}
        </button>
      </div>

      {/* 趋势指示 */}
      {data.highest && data.target80.price !== null && (
        <div className="mb-4">
          <TrendIndicator
            currentPrice={data.current.price}
            highestPrice={data.highest.price}
            target80Price={data.target80.price}
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-[10px] text-[11px] text-slate-500">
            <span>历史最高价</span>
            <Tooltip
              title={() => (
                <div className="mt-0.5 text-[11px] text-slate-400">
                  日期：{data.highest ? formatDate(data.highest.time) : "--"}
                </div>
              )}
            >
              <QuestionCircleOutlined className="cursor-pointer" />
            </Tooltip>
          </div>
          <div className="mt-1 text-base font-semibold text-slate-900">
            {data.highest ? data.highest.price.toFixed(3) : "--"}
          </div>

          {timeSinceHighest && (
            <div className="mt-1 text-[11px] text-rose-600 font-medium">
              距离最高价已过去 {timeSinceHighest}
            </div>
          )}
        </div>

        <div>
          <div className="text-[11px] text-slate-500">
            -80% 目标价位（0.2×最高）
          </div>
          <div className="mt-1 text-base font-semibold text-emerald-600">
            {data.target80.price === null
              ? "--"
              : data.target80.price.toFixed(3)}
          </div>
          {dropToTarget80 !== null && (
            <div className="mt-1 text-[11px] text-slate-600">
              {dropToTarget80 > 0 ? (
                <span className="text-amber-600">
                  距离 -80% 点位还需跌 {dropToTarget80.toFixed(1)}%
                </span>
              ) : (
                <span className="text-emerald-600">
                  已低于 -80% 点位 {Math.abs(dropToTarget80).toFixed(1)}%
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="text-[11px] text-slate-500">当前收盘价</div>
          <div className="mt-1 text-base font-semibold text-slate-900">
            {data.current.price.toFixed(3)}
          </div>
          {dropFromHighest !== null && (
            <div className="mt-1 text-[11px] text-rose-600 font-medium">
              相对最高价跌幅 {dropFromHighest.toFixed(1)}%
            </div>
          )}
        </div>

        <div>
          <div className="text-[11px] text-slate-500">
            当前距离 -80% 的预期跌幅
          </div>
          <div className="mt-1 text-base font-semibold">
            {expectedDropPercent === null
              ? "--"
              : `${expectedDropPercent.toFixed(1)}%`}
          </div>
        </div>
      </div>
    </div>
  );
}
