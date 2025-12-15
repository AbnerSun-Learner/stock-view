/**
 * 安全工具单元测试
 */

import {
  decryptSensitiveData,
  encryptSensitiveData,
  maskEmail,
  maskOpenId,
  maskPhone,
  sanitizeInput,
  validateEmail,
  validatePhone,
  validateSymbol,
} from "@/lib/security";

// 设置测试环境变量
process.env.WECHAT_APP_SECRET = "test_secret_key_for_encryption";

describe("security", () => {
  describe("encryptSensitiveData / decryptSensitiveData", () => {
    it("应该能够加密和解密数据", () => {
      const original = "test_openid_123456";
      const encrypted = encryptSensitiveData(original);
      const decrypted = decryptSensitiveData(encrypted);

      expect(decrypted).toBe(original);
      expect(encrypted).not.toBe(original);
    });

    it("应该对相同数据生成不同的加密结果（由于随机 IV）", () => {
      const original = "test_openid_123456";
      const encrypted1 = encryptSensitiveData(original);
      const encrypted2 = encryptSensitiveData(original);

      // 由于使用随机 IV，加密结果应该不同
      expect(encrypted1).not.toBe(encrypted2);

      // 但解密后应该相同
      expect(decryptSensitiveData(encrypted1)).toBe(original);
      expect(decryptSensitiveData(encrypted2)).toBe(original);
    });
  });

  describe("maskPhone", () => {
    it("应该正确脱敏手机号", () => {
      expect(maskPhone("13812345678")).toBe("138****5678");
      expect(maskPhone("15912345678")).toBe("159****5678");
    });

    it("应该处理短手机号", () => {
      expect(maskPhone("123")).toBe("***");
      expect(maskPhone("")).toBe("***");
    });
  });

  describe("maskEmail", () => {
    it("应该正确脱敏邮箱", () => {
      expect(maskEmail("test@example.com")).toBe("te***@example.com");
      expect(maskEmail("ab@example.com")).toBe("***@example.com");
    });

    it("应该处理无效邮箱", () => {
      expect(maskEmail("")).toBe("***");
      expect(maskEmail("invalid")).toBe("***");
    });
  });

  describe("maskOpenId", () => {
    it("应该正确脱敏 OpenID", () => {
      expect(maskOpenId("openid1234567890")).toBe("open***7890");
    });

    it("应该处理短 OpenID", () => {
      expect(maskOpenId("short")).toBe("***");
      expect(maskOpenId("")).toBe("***");
    });
  });

  describe("validatePhone", () => {
    it("应该验证有效的手机号", () => {
      expect(validatePhone("13812345678")).toBe(true);
      expect(validatePhone("15912345678")).toBe(true);
      expect(validatePhone("18812345678")).toBe(true);
    });

    it("应该拒绝无效的手机号", () => {
      expect(validatePhone("12345678901")).toBe(false); // 不是 1 开头
      expect(validatePhone("1381234567")).toBe(false); // 长度不足
      expect(validatePhone("138123456789")).toBe(false); // 长度过长
      expect(validatePhone("")).toBe(false);
    });
  });

  describe("validateEmail", () => {
    it("应该验证有效的邮箱", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user.name@example.co.uk")).toBe(true);
    });

    it("应该拒绝无效的邮箱", () => {
      expect(validateEmail("invalid")).toBe(false);
      expect(validateEmail("@example.com")).toBe(false);
      expect(validateEmail("test@")).toBe(false);
      expect(validateEmail("")).toBe(false);
    });
  });

  describe("validateSymbol", () => {
    it("应该验证有效的 ETF 代码", () => {
      expect(validateSymbol("510300")).toBe(true);
      expect(validateSymbol("159919")).toBe(true);
      expect(validateSymbol("510300.SH")).toBe(true);
      expect(validateSymbol("159919.SZ")).toBe(true);
    });

    it("应该拒绝无效的 ETF 代码", () => {
      expect(validateSymbol("12345")).toBe(false); // 长度不足
      expect(validateSymbol("1234567")).toBe(false); // 长度过长
      expect(validateSymbol("510300.XX")).toBe(false); // 无效后缀
      expect(validateSymbol("")).toBe(false);
    });
  });

  describe("sanitizeInput", () => {
    it("应该清理 HTML 标签字符", () => {
      expect(sanitizeInput("test<script>alert('xss')</script>")).toBe(
        "testscriptalert('xss')/script"
      );
    });

    it("应该限制输入长度", () => {
      const longInput = "a".repeat(300);
      const result = sanitizeInput(longInput);
      expect(result.length).toBe(200);
    });

    it("应该去除首尾空格", () => {
      expect(sanitizeInput("  test  ")).toBe("test");
    });
  });
});
