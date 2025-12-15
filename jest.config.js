/**
 * Jest 配置
 */

const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // 提供 Next.js 应用的路径
  dir: "./",
});

// 添加自定义配置到 next/jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["**/tests/**/*.test.ts", "**/tests/**/*.test.tsx"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{ts,tsx}",
    "!src/**/__tests__/**",
  ],
};

// createJestConfig 被以这种方式导出，以确保 next/jest 可以加载 Next.js 配置
module.exports = createJestConfig(customJestConfig);
