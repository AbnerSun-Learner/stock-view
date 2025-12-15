/**
 * 微信推送重试机制
 * 失败后间隔 5 分钟、15 分钟各重试 1 次（共 2 次）
 */

import { initKV } from "@/lib/kv";
import { logPushFailure, logPushSuccess } from "@/lib/logger";
import { sendTemplateMessage } from "@/lib/wechat";
import { buildPushTemplateData } from "@/lib/wechat-template";
import type { Favorite, PushLog } from "@/types/favorites";

interface RetryTask {
  userId: string;
  openId: string;
  favorite: Favorite;
  date: string;
  retryCount: number;
  priceData: {
    symbol: string;
    name: string;
    highest: number;
    current: number;
    target80: number;
  };
}

const RETRY_DELAYS = [5 * 60 * 1000, 15 * 60 * 1000]; // 5 分钟、15 分钟（毫秒）

/**
 * 调度重试任务
 */
export async function scheduleRetry(task: RetryTask): Promise<void> {
  const kv = initKV();
  const retryKey = `retry:${task.userId}:${task.date}:${task.favorite.symbol}:${task.retryCount}`;
  const delay = RETRY_DELAYS[task.retryCount - 1];

  // 存储重试任务（使用过期时间实现延迟）
  await kv.set(retryKey, task, { ex: Math.floor(delay / 1000) }); // ex 单位为秒
}

/**
 * 执行重试任务
 */
export async function executeRetry(
  userId: string,
  date: string,
  symbol: string,
  retryCount: number
): Promise<boolean> {
  const kv = initKV();
  const retryKey = `retry:${userId}:${date}:${symbol}:${retryCount}`;

  const task = await kv.get<RetryTask>(retryKey);
  if (!task) {
    return false; // 任务不存在或已过期
  }

  try {
    // 发送推送
    await sendTemplateMessage({
      openId: task.openId,
      templateId: process.env.WECHAT_TEMPLATE_ID || "",
      data: buildPushTemplateData(task.priceData),
    });

    // 记录成功日志
    const dedupKey = `pushlog:${userId}:${date}:${symbol}`;
    const log: PushLog = {
      userId,
      contact: "",
      sentAt: new Date().toISOString(),
      items: [],
      status: "success",
      retryCount,
      dedupKey,
    };
    await kv.set(dedupKey, log);

    // 记录推送成功日志
    logPushSuccess(userId, symbol, retryCount);

    // 删除重试任务
    await kv.del(retryKey);

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";

    // 记录失败日志
    const dedupKey = `pushlog:${userId}:${date}:${symbol}`;
    const log: PushLog = {
      userId,
      contact: "",
      sentAt: new Date().toISOString(),
      items: [],
      status: "failed",
      retryCount,
      error: errorMessage,
      dedupKey,
    };
    await kv.set(dedupKey, log);

    // 记录推送失败日志（用于告警）
    logPushFailure(
      userId,
      symbol,
      error instanceof Error ? error : errorMessage,
      retryCount
    );

    // 如果还有重试次数，调度下一次重试
    if (retryCount < RETRY_DELAYS.length) {
      await scheduleRetry({
        ...task,
        retryCount: retryCount + 1,
      });
    }

    return false;
  }
}

/**
 * 处理推送失败并调度重试
 */
export async function handlePushFailure(
  userId: string,
  openId: string,
  favorite: Favorite,
  date: string,
  priceData: {
    symbol: string;
    name: string;
    highest: number;
    current: number;
    target80: number;
  },
  error: string
): Promise<void> {
  const kv = initKV();

  // 记录失败日志
  const dedupKey = `pushlog:${userId}:${date}:${favorite.symbol}`;
  const log: PushLog = {
    userId,
    contact: "",
    sentAt: new Date().toISOString(),
    items: [],
    status: "failed",
    retryCount: 0,
    error,
    dedupKey,
  };
  await kv.set(dedupKey, log);

  // 记录推送失败日志（用于告警）
  logPushFailure(userId, favorite.symbol, error, 0);

  // 调度第一次重试（5 分钟后）
  await scheduleRetry({
    userId,
    openId,
    favorite,
    date,
    retryCount: 1,
    priceData,
  });
}
