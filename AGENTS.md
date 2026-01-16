# Drummer 项目开发规范

> 本文档为 AI 助手和开发者提供项目开发指南

## 项目概述

Drummer 是一个基于 React + TypeScript + Vite 构建的鼓机/节拍器 PWA 应用。项目采用 TDD（测试驱动开发）方法论，确保代码质量和可维护性。

## 技术栈

- **前端框架**: React 18
- **语言**: TypeScript
- **构建工具**: Vite
- **测试框架**: Vitest + React Testing Library
- **包管理器**: bun (优先使用)
- **PWA**: vite-plugin-pwa

## TDD 开发流程

### 核心原则：红-绿-重构

在进行任何新功能开发或 bug 修复时，必须遵循以下流程：

#### 1. 红（Red）- 先写测试

```bash
# 在开始编码前，先编写失败的测试
bun run test:watch
```

- 根据需求编写测试用例
- 测试应该明确描述预期行为
- 运行测试，确认测试失败（红色）

#### 2. 绿（Green）- 实现功能

- 编写最少量的代码使测试通过
- 不要过度设计，只实现测试要求的功能
- 运行测试，确认测试通过（绿色）

#### 3. 重构（Refactor）

- 在测试保护下重构代码
- 提高代码可读性和可维护性
- 确保所有测试仍然通过

### 测试命令

```bash
# 运行所有测试
bun run test

# 运行测试（单次）
bun run test:run

# 监视模式运行测试（推荐开发时使用）
bun run test:watch

# 运行测试并生成覆盖率报告
bun run test:coverage
```

## 项目结构

```
src/
├── components/       # UI 组件
│   ├── BottomPlayButton/
│   ├── MetronomeBar/
│   ├── PatternEditor/
│   ├── PatternManager/
│   └── VersionDisplay/
├── hooks/           # 自定义 React Hooks
│   ├── usePattern.ts          # 节奏型管理
│   ├── useMetronome.ts        # 节拍器逻辑
│   ├── useMultiPatternPlayer.ts  # 多模式播放器
│   └── *.test.ts              # 对应的测试文件
├── types/           # TypeScript 类型定义
│   ├── index.ts
│   └── index.test.ts
├── utils/           # 工具函数
│   ├── storage.ts   # 本地存储
│   ├── audioEngine.ts  # 音频引擎
│   ├── constants.ts # 常量定义
│   └── *.test.ts    # 对应的测试文件
├── styles/          # 全局样式
├── test/            # 测试配置和工具
│   └── setup.ts     # 测试环境设置
└── App.tsx          # 主应用组件
```

## 测试规范

### 测试文件命名

- 测试文件应与被测试文件放在同一目录
- 命名格式: `<filename>.test.ts` 或 `<filename>.test.tsx`
- 例如: `usePattern.ts` → `usePattern.test.ts`

### 测试结构

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("模块/功能名称", () => {
  describe("函数/方法名称", () => {
    it("应该<预期行为描述>", () => {
      // Arrange - 准备
      // Act - 执行
      // Assert - 断言
    });
  });
});
```

### 测试最佳实践

1. **测试描述使用中文**：便于理解测试意图
2. **每个测试只验证一个行为**：保持测试简洁
3. **使用 Arrange-Act-Assert 模式**：结构清晰
4. **Mock 外部依赖**：隔离测试单元
5. **测试边界条件**：包括空值、极端值等

### 覆盖率要求

- 核心业务逻辑（hooks, utils）：>= 80%
- 纯 UI 组件可适当降低要求

## 代码规范

### TypeScript

- 严格模式已启用 (`strict: true`)
- 禁止未使用的变量和参数
- 所有函数参数和返回值都应有类型注解

### 命名约定

- **组件**: PascalCase (例: `PatternEditor`)
- **hooks**: camelCase，以 `use` 开头 (例: `usePattern`)
- **工具函数**: camelCase (例: `savePattern`)
- **常量**: UPPER_SNAKE_CASE (例: `DEFAULT_BPM`)
- **类型/接口**: PascalCase (例: `Pattern`, `DrumType`)

### 文件组织

- 每个组件单独文件夹，包含 `.tsx` 和 `.css`
- 相关的测试文件放在同一目录
- 公共类型定义放在 `types/` 目录

## Git 工作流

### 分支命名

- `feat/<功能名>` - 新功能
- `fix/<问题描述>` - Bug 修复
- `refactor/<重构内容>` - 代码重构
- `test/<测试内容>` - 添加或修改测试
- `docs/<文档内容>` - 文档更新

### 提交前检查清单

1. ✅ 所有测试通过 (`bun run test:run`)
2. ✅ TypeScript 类型检查通过 (`bun run typecheck`)
3. ✅ ESLint 检查通过 (`bun run lint`)
4. ✅ 新功能有对应的测试用例
5. ✅ 文档已更新（如果需要）

### Commit 信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型:

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档
- `style`: 格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

## 核心模块说明

### Pattern 数据结构

```typescript
interface Pattern {
  id: string;
  name: string;
  bpm: number;
  timeSignature: [number, number];
  bars: number;
  grid: CellState[][]; // [drumIndex][beatIndex]
  drums: DrumType[];
  loopRange?: LoopRange;
  createdAt: number;
  updatedAt: number;
}
```

### CellState 状态

- `0` (CELL_OFF): 未激活
- `1` (CELL_NORMAL): 正常音符
- `2` (CELL_GHOST): 鬼音（弱音）
- `3` (CELL_GRACE): 倚音
- `4` (CELL_DOUBLE_32): 双 32 分音符
- `5` (CELL_FIRST_32): 前半 32 分音符
- `6` (CELL_SECOND_32): 后半 32 分音符

### 音频引擎

音频引擎使用 Web Audio API，支持：

- 真实采样播放
- 合成音色（后备方案）
- 精确的时序调度
- IndexedDB 缓存

## 常用开发命令

```bash
# 启动开发服务器
bun run dev

# 构建生产版本
bun run build

# 类型检查
bun run typecheck

# 代码检查
bun run lint

# 运行测试
bun run test

# 预览生产构建
bun run preview
```

## 注意事项

1. **音频测试**: 音频相关的测试需要 mock Web Audio API
2. **存储测试**: localStorage 在测试环境中会被自动 mock
3. **异步测试**: 使用 `async/await` 和 `waitFor` 处理异步操作
4. **组件测试**: 使用 React Testing Library，优先使用用户行为驱动的测试

---

_最后更新: 2026-01-16_
