/**
 * 日志工具单元测试
 */

import {
  logApiError,
  logError,
  logInfo,
  logPushFailure,
  logPushSuccess,
  logWarn,
} from "@/lib/logger";

// Mock console
const consoleSpy = {
  log: jest.spyOn(console, "log").mockImplementation(),
  warn: jest.spyOn(console, "warn").mockImplementation(),
  error: jest.spyOn(console, "error").mockImplementation(),
};

describe("logger", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("logInfo", () => {
    it("应该记录信息日志", () => {
      logInfo("Test message", { userId: "123" });
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(consoleSpy.log.mock.calls[0][0]).toContain("INFO");
      expect(consoleSpy.log.mock.calls[0][0]).toContain("Test message");
    });
  });

  describe("logWarn", () => {
    it("应该记录警告日志", () => {
      logWarn("Warning message", { userId: "123" });
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.warn.mock.calls[0][0]).toContain("WARN");
      expect(consoleSpy.warn.mock.calls[0][0]).toContain("Warning message");
    });
  });

  describe("logError", () => {
    it("应该记录错误日志", () => {
      const error = new Error("Test error");
      logError("Error message", error, { userId: "123" });
      expect(consoleSpy.error).toHaveBeenCalled();
      expect(consoleSpy.error.mock.calls[0][0]).toContain("ERROR");
      expect(consoleSpy.error.mock.calls[0][0]).toContain("Error message");
    });
  });

  describe("logPushFailure", () => {
    it("应该记录推送失败日志", () => {
      const error = new Error("Push failed");
      logPushFailure("user123", "510300", error, 0);
      expect(consoleSpy.error).toHaveBeenCalled();
      expect(consoleSpy.error.mock.calls[0][0]).toContain("推送失败");
    });

    it("应该在重试次数达到上限时记录告警", () => {
      const error = new Error("Push failed");
      logPushFailure("user123", "510300", error, 2);
      expect(consoleSpy.error).toHaveBeenCalledTimes(2); // 一次失败日志，一次告警日志
    });
  });

  describe("logPushSuccess", () => {
    it("应该记录推送成功日志", () => {
      logPushSuccess("user123", "510300", 0);
      expect(consoleSpy.log).toHaveBeenCalled();
      expect(consoleSpy.log.mock.calls[0][0]).toContain("推送成功");
    });
  });

  describe("logApiError", () => {
    it("应该记录 API 错误日志", () => {
      const error = new Error("API error");
      logApiError("/api/test", error, { userId: "123" });
      expect(consoleSpy.error).toHaveBeenCalled();
      expect(consoleSpy.error.mock.calls[0][0]).toContain("API 错误");
      expect(consoleSpy.error.mock.calls[0][0]).toContain("/api/test");
    });
  });
});
