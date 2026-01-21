# OpenSpec 工作流指南

> Drummer 项目的规范驱动开发（SDD）快速入门指南

## 🚀 快速开始

### 1️⃣ 确定变更级别

在开始任何代码修改前，先确定变更级别：

| 级别 | 命令 | 适用场景 | 是否需要 proposal |
|------|------|----------|------------------|
| 🟢 微小修改 | `/quick-fix` | 调整常量、修复 typo、样式修改 | ❌ 不需要 |
| 🟡 常规功能 | `/feature` | 新增功能点、修改行为、添加测试 | ✅ 需要 |
| 🔴 重大功能 | `/major` | 架构变更、跨模块功能、breaking changes | ✅ 需要（完整流程） |

### 2️⃣ 执行对应流程

#### 🟢 微小修改 (`/quick-fix`)

```
用户：/quick-fix 把鬼音符缩放从 0.75 改成 0.8

AI：确认这是 🟢 微小修改...
✅ 直接修改
✅ 运行测试
✅ 提交
```

**无需创建文档**，直接修改即可。

#### 🟡 常规功能 (`/feature`)

```
用户：/feature 添加移动端手势阻止

AI：确认这是 🟡 常规功能...
📋 检查 proposal → ❌ 不存在

请在 openspec/changes/ 创建：
  2026-01-21-mobile-gesture-prevent/
    ├── proposal.md   # 为什么、改什么
    └── tasks.md      # 任务清单

运行：mkdir -p openspec/changes/2026-01-21-mobile-gesture-prevent
```

**必须有 proposal**，AI 助手会拒绝无提案的实现。

#### 🔴 重大功能 (`/major`)

完整 SDD/TDD 流程：
```
proposal → design → tasks → implement → verify → archive
```

## 📁 目录结构

```
openspec/
├── project.md              # 项目上下文
├── AGENTS.md               # AI 助手指令（详细流程）
├── README.md               # 本文件
├── specs/                  # ✅ 已实现功能的规范（真相来源）
│   ├── pattern-editor/
│   ├── audio-engine/
│   └── ...
└── changes/                # 🚧 进行中的变更
    ├── 2026-01-21-feature-1/
    │   ├── proposal.md     # 为什么、改什么
    │   ├── tasks.md        # 任务清单
    │   ├── design.md       # 技术设计（可选）
    │   └── specs/          # 规范更新
    └── archive/            # ✅ 已完成的变更
```

## 📝 常用模板

### proposal.md

```markdown
# Change: [变更简述]

## Why

[1-2 句话说明问题或机会]

## What Changes

- [变更项 1]
- [变更项 2]
- [标记 **BREAKING** 如有破坏性变更]

## Impact

- 影响的规范: [capability]
- 影响的代码: [关键文件]
```

### tasks.md

```markdown
## 1. 实现任务

- [ ] 1.1 [具体任务]
- [ ] 1.2 [具体任务]
- [ ] 1.3 编写测试用例
- [ ] 1.4 更新文档

## 2. 验证任务

- [ ] 2.1 通过所有测试
- [ ] 2.2 代码评审
- [ ] 2.3 与规范对齐检查
```

## 🔍 检查工具

### 手动检查

```bash
# 检查规范覆盖率
bun run check:spec

# 检查测试覆盖率
bun run test:coverage
```

### 提交前检查清单

- [ ] 变更级别是否正确？
- [ ] 是否有对应的 proposal？（常规功能+）
- [ ] 测试是否通过？
- [ ] 测试覆盖率是否 >= 80%？
- [ ] 规范文档是否已更新？

## 🎯 最佳实践

1. **规范优先**：先写规范，再写代码
2. **TDD 开发**：红-绿-重构
3. **小步提交**：频繁提交，每次一个逻辑单元
4. **规范同步**：代码修改后立即更新规范

## 📚 更多文档

- [AI 助手指令](AGENTS.md) - 完整的 SDD/TDD 流程
- [项目上下文](project.md) - 项目约定和架构
- [功能规范](specs/) - 各模块的详细规范

---

**记住**：规范是"真相来源"（Single Source of Truth），代码必须与规范保持一致！
