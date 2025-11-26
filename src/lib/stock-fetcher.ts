/**
 * 多数据源ETF数据获取器 - Node.js 版本
 * 优先使用免费且稳定的数据源
 * 支持多个数据源自动切换，确保稳定性
 *
 * 数据源优先级：
 * 1. 东方财富网（eastmoney.com）- 最稳定
 */

interface DailyRow {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

interface FetcherOutput {
  name: string | null;
  daily?: DailyRow[];
  close_price?: number | null;
  date?: string | null;
}

function safeFloat(value: unknown): number | null {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "None"
  ) {
    return null;
  }
  try {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function normalizeCode(code: string): string {
  let normalized = code.trim().toUpperCase();
  // 移除常见后缀
  normalized = normalized
    .replace(".SZ", "")
    .replace(".SH", "")
    .replace(".BJ", "");
  // 如果是 sz. 或 sh. 前缀，转换为纯数字
  if (
    normalized.startsWith("SZ.") ||
    normalized.startsWith("SH.") ||
    normalized.startsWith("BJ.")
  ) {
    normalized = normalized.split(".", 2)[1] || normalized;
  }
  return normalized;
}

function getMarketPrefix(code: string): string {
  const normalized = normalizeCode(code);
  if (normalized.startsWith("6") || normalized.startsWith("51")) {
    return "sh"; // 上海（股票6开头，ETF 51开头）
  } else if (
    normalized.startsWith("0") ||
    normalized.startsWith("3") ||
    normalized.startsWith("15")
  ) {
    return "sz"; // 深圳（股票0/3开头，ETF 15开头）
  } else if (normalized.startsWith("8") || normalized.startsWith("4")) {
    return "bj"; // 北京
  } else {
    // 默认尝试深圳
    return "sz";
  }
}

function getMarketCodeForApi(code: string): string {
  const normalized = normalizeCode(code);
  if (normalized.startsWith("6") || normalized.startsWith("51")) {
    return "1"; // 上海（股票6开头，ETF 51开头）
  } else if (
    normalized.startsWith("0") ||
    normalized.startsWith("3") ||
    normalized.startsWith("15")
  ) {
    return "0"; // 深圳（股票0/3开头，ETF 15开头）
  } else if (normalized.startsWith("8") || normalized.startsWith("4")) {
    return "0"; // 北京（暂时用深圳代码）
  } else {
    return "0"; // 默认深圳
  }
}

async function fetchFromEastmoney(
  code: string
): Promise<{ name: string | null; daily: DailyRow[] }> {
  const normalizedCode = normalizeCode(code);
  const marketCode = getMarketCodeForApi(normalizedCode);

  // 东方财富K线数据API
  const klineUrl = "http://push2his.eastmoney.com/api/qt/stock/kline/get";
  const params = new URLSearchParams({
    secid: `${marketCode}.${normalizedCode}`,
    ut: "fa5fd1943c7b386f172d6893dbfba10b",
    fields1: "f1,f2,f3,f4,f5,f6",
    fields2: "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61",
    klt: "101", // 日K
    fqt: "1", // 前复权
    beg: "0",
    end: "20500000",
    lmt: "1500", // 增加限制以获取更多历史数据
  });

  // 创建超时控制器
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时

  try {
    const response = await fetch(`${klineUrl}?${params.toString()}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/json,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      data?: {
        name?: string;
        klines?: string[];
      };
    };

    if (!data.data?.klines) {
      return { name: null, daily: [] };
    }

    const klines = data.data.klines;
    const name = data.data.name || null;
    const daily: DailyRow[] = [];

    for (const klineStr of klines) {
      const parts = klineStr.split(",");
      if (parts.length >= 11) {
        const dateStr = parts[0]; // YYYY-MM-DD
        const openPrice = safeFloat(parts[1]);
        const closePrice = safeFloat(parts[2]);
        const highPrice = safeFloat(parts[3]);
        const lowPrice = safeFloat(parts[4]);
        const volume = safeFloat(parts[5]);

        if (dateStr && closePrice !== null) {
          daily.push({
            date: dateStr,
            open: openPrice,
            high: highPrice,
            low: lowPrice,
            close: closePrice,
            volume: volume,
          });
        }
      }
    }

    return { name: name ? name.trim() : null, daily };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("东方财富数据获取失败:", error);
    return { name: null, daily: [] };
  }
}

async function fetchRealtimeDaily(
  code: string
): Promise<{ name: string | null; daily: DailyRow[] }> {
  // 按优先级尝试各个数据源
  const sources = [{ name: "东方财富", fetch: fetchFromEastmoney }];

  let lastError: Error | null = null;
  for (const source of sources) {
    try {
      const { name, daily } = await source.fetch(code);
      if (daily && daily.length > 0) {
        // 确保至少有一条有效数据
        const validData = daily.filter((d) => d.close !== null);
        if (validData.length > 0) {
          return { name, daily: validData };
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  // 如果所有数据源都失败
  throw lastError || new Error("所有数据源获取失败，未找到有效数据");
}

export async function getEtfTodayClosePrice(code: string): Promise<{
  name: string | null;
  closePrice: number | null;
  date: string | null;
}> {
  try {
    const { name, daily } = await fetchRealtimeDaily(code);
    if (!daily || daily.length === 0) {
      return { name, closePrice: null, date: null };
    }

    // 获取今天的日期
    const now = new Date();
    const beijingTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Shanghai" })
    );
    const today = `${beijingTime.getFullYear()}-${String(
      beijingTime.getMonth() + 1
    ).padStart(2, "0")}-${String(beijingTime.getDate()).padStart(2, "0")}`;

    // 优先查找今天的数据
    for (const item of daily) {
      if (item.date === today && item.close !== null) {
        const closePrice = Math.round(Number(item.close) * 1000) / 1000;
        return { name, closePrice, date: today };
      }
    }

    // 如果没有今天的数据，返回最新的一条数据
    if (daily.length > 0) {
      const latest = daily[daily.length - 1];
      const closePrice =
        latest.close !== null
          ? Math.round(Number(latest.close) * 1000) / 1000
          : null;
      return { name, closePrice, date: latest.date };
    }

    return { name, closePrice: null, date: null };
  } catch (error) {
    console.error("获取ETF收盘价失败:", error);
    return { name: null, closePrice: null, date: null };
  }
}

export async function fetchEtfData(code: string): Promise<FetcherOutput> {
  const { name, daily } = await fetchRealtimeDaily(code);
  return {
    name,
    daily,
  };
}

export async function fetchEtfDataWithTodayClose(
  code: string
): Promise<FetcherOutput> {
  const { name, closePrice, date } = await getEtfTodayClosePrice(code);
  return {
    name,
    close_price: closePrice,
    date,
  };
}
