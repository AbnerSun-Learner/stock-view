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
  ath_point?: number;
  ath_date?: string;
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

/**
 * 常见指数代码到名称的映射表（用于处理API返回乱码的情况）
 */
export const INDEX_NAME_MAP: Record<string, string> = {
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
  "399967": "中证军工",
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

async function fetchRealtimeDaily(
  code: string
): Promise<{ name: string | null; daily: DailyRow[]; ath_point?: number; ath_date?: string }> {
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
      return { name: null, daily: [], ath_point: undefined, ath_date: undefined };
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
      ath_point?: number;
      ath_date?: string;
      current_point?: number;
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
      ath_point: data.ath_point,
      ath_date: data.ath_date,
    };
  } catch (error) {
    console.error("AKShare API 调用失败:", error);
    return { name: null, daily: [], ath_point: undefined, ath_date: undefined };
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
  const result = await fetchRealtimeDaily(code);
  const { name, daily, ath_point, ath_date } = result;
  // 确保使用映射表中的名称（如果存在），防止乱码
  const normalizedCode = normalizeCode(code);
  const finalName = INDEX_NAME_MAP[normalizedCode] || name;
  return {
    name: finalName,
    daily,
    ath_point,
    ath_date,
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
