#!/usr/bin/env node
/**
 * 部署前检查脚本
 * 运行: node scripts/check-deployment.mjs
 */

import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

console.log("🔍 部署前检查...\n");

let allPassed = true;
const warnings = [];

// 检查 1: 关键文件
console.log("✅ 检查 1: 关键文件");
const keyFiles = [
  "package.json",
  "vercel.json",
  ".env.example",
  "src/app/api/favorites/route.ts",
  "src/app/api/wechat/bind/route.ts",
  "src/app/api/wechat/push/route.ts",
];
for (const file of keyFiles) {
  const filePath = join(rootDir, file);
  if (existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} 不存在`);
    allPassed = false;
  }
}

// 检查 2: vercel.json 配置
console.log("\n✅ 检查 2: Vercel 配置");
const vercelJson = join(rootDir, "vercel.json");
if (existsSync(vercelJson)) {
  const content = JSON.parse(readFileSync(vercelJson, "utf-8"));

  if (content.crons && Array.isArray(content.crons)) {
    const pushCron = content.crons.find(
      (cron) => cron.path === "/api/wechat/push"
    );
    if (pushCron) {
      console.log("   ✅ Cron Job 配置存在");
      console.log(`   ✅ Schedule: ${pushCron.schedule}`);
      if (!pushCron.headers || !pushCron.headers["x-push-token"]) {
        warnings.push(
          "⚠️  Cron Job 未配置 Headers，需要在 Vercel Dashboard 中手动添加"
        );
      }
    } else {
      warnings.push("⚠️  未找到 /api/wechat/push 的 Cron Job 配置");
    }
  } else {
    warnings.push("⚠️  vercel.json 中未配置 crons");
  }
} else {
  console.log("   ❌ vercel.json 不存在");
  allPassed = false;
}

// 检查 3: 环境变量文档
console.log("\n✅ 检查 3: 环境变量文档");
const envExample = join(rootDir, ".env.example");
if (existsSync(envExample)) {
  const content = readFileSync(envExample, "utf-8");
  const requiredVars = [
    "WECHAT_APP_ID",
    "WECHAT_APP_SECRET",
    "NEXT_PUBLIC_WECHAT_APP_ID",
    "WECHAT_TEMPLATE_ID",
    "WECHAT_PUSH_TOKEN",
  ];
  let missingVars = [];
  for (const varName of requiredVars) {
    if (!content.includes(varName)) {
      missingVars.push(varName);
    }
  }
  if (missingVars.length === 0) {
    console.log("   ✅ 所有必需的环境变量已定义");
  } else {
    console.log(`   ⚠️  缺少环境变量: ${missingVars.join(", ")}`);
    warnings.push(`缺少环境变量定义: ${missingVars.join(", ")}`);
  }
} else {
  console.log("   ❌ .env.example 不存在");
  allPassed = false;
}

// 检查 4: TypeScript 编译
console.log("\n✅ 检查 4: TypeScript 编译");
try {
  const { execSync } = await import("child_process");
  execSync("npx tsc --noEmit", { cwd: rootDir, stdio: "pipe" });
  console.log("   ✅ TypeScript 编译通过");
} catch (error) {
  console.log("   ❌ TypeScript 编译失败");
  console.log("   请运行 'npx tsc --noEmit' 查看详细错误");
  allPassed = false;
}

// 检查 5: 构建测试（可选）
console.log("\n✅ 检查 5: 构建测试（可选）");
console.log("   ℹ️  跳过构建测试（运行 'npm run build' 手动测试）");

// 总结
console.log("\n" + "=".repeat(50));
if (warnings.length > 0) {
  console.log("⚠️  警告：");
  warnings.forEach((w) => console.log(`   ${w}`));
  console.log("");
}

if (allPassed) {
  console.log("✅ 所有检查通过！");
  console.log("\n📋 部署步骤：");
  console.log("1. 推送代码到 GitHub: git push origin main");
  console.log("2. 在 Vercel 中导入项目");
  console.log("3. 配置 Vercel KV（Storage → Create Database → KV）");
  console.log("4. 配置环境变量（Settings → Environment Variables）");
  console.log("5. 配置 Cron Job（Settings → Cron Jobs，如需要）");
  console.log("6. 重新部署");
  console.log("\n📖 详细说明见 DEPLOY.md");
} else {
  console.log("❌ 部分检查失败，请修复上述问题后再部署");
}
console.log("=".repeat(50));

process.exit(allPassed ? 0 : 1);
