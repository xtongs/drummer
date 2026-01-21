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

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function readPackage() {
  const pkgPath = join(process.cwd(), 'package.json');
  return JSON.parse(readFileSync(pkgPath, 'utf-8'));
}

function writePackage(pkg) {
  const pkgPath = join(process.cwd(), 'package.json');
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

function parseVersion(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

function bumpVersion(version, level) {
  const v = parseVersion(version);

  switch (level) {
    case 'MAJOR':
      return `${v.major + 1}.0.0`;
    case 'MINOR':
      return `${v.major}.${v.minor + 1}.0`;
    case 'PATCH':
      return `${v.major}.${v.minor}.${v.patch + 1}`;
    default:
      return version;
  }
}

// 解析最近的提交级别
function detectVersionLevel() {
  try {
    // 获取最近的非合并提交
    const lastCommit = execSync(
      'git log -1 --pretty=%B --no-merges',
      { encoding: 'utf-8' }
    );

    const firstLine = lastCommit.split('\n')[0];
    const match = firstLine.match(/^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?!?:/);

    if (!match) return 'PATCH';

    const type = match[1];
    const hasBreakingIndicator = match[0].includes('!');
    const hasBreakingFooter = lastCommit.includes('BREAKING CHANGE:');

    if (hasBreakingIndicator || hasBreakingFooter) return 'MAJOR';
    if (type === 'feat') return 'MINOR';
    return 'PATCH';
  } catch {
    return 'PATCH';
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

  log(COLORS.reset, '接下来:');
  log(COLORS.reset, '  1. 提交变更:');
  log(COLORS.green, `     git add package.json && git commit -m "chore: bump version to ${newVersion}"`);
  log(COLORS.reset, '  2. 创建 tag (可选):');
  log(COLORS.green, `     git tag v${newVersion}\n`);
}

main();
