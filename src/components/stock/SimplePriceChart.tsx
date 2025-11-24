/**
 * 使用 TradingView Lightweight Charts 的 K 线图组件
 */

"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  createChart,
  ColorType,
  ISeriesApi,
  CandlestickSeries,
} from "lightweight-charts";
import { LIMITS } from "@/constants/stock";
import type { StockResponse } from "@/types/stock";

type SimplePriceChartProps = {
  data: StockResponse;
};

// 将毫秒时间戳转换为 YYYY-MM-DD 格式
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function SimplePriceChart({ data }: SimplePriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const recentCandles = useMemo(() => {
    const all = data.candles;
    if (all.length <= LIMITS.recentCandlesDays) {
      return all;
    }
    return all.slice(-LIMITS.recentCandlesDays);
  }, [data.candles]);

  // 转换数据格式为 lightweight-charts 需要的格式
  const chartData = useMemo(() => {
    return recentCandles.map((candle) => ({
      time: formatTime(candle.time) as unknown as string, // YYYY-MM-DD 格式
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));
  }, [recentCandles]);

  useEffect(() => {
    if (!chartContainerRef.current || chartData.length === 0) {
      return;
    }

    // 创建图表
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#f8fafc" },
        textColor: "#64748b",
      },
      grid: {
        vertLines: { color: "#e2e8f0", style: 1, visible: true },
        horzLines: { color: "#e2e8f0", style: 1, visible: true },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      rightPriceScale: {
        borderColor: "#e2e8f0",
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: "#e2e8f0",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1, // 十字线模式
      },
    });

    chartRef.current = chart;

    // 添加 K 线系列（Lightweight Charts v5 采用 addSeries API）
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    }) as ISeriesApi<"Candlestick">;

    candlestickSeriesRef.current = candlestickSeries;

    // 设置数据
    candlestickSeries.setData(chartData);

    // 添加关键价位线
    const highestPrice = data.highest?.price ?? null;
    const targetPrice = data.target80.price;
    const currentPrice = data.current.price;

    if (highestPrice !== null) {
      candlestickSeries.createPriceLine({
        price: highestPrice,
        color: "#f97316",
        lineWidth: 1,
        lineStyle: 2, // 虚线
        axisLabelVisible: true,
        title: `最高 ${highestPrice.toFixed(2)}`,
      });
    }

    if (targetPrice !== null) {
      candlestickSeries.createPriceLine({
        price: targetPrice,
        color: "#22c55e",
        lineWidth: 1,
        lineStyle: 2, // 虚线
        axisLabelVisible: true,
        title: `-80% 点位 ${targetPrice.toFixed(2)}`,
      });
    }

    candlestickSeries.createPriceLine({
      price: currentPrice,
      color: "#64748b",
      lineWidth: 1,
      lineStyle: 2, // 虚线
      axisLabelVisible: true,
      title: `当前 ${currentPrice.toFixed(2)}`,
    });

    // 响应式调整
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    // 清理函数
    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candlestickSeriesRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData, data.highest?.price, data.target80.price, data.current.price]);

  if (recentCandles.length === 0) {
    return (
      <p className="text-xs text-slate-400">暂无足够的日 K 数据用于绘图。</p>
    );
  }

  return (
    <div className="w-full">
      <div
        ref={chartContainerRef}
        className="w-full"
        style={{ height: "400px" }}
      />
    </div>
  );
}
