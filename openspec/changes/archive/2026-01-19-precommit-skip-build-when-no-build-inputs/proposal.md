# Change: pre-commit 在无构建相关改动时跳过 build（保留 dist 跟踪与 build time）

## Why

当前 `.husky/pre-commit` 每次提交都会执行 `build` 并 `git add dist/`。由于构建过程会注入 `__BUILD_TIME__`，即便代码未变也会导致 `dist/` 产物 hash 变化，从而产生大量“无意义 dist 变更”。

## What Changes

- 在 pre-commit 中增加“构建输入文件”变更检测（基于 **staged files**）
- **仅当** staged 改动包含构建输入（例如 `src/`、`public/`、`vite.config.ts` 等）时才执行 `build` 并更新 `dist/`
- 仍保留：
  - `dist/` 继续纳入版本控制
  - 本地 `build` 作为提交前校验
  - `__BUILD_TIME__` 的动态写入

## Impact

- 影响的规范: 无
- 影响的代码:
  - `.husky/pre-commit`

