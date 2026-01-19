# Design: VexFlow notation renderer + Legacy 切换

## Goals

- 提供基于 VexFlow 的 notation 渲染实现（优先 SVG 输出）
- 保留现有自绘 SVG（Legacy）实现
- UI 可切换，并持久化用户选择
- 保持交互兼容：双击/双触 → `subdivision` → `seekTo(subdivision)` 行为不变

## Non-Goals（本次不做）

- 100% 复刻 Legacy 的所有视觉细节（如 ghost/grace 的括号样式）
- 将默认渲染器切换为 VexFlow（先保持 Legacy 为默认）
- 完整实现鼓谱标准（例如连线/连音线、力度记号、装饰音高级样式等；本次以 spec diff 为准）

## Alternatives（备选方案与取舍）

### A) Wrapper + 两套 Renderer（本次采用）

- 做法：保留 `LegacyDrumNotation`，新增 `VexFlowDrumNotation`，由 `DrumNotation` wrapper 选择渲染器并统一交互事件。
- 优点：隔离新旧实现；可快速切换与回退；利于逐步对齐规范。
- 缺点：短期内维护两套渲染代码；需要保证两者交互映射一致。

### B) 单组件内部分支（未采用）

- 做法：在现有 `DrumNotation` 内部按设置分支渲染逻辑。
- 优点：文件数量少，改动集中。
- 缺点：耦合度高、难测试；新旧逻辑容易互相污染，后续清理成本更大。

### C) VexFlow Canvas 渲染（未采用）

- 做法：使用 VexFlow Canvas backend 而非 SVG。
- 优点：更接近传统“画布”渲染模型。
- 缺点：与现有基于 DOM/SVG 的事件/样式体系差异更大；导出/样式一致性与可测试性成本更高。

## Architecture

### Renderer 分层

- `LegacyDrumNotation`: 现有实现迁移，保持对外行为一致
- `VexFlowDrumNotation`: 新实现，内部使用 VexFlow 生成 SVG
- `DrumNotation`（wrapper）: 只负责选择 renderer + 统一交互事件（double click / double tap）

### Settings

- 以 `localStorage` 保存渲染器选择（**全局设置，不随 Pattern 保存**）：
  - key: `drummer-notation-renderer`
  - 值域：`"legacy" | "vexflow"`
  - 默认：`"legacy"`
  - 容错：读取到非法值时回退默认值
- 提供 `getNotationRenderer()` / `setNotationRenderer()` 工具函数（或等价 hook），供 UI 与 wrapper 使用。

### UI（切换控件）

- 切换控件位于 `pattern-editor-actions-right` 内最左侧
- 使用“音符 SVG 图标”的 button（无文字标签）
- 默认样式与 `pattern-tab` 一致
- 当渲染器为 VexFlow 时按钮处于 active 状态，背景色为 primary
- 点击为 toggle：Legacy → VexFlow → Legacy

### Fallback（可用性兜底）

- `VexFlowDrumNotation` 在渲染阶段发生异常（throw）时：
  - wrapper SHALL 自动回退到 `LegacyDrumNotation`（保持 notation 区域可用）
  - 系统 SHALL 静默回退（不强制提示用户）
  - 系统 MAY 记录错误（例如 `console.error`，仅开发态即可）

## Interaction Compatibility

- Legacy 当前通过 `x / cellWidth` 计算 `subdivision`，并调用 `onDoubleClick(subdivision)`
- VexFlow 版本必须复用同样逻辑：事件绑定在统一容器（或 SVG 根）上，通过同样方式换算

## Testing Strategy

- Settings（单测）：
  - 默认值为 `"legacy"`
  - 非法值回退默认
  - set 后 get 返回一致
- UI（组件测，RTL）：
  - 切换按钮能在 `"legacy" | "vexflow"` 之间切换
  - 切换后立即生效（wrapper 选择的 renderer 发生变化）
  - 刷新后保持用户选择（来自 localStorage）
- 交互（组件测，RTL）：
  - double click / double tap 均能触发 `onNotationDoubleClick(subdivision)`
  - 在 Legacy 与 VexFlow 下 subdivision 计算一致
- VexFlow（单测/组件测）：
  - 对 VexFlow 进行 mock：验证渲染入口被调用、且按规范的“上下声部(two voices)”组织音符
  - 验证 32 分拆分、open hihat “o” 标记等关键语义映射
  - 验证渲染异常时自动回退 Legacy（fallback）
