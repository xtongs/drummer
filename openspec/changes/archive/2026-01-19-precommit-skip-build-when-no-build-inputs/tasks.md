## 1. 实现任务

- [x] 1.1 定义“构建输入文件”匹配规则（staged files）
- [x] 1.2 修改 `.husky/pre-commit`：仅当存在构建输入变更时执行 `npm run build` 并 `git add dist/`
- [x] 1.3 为脚本输出增加清晰提示（skip/build）

## 2. 验证任务

- [x] 2.1 仅修改 `openspec/` 文档：commit 时跳过 build，不更新 dist
- [x] 2.2 修改 `src/` 或 `public/`：commit 时执行 build，并更新 dist

