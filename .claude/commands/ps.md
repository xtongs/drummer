# ps

将本地所有改动加入暂存区，然后提交并 push。

## 使用方式

- `/ps`（推荐：自动生成 commit message）
- `/ps <commit message>`（可选：手动指定 message，会跳过自动生成）

## 执行步骤

1. 运行以下命令检查当前状态，确认在 git 仓库且工作区存在变更：

```bash
git status --porcelain
git rev-parse --abbrev-ref HEAD
```

2. 将所有改动加入暂存区（包含新增/删除）：

```bash
git add -A
```

3. 生成 commit message（当用户未提供 `<commit message>` 时）：

- 读取暂存区 diff：

```bash
git diff --cached
```

- 让 AI 根据暂存区 diff 自动生成 **Conventional Commits** 格式的提交信息：
  - 标题：`<type>(<scope>): <subject>`（scope 可选）
  - 正文：用要点列出关键变更（可选）
  - 要求：**单次提交**，信息要准确、简短、可读

4. 创建提交：

- 若用户提供了 `<commit message>`，直接使用它：

```bash
git commit -m "<commit message>"
```

- 若用户未提供 `<commit message>`，使用 AI 生成的标题/正文执行（示例）：

```bash
git commit -m "<AI生成的标题>" -m "<AI生成的正文（可为空）>"
```

5. 推送到当前分支的远端：

```bash
git push
```

## 失败处理

- 如果没有任何变更（`git status --porcelain` 为空）：直接退出，不要提交空 commit。
- 如果用户未提供 message 且 AI 无法从 diff 推断合理标题：退回到要求用户提供 message。
- 如果 push 失败：输出失败原因（例如无权限、未设置 upstream、冲突），并给出下一步建议（`git push -u origin <branch>` / `git pull --rebase` 等）。

