/**
 * 日志记录工具
 * 错误监控、推送失败告警
 */

type LogLevel = "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  symbol?: string;
  action?: string;
  [key: string]: unknown;
}

/**
 * 格式化日志消息
 */
function formatLogMessage(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * 记录信息日志
 */
export function logInfo(message: string, context?: LogContext): void {
  console.log(formatLogMessage("info", message, context));
}

/**
 * 记录警告日志
 */
export function logWarn(message: string, context?: LogContext): void {
  console.warn(formatLogMessage("warn", message, context));
}

/**
 * 记录错误日志
 */
export function logError(
  message: string,
  error?: Error | unknown,
  context?: LogContext
): void {
  const errorContext = {
    ...context,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
  };
  console.error(formatLogMessage("error", message, errorContext));
}

/**
 * 记录推送失败（用于告警）
 */
export function logPushFailure(
  userId: string,
  symbol: string,
  error: Error | string,
  retryCount: number = 0
): void {
  const context: LogContext = {
    userId,
    symbol,
    action: "push_failure",
    retryCount,
    error: error instanceof Error ? error.message : error,
  };

  logError(`推送失败: ${symbol}`, error, context);

  // TODO: 集成外部监控服务（如 Sentry、LogRocket）
  // 如果重试次数达到上限，发送告警
  if (retryCount >= 2) {
    logError(`推送重试次数已达上限: ${symbol}`, error, {
      ...context,
      alert: true,
    });
  }
}

/**
 * 记录推送成功
 */
export function logPushSuccess(
  userId: string,
  symbol: string,
  retryCount: number = 0
): void {
  const context: LogContext = {
    userId,
    symbol,
    action: "push_success",
    retryCount,
  };

  logInfo(`推送成功: ${symbol}`, context);
}

/**
 * 记录 API 错误
 */
export function logApiError(
  endpoint: string,
  error: Error | unknown,
  context?: LogContext
): void {
  logError(`API 错误: ${endpoint}`, error, {
    ...context,
    action: "api_error",
    endpoint,
  });
}
