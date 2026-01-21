#!/usr/bin/env bun
/**
 * OpenSpec 规范覆盖率检查
 *
 * 检查代码修改是否遵循 SDD/TDD 流程：
 * 1. 检查未暂存的改动
 * 2. 检查是否有对应的 proposal
 * 3. 检查测试覆盖率
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function getChangedFiles() {
  try {
    const output = execSync('git status --porcelain', { encoding: 'utf-8' });
    return output.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const status = line.substring(0, 2).trim();
        const file = line.substring(3);
        return { status, file };
      })
      .filter(({ file }) => file.startsWith('src/'));
  } catch {
    return [];
  }
}

function hasProposalInChanges() {
  const changesDir = 'openspec/changes';
  if (!existsSync(changesDir)) return false;

  try {
    const output = execSync('git status --porcelain', { encoding: 'utf-8' });
    return output.split('\n').some(line =>
      line.trim() && line.includes('openspec/changes') && line.includes('proposal.md')
    );
  } catch {
    return false;
  }
}

function checkTestCoverage() {
  try {
    // 运行测试并获取覆盖率
    const output = execSync('bun test --run --reporter=json 2>&1', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // 简单检查是否有测试失败
    if (output.includes('fail')) {
      return { passed: false, message: '存在失败的测试' };
    }

    return { passed: true, message: '所有测试通过' };
  } catch (error) {
    return { passed: false, message: '测试执行失败' };
  }
}

function main() {
  log(COLORS.blue, '\n🔍 OpenSpec 规范覆盖率检查\n');

  const changedFiles = getChangedFiles();

  if (changedFiles.length === 0) {
    log(COLORS.green, '✅ 没有源代码修改，跳过检查');
    process.exit(0);
  }

  log(COLORS.yellow, `📝 检测到 ${changedFiles.length} 个源文件修改:`);
  changedFiles.forEach(({ status, file }) => {
    const icon = status.includes('M') ? '📝' : status.includes('A') ? '➕' : '🗑️';
    log(COLORS.reset, `   ${icon} ${file}`);
  });

  // 检查是否有 proposal
  const hasProposal = hasProposalInChanges();
  if (!hasProposal) {
    log(COLORS.yellow, '\n⚠️  未检测到 proposal.md');
    log(COLORS.reset, '   如果这是常规功能修改，请先创建 proposal:');
    log(COLORS.reset, '   openspec/changes/YYYY-MM-DD-feature-name/proposal.md');
    log(COLORS.reset, '\n   如果这是微小修改（如调整常量、修复 typo），请使用 /quick-fix 命令');
  } else {
    log(COLORS.green, '\n✅ 检测到 proposal.md');
  }

  // 检查测试
  const testResult = checkTestCoverage();
  if (testResult.passed) {
    log(COLORS.green, `✅ ${testResult.message}`);
  } else {
    log(COLORS.red, `❌ ${testResult.message}`);
  }

  // 总结
  log(COLORS.blue, '\n📋 检查总结:');
  log(COLORS.reset, hasProposal ? '   ✅ 规范文档: 已创建' : '   ⚠️  规范文档: 缺失');
  log(COLORS.reset, testResult.passed ? '   ✅ 测试状态: 通过' : '   ❌ 测试状态: 失败');

  if (!hasProposal || !testResult.passed) {
    log(COLORS.red, '\n❌ 检查未通过，请修复后再提交\n');
    process.exit(1);
  }

  log(COLORS.green, '\n✅ 所有检查通过\n');
  process.exit(0);
}

main();
