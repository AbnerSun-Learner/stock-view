const SHANGHAI_TIME_ZONE = "Asia/Shanghai";
const MORNING_START = 9 * 60 + 30;
const MORNING_END = 11 * 60 + 30;
const AFTERNOON_START = 13 * 60;
const MARKET_CLOSE = 15 * 60;

export function getShanghaiDate(date = new Date()): Date {
  return new Date(
    date.toLocaleString("en-US", { timeZone: SHANGHAI_TIME_ZONE })
  );
}

export function formatShanghaiDate(date = new Date()): string {
  return date.toLocaleDateString("sv-SE", { timeZone: SHANGHAI_TIME_ZONE });
}

export function isTradingHours(date = new Date()): boolean {
  const shanghaiDate = getShanghaiDate(date);
  if (isWeekend(shanghaiDate)) return false;

  const timeInMinutes = getTimeInMinutes(shanghaiDate);
  return (
    (timeInMinutes >= MORNING_START && timeInMinutes <= MORNING_END) ||
    (timeInMinutes >= AFTERNOON_START && timeInMinutes <= MARKET_CLOSE)
  );
}

export function isAfterMarketClose(date = new Date()): boolean {
  const shanghaiDate = getShanghaiDate(date);
  if (isWeekend(shanghaiDate)) return false;

  return getTimeInMinutes(shanghaiDate) >= MARKET_CLOSE;
}

export function getTargetTradeDate(date = new Date()): string {
  const targetDate = getShanghaiDate(date);

  if (!isAfterMarketClose(date)) targetDate.setDate(targetDate.getDate() - 1);

  while (isWeekend(targetDate)) {
    targetDate.setDate(targetDate.getDate() - 1);
  }

  return formatLocalDate(targetDate);
}

export function isToday(dateStr: string, date = new Date()): boolean {
  return dateStr === formatShanghaiDate(date);
}

function getTimeInMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
