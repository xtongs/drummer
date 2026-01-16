# Design: VexFlow notation renderer + Legacy 切换

## Goals

- 提供基于 VexFlow 的 notation 渲染实现（优先 SVG 输出）
- 保留现有自绘 SVG（Legacy）实现
- UI 可切换，并持久化用户选择
- 保持交互兼容：双击/双触 → `subdivision` → `seekTo(subdivision)` 行为不变

## Non-Goals（本次不做）

- 100% 复刻 Legacy 的所有视觉细节（如 ghost/grace 的括号样式）
- 将默认渲染器切换为 VexFlow（先保持 Legacy 为默认）
- 完整实现鼓谱标准（连线、符尾、符杠、力度记号等）

## Architecture

### Renderer 分层

- `LegacyDrumNotation`: 现有实现迁移，保持对外行为一致
- `VexFlowDrumNotation`: 新实现，内部使用 VexFlow 生成 SVG
- `DrumNotation`（wrapper）: 只负责选择 renderer + 统一交互事件（double click / double tap）

### Settings

- 以 `localStorage` 保存 `notationRenderer`:
  - 值域：`"legacy" | "vexflow"`
  - 默认：`"legacy"`
- 提供 `getNotationRenderer()` / `setNotationRenderer()` 工具函数

## Interaction Compatibility

- Legacy 当前通过 `x / cellWidth` 计算 `subdivision`，并调用 `onDoubleClick(subdivision)`
- VexFlow 版本必须复用同样逻辑：事件绑定在统一容器（或 SVG 根）上，通过同样方式换算

## Performance Notes

- VexFlow 渲染会在 `pattern` 改变时触发重绘
- 初版采用“整幅重绘”策略；如有性能问题，再引入 memoization / incremental update

## Testing Strategy

- Settings：纯函数单测
- UI：RTL 测试切换按钮与持久化行为
- 交互：模拟 double click，验证 `onNotationDoubleClick` 的参数
- VexFlow：对 VexFlow API mock，验证调用路径而不做真实绘制
