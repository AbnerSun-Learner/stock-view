/**
 * 安全工具函数
 * 敏感信息加密、日志脱敏、输入验证
 */

import crypto from "crypto";

const ENCRYPTION_ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16; // AES 块大小

/**
 * 获取加密密钥（从环境变量或生成）
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "加密密钥未配置。请设置环境变量 ENCRYPTION_KEY"
    );
  }
  // 使用 SHA-256 哈希确保密钥长度为 32 字节（AES-256）
  return crypto.createHash("sha256").update(key).digest();
}

/**
 * 加密敏感信息（使用 AES-256-CBC）
 */
export function encryptSensitiveData(data: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");

    // 将 IV 和加密数据组合：IV + 加密数据
    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    // 如果加密失败，回退到 base64（向后兼容）
    console.warn("Encryption failed, falling back to base64:", error);
    if (typeof Buffer !== "undefined") {
      return Buffer.from(data).toString("base64");
    }
    return btoa(data);
  }
}

/**
 * 解密敏感信息
 */
export function decryptSensitiveData(encrypted: string): string {
  try {
    // 检查是否是新的加密格式（包含 IV）
    if (encrypted.includes(":")) {
      const parts = encrypted.split(":");
      const iv = Buffer.from(parts[0], "hex");
      const encryptedData = parts[1];

      const key = getEncryptionKey();
      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);

      let decrypted = decipher.update(encryptedData, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    }

    // 向后兼容：base64 解码
    if (typeof Buffer !== "undefined") {
      return Buffer.from(encrypted, "base64").toString("utf-8");
    }
    return atob(encrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("解密失败");
  }
}

/**
 * 脱敏手机号（用于日志）
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 11) {
    return "***";
  }
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

/**
 * 脱敏邮箱（用于日志）
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) {
    return "***";
  }
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `***@${domain}`;
  }
  return `${local.slice(0, 2)}***@${domain}`;
}


/**
 * 脱敏联系方式（自动识别类型）
 */
export function maskContact(
  contact: string,
  contactType: "phone" | "email"
): string {
  if (contactType === "phone") {
    return maskPhone(contact);
  }
  return maskEmail(contact);
}

/**
 * 验证手机号格式
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone.trim());
}

/**
 * 验证邮箱格式
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * 验证 ETF 代码格式
 */
export function validateSymbol(symbol: string): boolean {
  const symbolRegex = /^\d{6}(\.(SZ|SH))?$/;
  return symbolRegex.test(symbol.trim());
}

/**
 * 清理用户输入（防止 XSS）
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // 移除 HTML 标签字符
    .slice(0, 200); // 限制长度
}
