# OpenSpec AI 助手指令

> 本文档定义了 AI 助手和开发者在 Drummer 项目中必须遵循的规范驱动开发（SDD）流程。

## 📋 快速参考

### 目录结构

```
openspec/
├── project.md              # 项目上下文和约定
├── AGENTS.md               # 本文件 - AI 助手指令
├── specs/                  # 当前真相 - 已实现功能的规范
│   └── [capability]/
│       ├── spec.md         # 需求和场景（WHAT & WHY）
│       └── design.md       # 技术设计（HOW，可选）
└── changes/                # 变更提案
    ├── [change-name]/
    │   ├── proposal.md     # 为什么、改什么、影响
    │   ├── tasks.md        # 实现任务清单
    │   ├── design.md       # 技术决策（可选）
    │   └── specs/          # 变更后的规范差异
    └── archive/            # 已完成变更的归档
```

### 文件模板

#### proposal.md

```markdown
# Change: [变更简述]

## Why

[1-2 句话说明问题或机会]

## What Changes

- [变更项列表]
- [标记 **BREAKING** 如有破坏性变更]

## Impact

- 影响的规范: [列出 capability]
- 影响的代码: [关键文件/系统]
```

#### tasks.md

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

#### spec.md 差异格式

```markdown
## ADDED Requirements

### Requirement: 新功能

系统 SHALL 提供...

#### Scenario: 成功场景

- **GIVEN** 前置条件
- **WHEN** 用户执行操作
- **THEN** 预期结果

## MODIFIED Requirements

### Requirement: 现有功能

[完整的修改后需求]

## REMOVED Requirements

### Requirement: 废弃功能

**Reason**: [移除原因]
**Migration**: [迁移方案]
```

---

## 🔄 SDD 开发流程

### 核心原则

**规范优先（Spec First）**：在写任何代码之前，必须先有明确的规范。

### 流程步骤

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  1. 提案    │────▶│  2. 设计    │────▶│  3. 任务    │
│  proposal   │     │   design    │     │   tasks     │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  6. 归档    │◀────│  5. 验证    │◀────│  4. 实现    │
│  archive    │     │   verify    │     │ implement   │
└─────────────┘     └─────────────┘     └─────────────┘
```

#### 1. 提案（Proposal）

**触发条件**：任何新功能、功能修改、Bug 修复

**必须包含**：

- 为什么需要这个变更
- 具体要改什么
- 对现有系统的影响

**输出**：`openspec/changes/<change-name>/proposal.md`

#### 2. 设计（Design）

**触发条件**：复杂变更、架构变动、接口变更

**必须包含**：

- 技术方案
- 备选方案对比
- 风险和权衡
- 迁移计划（如有破坏性变更）

**输出**：`openspec/changes/<change-name>/design.md`

#### 3. 任务分解（Tasks）

**必须包含**：

- 可执行的任务清单
- 每个任务对应的验收标准
- 测试要求

**输出**：`openspec/changes/<change-name>/tasks.md`

#### 4. 实现（Implementation）

**必须遵循**：

- TDD 开发流程（红-绿-重构）
- 代码风格和命名约定（见 project.md）
- 测试覆盖率要求

#### 5. 验证（Verification）

**检查清单**：

- [ ] 所有测试通过
- [ ] 代码符合规范
- [ ] 实现与 spec 一致
- [ ] 无 TypeScript 错误
- [ ] 无 ESLint 警告

#### 6. 归档（Archive）

**完成后**：

- 将变更目录移至 `openspec/changes/archive/YYYY-MM-DD-<name>/`
- 如有必要，更新 `openspec/specs/` 中的相关规范

---

## 🚫 不可违反的约束

### 规范约束

1. **禁止无规范编码**

   - 所有新功能必须先有 proposal
   - 复杂变更必须有 design 文档
   - 不允许"先写代码再补文档"

2. **禁止静默修改规范**

   - 修改已有 spec 必须通过 changes 流程
   - 必须说明修改原因和影响

3. **禁止破坏现有行为**
   - 除非在 proposal 中明确标注 **BREAKING**
   - 必须提供迁移方案

### 代码约束

1. **测试优先**

   - 遵循 TDD（红-绿-重构）
   - 核心逻辑覆盖率 >= 80%

2. **类型安全**

   - 禁止使用 `any` 类型（除非有充分理由）
   - 所有公开 API 必须有类型定义

3. **命名规范**
   - 组件: PascalCase
   - Hooks: use 前缀 + camelCase
   - 常量: UPPER_SNAKE_CASE

---

## 📝 规范编写指南

### Scenario 格式

使用 Given-When-Then 格式：

```markdown
#### Scenario: 场景名称

- **GIVEN** 前置条件（系统状态）
- **WHEN** 触发动作（用户操作）
- **THEN** 预期结果
- **AND** 附加结果（可选）
```

### 需求等级

| 关键词    | 含义             |
| --------- | ---------------- |
| SHALL     | 必须实现         |
| SHOULD    | 应该实现（推荐） |
| MAY       | 可以实现（可选） |
| SHALL NOT | 禁止实现         |

### 边界条件

每个规范应包含：

- 有效输入范围
- 无效输入处理
- 错误场景

---

## 🔍 现有规范索引

| 功能模块             | 规范路径                      | 状态      |
| -------------------- | ----------------------------- | --------- |
| Pattern 管理         | `specs/pattern-management/`   | ✅ 已完成 |
| Metronome            | `specs/metronome/`            | ✅ 已完成 |
| Audio Engine         | `specs/audio-engine/`         | ✅ 已完成 |
| Pattern Editor       | `specs/pattern-editor/`       | ✅ 已完成 |
| Loop Range           | `specs/loop-range/`           | ✅ 已完成 |
| Multi-Pattern Player | `specs/multi-pattern-player/` | ✅ 已完成 |
| Storage              | `specs/storage/`              | ✅ 已完成 |

---

## 🤖 AI 助手行为规范

### 在执行任何开发任务前

1. **检查相关规范**

   - 阅读 `openspec/project.md` 了解项目上下文
   - 查找相关的 `specs/` 文档

2. **评估变更范围**

   - 简单 Bug 修复：可直接进行
   - 新功能/功能修改：必须先创建 proposal

3. **遵循 TDD 流程**
   - 先写测试，再写实现

### 在回答问题时

1. 优先参考 `openspec/` 中的规范文档
2. 如有冲突，规范 > 代码实现
3. 发现规范与实现不一致时，指出并建议更新

### 在生成代码时

1. 遵循 `project.md` 中的编码约定
2. 确保生成的代码符合相关 spec
3. 包含必要的测试用例

---

_最后更新: 2026-01-16_
