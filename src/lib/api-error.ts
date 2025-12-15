/**
 * API 错误处理中间件
 */

import { NextResponse } from "next/server";

export interface ApiError {
  ok: false;
  error: string;
  code?: string;
  details?: unknown;
}

export interface ApiSuccess<T = unknown> {
  ok: true;
  data?: T;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(
  data?: T
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ ok: true, data });
}

/**
 * 创建错误响应
 */
export function createErrorResponse(
  error: string,
  code?: string,
  status: number = 400,
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      ok: false,
      error,
      code,
      details,
    },
    { status }
  );
}

/**
 * 包装异步 API 处理函数，统一错误处理
 */
export function withErrorHandler<T>(
  handler: () => Promise<T>
): Promise<NextResponse<ApiResponse<T>>> {
  return handler()
    .then((data) => createSuccessResponse(data))
    .catch((error) => {
      console.error("API error:", error);
      if (error instanceof Error) {
        return createErrorResponse(
          error.message || "服务器内部错误",
          "INTERNAL_ERROR",
          500
        );
      }
      return createErrorResponse("未知错误", "UNKNOWN_ERROR", 500);
    });
}

/**
 * 验证必需参数
 */
export function validateRequired(
  value: unknown,
  fieldName: string
): asserts value is string {
  if (!value || (typeof value === "string" && value.trim().length === 0)) {
    throw new Error(`缺少必需参数: ${fieldName}`);
  }
}

/**
 * 验证 UUID 格式
 */
export function validateUUID(
  value: string,
  fieldName: string = "userId"
): void {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new Error(`无效的 ${fieldName} 格式（应为 UUID v4）`);
  }
}
