#!/usr/bin/env bun
/**
 * 版本号自动递增脚本
 *
 * 用法:
 *   bun run version:bump          # 根据提交历史自动判断
 *   bun run version:bump major    # 强制 MAJOR
 *   bun run version:bump minor    # 强制 MINOR
 *   bun run version:bump patch    # 强制 PATCH
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function readPackage() {
  const pkgPath = join(process.cwd(), "package.json");
  return JSON.parse(readFileSync(pkgPath, "utf-8"));
}

function writePackage(pkg) {
  const pkgPath = join(process.cwd(), "package.json");
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

/**
 * 更新 lock 文件中的版本号
 * 支持: package-lock.json
 * 注意: bun.lock 不包含项目版本号，无需处理
 */
function updateLockFiles(oldVersion, newVersion) {
  const packageLockPath = join(process.cwd(), "package-lock.json");

  // 更新 package-lock.json
  if (existsSync(packageLockPath)) {
    try {
      const lockContent = readFileSync(packageLockPath, "utf-8");
      const lockData = JSON.parse(lockContent);

      let updated = false;

      // 更新顶层版本号（无论当前值是什么，都强制更新）
      if (lockData.version !== newVersion) {
        lockData.version = newVersion;
        updated = true;
      }

      // 更新 packages 节点中的版本号（lockfileVersion 2/3 格式）
      if (lockData.packages && lockData.packages[""]) {
        if (lockData.packages[""].version !== newVersion) {
          lockData.packages[""].version = newVersion;
          updated = true;
        }
      }

      if (updated) {
        writeFileSync(
          packageLockPath,
          JSON.stringify(lockData, null, 2) + "\n",
        );
        log(COLORS.green, `✅ package-lock.json 版本已更新 → ${newVersion}`);
      } else {
        log(
          COLORS.yellow,
          `ℹ️  package-lock.json 版本已是 ${newVersion}，无需更新`,
        );
      }
    } catch (error) {
      log(COLORS.red, `⚠️  更新 package-lock.json 失败: ${error.message}`);
    }
  } else {
    log(COLORS.yellow, `ℹ️  未找到 package-lock.json，跳过`);
  }

  // 注意: bun.lock 使用不同的格式，不包含项目版本号，通过 bun install 自动管理
  // yarn.lock 和 pnpm-lock.yaml 是文本格式，通常通过包管理器命令更新
}

function parseVersion(version) {
  const [major, minor, patch] = version.split(".").map(Number);
  return { major, minor, patch };
}

function bumpVersion(version, level) {
  const v = parseVersion(version);

  switch (level) {
    case "MAJOR":
      return `${v.major + 1}.0.0`;
    case "MINOR":
      return `${v.major}.${v.minor + 1}.0`;
    case "PATCH":
      return `${v.major}.${v.minor}.${v.patch + 1}`;
    default:
      return version;
  }
}

// 解析最近的提交级别
function detectVersionLevel() {
  try {
    // 获取最近的非合并提交
    const lastCommit = execSync("git log -1 --pretty=%B --no-merges", {
      encoding: "utf-8",
    });

    const firstLine = lastCommit.split("\n")[0];
    const match = firstLine.match(
      /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?!?:/,
    );

    if (!match) return "PATCH";

    const type = match[1];
    const hasBreakingIndicator = match[0].includes("!");
    const hasBreakingFooter = lastCommit.includes("BREAKING CHANGE:");

    if (hasBreakingIndicator || hasBreakingFooter) return "MAJOR";
    if (type === "feat") return "MINOR";
    return "PATCH";
  } catch {
    return "PATCH";
  }
}

function main() {
  const args = process.argv.slice(2);
  const pkg = readPackage();
  const currentVersion = pkg.version;

  log(COLORS.cyan, `\n📦 版本号递增\n`);
  log(COLORS.reset, `当前版本: ${currentVersion}`);

  let level;

  if (args.length > 0) {
    level = args[0].toUpperCase();
  } else {
    level = detectVersionLevel();
    log(COLORS.yellow, `检测到变更级别: ${level}\n`);
  }

  const newVersion = bumpVersion(currentVersion, level);

  pkg.version = newVersion;
  writePackage(pkg);

  log(COLORS.green, `✅ 版本号已更新: ${currentVersion} → ${newVersion}\n`);

  // 更新 lock 文件
  updateLockFiles(currentVersion, newVersion);

  log(COLORS.reset, "接下来:");
  log(COLORS.reset, "  1. 提交变更:");
  log(
    COLORS.green,
    `     git add package.json package-lock.json && git commit -m "chore: bump version to ${newVersion}"`,
  );
  log(COLORS.reset, "  2. 创建 tag (可选):");
  log(COLORS.green, `     git tag v${newVersion}\n`);
}

main();
