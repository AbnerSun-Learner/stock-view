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

