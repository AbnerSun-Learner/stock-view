/**
 * 数据源：仅使用 AKShare 方式（底层调用东方财富接口）
 *
 * 根据AKShare文档"历史行情数据-东方财富"部分实现指数数据查询
 * 支持指数代码格式：
 * - 000开头：沪深指数（如上证指数000001）
 * - 399开头：深证指数（如深证成指399001）
 * - 9开头：中证指数（如930955中证红利低波动100指数）
 *
 * 交易日规则：
 * - 如果在交易时间内（9:30-11:30, 13:00-15:00）查询，展示上一个交易日的价格
 * - 如果在收盘后（15:00之后）查询，展示当天交易日的价格
 */

import { getTargetTradeDate, isTradingHours } from "./utils";

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

function getMarketCodeForApi(code: string): string {
  const normalized = normalizeCode(code);
  // 指数代码优先处理
  if (normalized.startsWith("000")) {
    // 000开头的指数（如000300沪深300）使用上海市场代码
    return "1";
  } else if (normalized.startsWith("399")) {
    // 399开头的指数（如399001深证成指）使用深圳市场代码
    return "0";
  } else if (normalized.startsWith("9")) {
    // 中证指数（9开头，如930955）使用上海市场代码
    return "1";
  }

  // 股票和ETF代码
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

/**
 * 常见指数代码到名称的映射表（用于处理API返回乱码的情况）
 */
const INDEX_NAME_MAP: Record<string, string> = {
  "000001": "上证指数",
  "000002": "A股指数",
  "000003": "B股指数",
  "000008": "综合指数",
  "000009": "上证380",
  "000010": "上证180",
  "000016": "上证50",
  "000017": "新综指",
  "000300": "沪深300",
  "000905": "中证500",
  "000852": "中证1000",
  "399001": "深证成指",
  "399002": "深成指R",
  "399003": "成分B指",
  "399005": "中小板指",
  "399006": "创业板指",
  "399100": "新指数",
  "399101": "中小板综",
  "399106": "深证综指",
  "399330": "深证100",
  "399673": "创业板50",
  "930955": "中证红利低波动100",
};

function isIndexCode(code: string): boolean {
  const normalized = normalizeCode(code);
  // 指数代码识别规则（根据AKShare文档）：
  // - 000开头：沪深指数（如上证指数000001）
  // - 399开头：深证指数（如深证成指399001）
  // - 9开头：中证指数（如930955）
  return (
    normalized.startsWith("000") ||
    normalized.startsWith("399") ||
    normalized.startsWith("9")
  );
}

async function fetchFromEastmoneyWithMarketCode(
  code: string,
  marketCode: string,
  isIndex: boolean
): Promise<{ name: string | null; daily: DailyRow[] }> {
  const normalizedCode = normalizeCode(code);
  const klineUrl = isIndex
    ? "https://push2his.eastmoney.com/api/qt/index/kline/get"
    : "https://push2his.eastmoney.com/api/qt/stock/kline/get";

  const params = new URLSearchParams({
    secid: `${marketCode}.${normalizedCode}`,
    ut: "fa5fd1943c7b386f172d6893dbfba10b",
    fields1: "f1,f2,f3,f4,f5,f6",
    fields2: "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61",
    klt: "101", // 日K
    fqt: isIndex ? "0" : "1", // 指数不复权，股票前复权
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
        Accept: "application/json,text/plain,*/*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Accept-Charset": "UTF-8",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // 对于404错误，不抛出异常，而是返回空数据（可能是代码不存在）
      if (response.status === 404) {
        return { name: null, daily: [] };
      }
      throw new Error(`HTTP ${response.status}`);
    }

    // 确保使用UTF-8编码解析响应
    const text = await response.text();
    let data: {
      rc?: number;
      data?: {
        name?: string;
        klines?: string[];
      };
    };

    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      // 如果JSON解析失败，尝试使用TextDecoder处理编码问题
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const decodedText = decoder.decode(new TextEncoder().encode(text));
      data = JSON.parse(decodedText) as typeof data;
    }

    // 检查返回码，rc=100 通常表示查询失败或数据不存在
    if (
      data.rc === 100 ||
      !data.data ||
      !data.data.klines ||
      data.data.klines.length === 0
    ) {
      return { name: null, daily: [] };
    }

    const klines = data.data.klines;
    // 处理名称编码问题，确保正确显示中文
    // 对于指数，直接使用映射表（因为API返回的名称经常是乱码）
    // 优先使用映射表，如果映射表中没有，再尝试使用API返回的名称（但需要检查是否为乱码）
    // 注意：normalizedCode 已经在函数开头通过 normalizeCode(code) 计算
    let name: string | null = INDEX_NAME_MAP[normalizedCode] || null;

    // 调试：如果是指数但映射表中没有，记录警告
    if (isIndex && !name) {
      console.warn(
        `指数代码 ${normalizedCode} 在映射表中未找到，使用API返回的名称`
      );
    }

    // 如果映射表中没有，尝试使用API返回的名称
    if (!name && data.data.name) {
      const apiName = data.data.name;
      // 检查是否包含UTF-8替换字符（\uFFFD）
      const hasReplacementChar = apiName.includes("\uFFFD");
      // 检查是否包含控制字符
      const hasControlChars = /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/.test(
        apiName
      );
      // 对于指数，检查是否包含中文字符
      const hasChinese = /[\u4e00-\u9fa5]/.test(apiName);

      // 如果不是乱码，使用API返回的名称
      if (!hasReplacementChar && !hasControlChars && (hasChinese || !isIndex)) {
        name = apiName.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, "");
      }
    }

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

    // 返回前，强制使用映射表中的名称（如果存在），防止乱码
    // 这是最后一道防线，确保即使前面的逻辑有问题，也能使用正确的名称
    const finalName =
      INDEX_NAME_MAP[normalizedCode] || (name ? name.trim() : null);

    // 调试：如果是指数但最终名称仍然是乱码，记录警告
    if (isIndex && finalName && finalName.includes("\uFFFD")) {
      console.warn(
        `警告：指数 ${normalizedCode} 的名称仍然是乱码，映射表查找结果: ${INDEX_NAME_MAP[normalizedCode]}`
      );
    }

    return { name: finalName, daily };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function fetchRealtimeDaily(
  code: string
): Promise<{ name: string | null; daily: DailyRow[] }> {
  // 仅使用 AKShare 数据源（通过 Python API 服务），不再回退到其他数据源
  const akshareApiUrl = process.env.AKSHARE_API_URL || "http://localhost:5001";

  const normalizedCode = normalizeCode(code);
  const isIndex = isIndexCode(normalizedCode);
  const endpoint = isIndex ? "/api/akshare/index" : "/api/akshare/stock";

  try {
    const response = await fetch(
      `${akshareApiUrl}${endpoint}?symbol=${normalizedCode}`,
      {
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000), // 10 秒超时
      }
    );

    if (!response.ok) {
      const message = `AKShare API 响应异常: HTTP ${response.status}`;
      console.warn(message);
      return { name: null, daily: [] };
    }

    const data = (await response.json()) as {
      name?: string | null;
      daily?: Array<{
        date: string;
        open: number | null;
        high: number | null;
        low: number | null;
        close: number | null;
        volume: number | null;
      }>;
      target_trade_date?: string;
      in_trading_hours?: boolean;
    };

    const inTradingHours = data.in_trading_hours ?? isTradingHours();
    let filteredDaily = data.daily || [];

    // 如果在交易时间内，过滤掉今天的数据
    if (inTradingHours) {
      const today = new Date().toISOString().split("T")[0];
      filteredDaily = filteredDaily.filter((d) => d.date !== today);
    }

    return {
      name: data.name || null,
      daily: filteredDaily.map((d) => ({
        date: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      })),
    };
  } catch (error) {
    console.error("AKShare API 调用失败:", error);
    return { name: null, daily: [] };
  }
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

    // 根据交易日规则获取价格
    // - 如果在交易时间内（9:30-11:30, 13:00-15:00），返回上一个交易日的收盘价
    // - 如果在收盘后（15:00之后），返回当天交易日的收盘价
    const inTradingHours = isTradingHours();
    const targetTradeDate = getTargetTradeDate();

    // 查找目标交易日的数据
    for (const item of daily) {
      if (item.date === targetTradeDate && item.close !== null) {
        const closePrice = Math.round(Number(item.close) * 1000) / 1000;
        return { name, closePrice, date: targetTradeDate };
      }
    }

    // 如果没有今天的数据，检查最新数据的日期
    // 如果最新数据是今天但收盘价为null，说明数据源还没更新，使用上一个交易日
    if (daily.length > 0) {
      // 按日期降序排序，找到最新的有效数据
      const sortedDaily = [...daily].sort((a, b) => {
        if (a.date > b.date) return -1;
        if (a.date < b.date) return 1;
        return 0;
      });

      const latest = sortedDaily[0];
      const today = new Date().toISOString().split("T")[0];

      // 如果最新数据是今天但收盘价为null，使用上一个交易日
      if (
        latest.date === today &&
        latest.close === null &&
        sortedDaily.length > 1
      ) {
        const prevDay = sortedDaily[1];
        const closePrice =
          prevDay.close !== null
            ? Math.round(Number(prevDay.close) * 1000) / 1000
            : null;
        return { name, closePrice, date: prevDay.date };
      }

      // 否则使用最新数据的收盘价
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
  // 确保使用映射表中的名称（如果存在），防止乱码
  const normalizedCode = normalizeCode(code);
  const finalName = INDEX_NAME_MAP[normalizedCode] || name;
  return {
    name: finalName,
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
