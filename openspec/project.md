# Drummer 项目上下文

## 项目概述

Drummer 是一个基于 React + TypeScript + Vite 构建的鼓机/节拍器 PWA 应用。支持多种鼓点编辑、节拍器功能、模式管理和音频导出。

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | ^18.2.0 |
| 语言 | TypeScript | ^5.2.2 |
| 构建工具 | Vite | ^4.5.14 |
| 测试框架 | Vitest | ^4.0.17 |
| 测试库 | React Testing Library | ^16.3.1 |
| 包管理器 | bun | (优先使用) |
| PWA | vite-plugin-pwa | ^1.2.0 |
| 音乐记谱 | VexFlow | ^5.0.0 |

## 核心数据结构

### Pattern（节奏型）

```typescript
interface Pattern {
  id: string;
  name: string;
  bpm: number;
  timeSignature: [number, number];
  bars: number;
  grid: CellState[][];  // [drumIndex][beatIndex]
  drums: DrumType[];
  loopRange?: LoopRange;
  createdAt: number;
  updatedAt: number;
}
```

### CellState（单元格状态）

| 值 | 常量 | 含义 |
|----|------|------|
| 0 | CELL_OFF | 未激活 |
| 1 | CELL_NORMAL | 正常音符 |
| 2 | CELL_GHOST | 鬼音（弱音） |
| 3 | CELL_GRACE | 倚音 |
| 4 | CELL_DOUBLE_32 | 双 32 分音符 |
| 5 | CELL_FIRST_32 | 前半 32 分音符 |
| 6 | CELL_SECOND_32 | 后半 32 分音符 |

## 开发约定

### 命名规范

- **组件**: PascalCase (例: `PatternEditor`)
- **Hooks**: camelCase，以 `use` 开头 (例: `usePattern`)
- **工具函数**: camelCase (例: `savePattern`)
- **常量**: UPPER_SNAKE_CASE (例: `DEFAULT_BPM`)
- **类型/接口**: PascalCase (例: `Pattern`, `DrumType`)

### 测试策略

- 采用 TDD（测试驱动开发）方法论
- 核心业务逻辑（hooks, utils）覆盖率 >= 80%
- 测试文件与源文件同目录，命名格式: `*.test.ts(x)`
- 使用 Arrange-Act-Assert 模式
- 测试描述使用中文

### 文件组织

```
src/
├── components/       # UI 组件（每个组件独立文件夹）
│   └── ComponentName/
│       ├── ComponentName.tsx
│       └── ComponentName.css
├── hooks/           # 自定义 React Hooks
├── types/           # TypeScript 类型定义
├── utils/           # 工具函数
├── styles/          # 全局样式
├── sounds/          # 音频采样文件
└── test/            # 测试配置
```

### Git 工作流

- 分支命名: `feat/<功能名>`, `fix/<问题描述>`, `refactor/<重构内容>`
- Commit 格式: `<type>(<scope>): <subject>`

## 非功能需求

### 性能
- 首屏加载时间 < 3s
- 音频延迟 < 50ms
- 支持离线使用（PWA）

### 兼容性
- 现代浏览器（Chrome, Firefox, Safari, Edge 最新版本）
- 移动端触摸交互支持

### 安全
- 用户数据仅存储在本地（localStorage）
- 无外部 API 调用

## 常用命令

```bash
bun run dev          # 启动开发服务器
bun run build        # 构建生产版本
bun run test         # 运行测试
bun run test:watch   # 监视模式测试
bun run test:coverage # 覆盖率报告
bun run typecheck    # 类型检查
bun run lint         # 代码检查
```
