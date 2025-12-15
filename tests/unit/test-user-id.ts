/**
 * 用户 ID 工具单元测试
 */

import { generateUserId, isValidUserId } from "@/lib/user-id";

describe("user-id", () => {
  describe("generateUserId", () => {
    it("应该生成有效的 UUID v4", () => {
      const userId = generateUserId();
      expect(isValidUserId(userId)).toBe(true);
    });

    it("应该生成不同的 ID", () => {
      const id1 = generateUserId();
      const id2 = generateUserId();
      expect(id1).not.toBe(id2);
    });
  });

  describe("isValidUserId", () => {
    it("应该验证有效的 UUID v4", () => {
      const validIds = [
        "550e8400-e29b-41d4-a716-446655440000",
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
      ];

      for (const id of validIds) {
        expect(isValidUserId(id)).toBe(true);
      }
    });

    it("应该拒绝无效的 UUID", () => {
      const invalidIds = [
        "",
        "not-a-uuid",
        "550e8400-e29b-41d4-a716", // 不完整
        "550e8400-e29b-41d4-a716-446655440000-extra", // 太长
        "550e8400-e29b-41d4-a716-44665544000g", // 无效字符
      ];

      for (const id of invalidIds) {
        expect(isValidUserId(id)).toBe(false);
      }
    });
  });
});
