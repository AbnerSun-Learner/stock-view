import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// 内存缓存，1小时过期
const memoryCache = new Map<
  string,
  { timestamp: number; data: unknown }
>();

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 小时

interface EastMoneyResponse {
  rc: number;
  rt: number;
  svr: number;
  lt: number;
  full: number;
  data?: {
    klines?: string[];
  };
}

/**
 * 将指数代码转换为东方财富的 secid 格式
 * 000001 -> 1.000001 (上证指数)
 * 399001 -> 0.399001 (深证成指)
 * 930955 -> 0.930955 (中证指数)
 */
function normalizeIndexCode(code: string): string {
  const normalized = code.trim();
  if (normalized.startsWith("000")) {
    return `1.${normalized}`; // 上证指数
  }
  if (normalized.startsWith("399") || normalized.startsWith("9")) {
    return `0.${normalized}`; // 深证/中证指数
  }
  return `1.${normalized}`; // 默认上证
}

/**
 * 解析东方财富返回的 K 线数据
 * 格式：日期,开盘,收盘,最高,最低,成交量,成交额,振幅,涨跌幅,涨跌额,换手率
 */
function parseKlineData(klineStr: string): {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
} | null {
  const parts = klineStr.split(",");
  if (parts.length < 6) {
    return null;
  }

  const date = parts[0];
  const open = parseFloat(parts[1]);
  const close = parseFloat(parts[2]);
  const high = parseFloat(parts[3]);
  const low = parseFloat(parts[4]);
  const volume = parseFloat(parts[5]);

  if (
    isNaN(open) ||
    isNaN(close) ||
    isNaN(high) ||
    isNaN(low) ||
    isNaN(volume)
  ) {
    return null;
  }

  return {
    date,
    open,
    close,
    high,
    low,
    volume,
  };
}

/**
 * 获取指数历史数据
 * 使用东方财富接口：http://push2his.eastmoney.com/api/qt/stock/kline/get
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const startDate = searchParams.get("startDate"); // YYYYMMDD 格式

  if (!symbol) {
    return NextResponse.json({ error: "缺少参数 symbol" }, { status: 400 });
  }

  const cacheKey = `index_${symbol}_${startDate || "all"}`;
  const cached = memoryCache.get(cacheKey);
  const now = Date.now();

  // 检查缓存
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const secid = normalizeIndexCode(symbol);
    
    // 计算日期范围：如果没有指定开始日期，默认获取最近1年的数据
    const endDate = new Date();
    const endDateStr = endDate.toISOString().slice(0, 10).replace(/-/g, "");
    
    let begDateStr = startDate || "";
    if (!begDateStr) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      begDateStr = oneYearAgo.toISOString().slice(0, 10).replace(/-/g, "");
    } else {
      // 如果传入的是 YYYY-MM-DD 格式，转换为 YYYYMMDD
      begDateStr = begDateStr.replace(/-/g, "");
    }

    // 构建东方财富 API URL
    const apiUrl = new URL(
      "http://push2his.eastmoney.com/api/qt/stock/kline/get"
    );
    apiUrl.searchParams.set("secid", secid);
    apiUrl.searchParams.set(
      "fields1",
      "f1,f2,f3,f4,f5,f6"
    ); // 基本信息字段
    apiUrl.searchParams.set(
      "fields2",
      "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61"
    ); // K线数据字段
    apiUrl.searchParams.set("klt", "101"); // 日线
    apiUrl.searchParams.set("fqt", "0"); // 不复权
    apiUrl.searchParams.set("beg", begDateStr);
    apiUrl.searchParams.set("end", endDateStr);

    // 调用东方财富接口
    const response = await fetch(apiUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "http://quote.eastmoney.com/",
      },
      next: { revalidate: 3600 }, // Next.js 缓存 1 小时
    });

    if (!response.ok) {
      throw new Error(`东方财富 API 响应异常: HTTP ${response.status}`);
    }

    const data = (await response.json()) as EastMoneyResponse;

    if (data.rc !== 0 || !data.data?.klines) {
      return NextResponse.json(
        { error: "未获取到数据", rc: data.rc },
        { status: 404 }
      );
    }

    // 解析 K 线数据，并转换日期格式为 YYYY-MM-DD
    const dailyData = data.data.klines
      .map(parseKlineData)
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .map((item) => {
        // 转换日期格式：YYYYMMDD -> YYYY-MM-DD
        let formattedDate = item.date;
        if (/^\d{8}$/.test(item.date)) {
          const year = item.date.slice(0, 4);
          const month = item.date.slice(4, 6);
          const day = item.date.slice(6, 8);
          formattedDate = `${year}-${month}-${day}`;
        }
        return {
          date: formattedDate,
          open: item.open,
          close: item.close,
          high: item.high,
          low: item.low,
          volume: item.volume,
        };
      });

    if (dailyData.length === 0) {
      return NextResponse.json(
        { error: "解析后的数据为空" },
        { status: 404 }
      );
    }

    // 计算历史最高点
    let athPoint = 0;
    let athDate = "";
    dailyData.forEach((item) => {
      if (item.high > athPoint) {
        athPoint = item.high;
        athDate = item.date;
      }
    });

    const result = {
      symbol,
      name: `指数 ${symbol}`,
      daily: dailyData,
      ath_point: athPoint,
      ath_date: athDate,
      current_point: dailyData[dailyData.length - 1]?.close || 0,
      last_update: dailyData[dailyData.length - 1]?.date || "",
    };

    // 更新缓存
    memoryCache.set(cacheKey, { timestamp: now, data: result });

    return NextResponse.json(result);
  } catch (error) {
    console.error("获取指数数据失败:", error);
    const errorMessage =
      error instanceof Error ? error.message : "获取数据失败，请重试";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
