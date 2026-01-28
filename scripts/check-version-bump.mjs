#!/usr/bin/env bun
/**
 * 版本号递增检查
 *
 * 功能:
 * 1. 解析暂存的 commit,识别变更级别
 * 2. 检查 package.json 版本号是否匹配
 * 3. 提供版本递增建议或自动递增命令
 */

import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.reset}`);
}

// 读取 package.json (从 git HEAD,而不是工作区)
function readPackageVersion() {
  try {
    // 尝试从 git HEAD 读取
    const headPackage = execSync("git show HEAD:package.json", {
      encoding: "utf-8",
    });
    return JSON.parse(headPackage).version;
  } catch {
    // 如果没有 HEAD,就读取工作区的
    const pkgPath = join(process.cwd(), "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return pkg.version;
  }
}

// 解析 commit message,返回变更级别
function parseCommitLevel(message) {
  const firstLine = message.split("\n")[0];

  // 提取 type 和 optional breaking indicator
  const match = firstLine.match(
    /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?!?:/,
  );

  if (!match) return null;

  const type = match[1];
  const hasBreakingIndicator = match[0].includes("!");

  // 检查 footer 中的 BREAKING CHANGE
  const hasBreakingFooter = message.includes("BREAKING CHANGE:");

  if (hasBreakingIndicator || hasBreakingFooter) {
    return "MAJOR";
  }

  if (type === "feat") {
    return "MINOR";
  }

  // fix, docs, refactor, test, chore 等都是 PATCH
  return "PATCH";
}

// 获取暂存的 commit message
function getStagedCommitMessage() {
  try {
    // 尝试从 .git/COMMIT_EDITMSG 读取 (commit-msg hook 时)
    const commitMsgPath = join(process.cwd(), ".git", "COMMIT_EDITMSG");
    if (existsSync(commitMsgPath)) {
      return readFileSync(commitMsgPath, "utf-8").trim();
    }
  } catch {}

  return null;
}

// 解析版本号
function parseVersion(version) {
  const [major, minor, patch] = version.split(".").map(Number);
  return { major, minor, patch };
}

// 递增版本号
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

// 版本号比较
function compareVersions(v1, v2) {
  const version1 = parseVersion(v1);
  const version2 = parseVersion(v2);

  if (version1.major !== version2.major) return version1.major - version2.major;
  if (version1.minor !== version2.minor) return version1.minor - version2.minor;
  return version1.patch - version2.patch;
}

// 主函数
function main() {
  log(COLORS.blue, "\n🔍 版本号递增检查\n");

  const currentVersion = readPackageVersion();
  log(COLORS.cyan, `当前版本: ${currentVersion}`);

  const commitMsg = getStagedCommitMessage();
  if (!commitMsg) {
    log(COLORS.yellow, "⚠️  无法获取 commit message,跳过版本检查");
    process.exit(0);
  }

  log(COLORS.cyan, `提交信息: ${commitMsg.split("\n")[0]}\n`);

  const requiredLevel = parseCommitLevel(commitMsg);

  if (!requiredLevel) {
    log(COLORS.yellow, "⚠️  无法识别提交类型,跳过版本检查");
    process.exit(0);
  }

  const expectedVersion = bumpVersion(currentVersion, requiredLevel);

  const levelEmojis = {
    MAJOR: "🔴",
    MINOR: "🟡",
    PATCH: "🟢",
  };

  const levelNames = {
    MAJOR: "主版本号 (破坏性变更)",
    MINOR: "次版本号 (新功能)",
    PATCH: "修订号 (Bug修复)",
  };

  log(
    COLORS.yellow,
    `${levelEmojis[requiredLevel]} 需要 ${requiredLevel} 级别递增`,
  );
  log(COLORS.reset, `   ${levelNames[requiredLevel]}`);
  log(COLORS.cyan, `   预期版本: ${expectedVersion}\n`);

  // 检查 package.json 是否已修改
  try {
    const gitStatus = execSync("git status --porcelain package.json", {
      encoding: "utf-8",
    });
    const isPackageStaged =
      gitStatus.trim().length > 0 &&
      (gitStatus.includes("M") || gitStatus.includes("A"));

    if (isPackageStaged) {
      // 读取暂存区的 package.json
      const stagedPackage = execSync("git show :package.json", {
        encoding: "utf-8",
      });
      const stagedVersion = JSON.parse(stagedPackage).version;

      if (stagedVersion === expectedVersion) {
        log(COLORS.green, `✅ 版本号已正确更新为 ${stagedVersion}\n`);
        process.exit(0);
      } else if (compareVersions(stagedVersion, currentVersion) > 0) {
        // 暂存区版本已更新,虽然不是预期版本,但允许继续
        log(
          COLORS.yellow,
          `⚠️  版本号已更新为 ${stagedVersion} (预期 ${expectedVersion})`,
        );
        log(COLORS.reset, "   如果这是正确的,请继续提交\n");
        process.exit(0);
      }
    }
  } catch {}

  // 未修改或修改不正确,提供建议
  log(COLORS.red, `❌ package.json 版本号需要更新`);
  log(COLORS.reset, "");
  log(COLORS.reset, "请选择以下操作:");
  log(COLORS.cyan, `   1. 手动修改 package.json 版本为 ${expectedVersion}`);
  log(COLORS.cyan, `   2. 运行自动命令:`);
  log(COLORS.green, `      bun version:bump --${requiredLevel.toLowerCase()}`);
  log(COLORS.reset, "");
  log(COLORS.reset, "然后重新暂存 package.json:");
  log(COLORS.green, "      git add package.json");
  log(COLORS.reset, "");

  process.exit(1);
}

main();
