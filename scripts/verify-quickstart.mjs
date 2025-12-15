#!/usr/bin/env node
/**
 * 验证 quickstart.md 中的配置和功能
 * 运行: node scripts/verify-quickstart.mjs
 */

import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

console.log("🔍 验证 quickstart.md 配置...\n");

let allPassed = true;

// 检查 1: 环境变量文件
console.log("✅ 检查 1: 环境变量文件");
const envExample = join(rootDir, ".env.example");
if (existsSync(envExample)) {
  console.log("   ✅ .env.example 存在");
  const content = readFileSync(envExample, "utf-8");
  const requiredVars = [
    "WECHAT_APP_ID",
    "WECHAT_APP_SECRET",
    "NEXT_PUBLIC_WECHAT_APP_ID",
    "WECHAT_TEMPLATE_ID",
    "WECHAT_PUSH_TOKEN",
  ];
  for (const varName of requiredVars) {
    if (content.includes(varName)) {
      console.log(`   ✅ ${varName} 已定义`);
    } else {
      console.log(`   ❌ ${varName} 未定义`);
      allPassed = false;
    }
  }
} else {
  console.log("   ❌ .env.example 不存在");
  allPassed = false;
}

// 检查 2: 关键文件存在
console.log("\n✅ 检查 2: 关键文件");
const keyFiles = [
  "src/lib/wechat.ts",
  "src/lib/security.ts",
  "src/lib/logger.ts",
  "src/lib/favorites-store.ts",
  "src/app/api/wechat/bind/route.ts",
  "src/app/api/wechat/push/route.ts",
  "src/components/stock/PushSettings.tsx",
  "vercel.json",
];
for (const file of keyFiles) {
  const filePath = join(rootDir, file);
  if (existsSync(filePath)) {
    console.log(`   ✅ ${file} 存在`);
  } else {
    console.log(`   ❌ ${file} 不存在`);
    allPassed = false;
  }
}

// 检查 3: Vercel Cron Job 配置
console.log("\n✅ 检查 3: Vercel Cron Job 配置");
const vercelJson = join(rootDir, "vercel.json");
if (existsSync(vercelJson)) {
  const content = JSON.parse(readFileSync(vercelJson, "utf-8"));
  if (
    content.crons &&
    Array.isArray(content.crons) &&
    content.crons.length > 0
  ) {
    const pushCron = content.crons.find(
      (cron) => cron.path === "/api/wechat/push"
    );
    if (pushCron) {
      console.log("   ✅ Cron Job 已配置");
      console.log(`   ✅ Schedule: ${pushCron.schedule}`);
    } else {
      console.log("   ❌ 未找到 /api/wechat/push 的 Cron Job");
      allPassed = false;
    }
  } else {
    console.log("   ❌ vercel.json 中未配置 crons");
    allPassed = false;
  }
} else {
  console.log("   ❌ vercel.json 不存在");
  allPassed = false;
}

// 检查 4: 文档完整性
console.log("\n✅ 检查 4: 文档完整性");
const docs = [
  "README.md",
  "ENV_SETUP.md",
  "specs/001-favorites-wechat-notify/quickstart.md",
];
for (const doc of docs) {
  const docPath = join(rootDir, doc);
  if (existsSync(docPath)) {
    console.log(`   ✅ ${doc} 存在`);
  } else {
    console.log(`   ⚠️  ${doc} 不存在（可选）`);
  }
}

// 总结
console.log("\n" + "=".repeat(50));
if (allPassed) {
  console.log("✅ 所有检查通过！");
  console.log("\n下一步：");
  console.log("1. 配置环境变量（见 ENV_SETUP.md）");
  console.log("2. 运行 'npm run dev' 启动开发服务器");
  console.log("3. 测试功能：收藏、身份识别、微信绑定");
  console.log("4. 部署到 Vercel 并配置 Cron Job");
} else {
  console.log("❌ 部分检查失败，请修复上述问题");
}
console.log("=".repeat(50));

process.exit(allPassed ? 0 : 1);
