import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["<rootDir>/__tests__/**/*.test.ts?(x)"],
  collectCoverageFrom: ["src/lib/**/*.ts", "!src/lib/**/index.ts"],
};

export default createJestConfig(customJestConfig);
