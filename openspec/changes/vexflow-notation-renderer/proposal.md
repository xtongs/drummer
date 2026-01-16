# Change: 使用 VexFlow 绘制 notation 区域，并支持新旧渲染切换

## Why

当前 notation 区域使用自绘 SVG 实现，虽然可用，但与项目规范中“使用 VexFlow 渲染标准鼓谱符号”的要求不一致，也限制了未来在标准记谱、连音/符杠、谱面布局等方向的扩展。

## What Changes

- 引入一套新的 notation 渲染实现：基于 VexFlow（优先 SVG 渲染目标）
- 保留现有自绘 SVG 渲染实现作为 Legacy 渲染器
- 在 UI 提供 **VexFlow / Legacy** 两种渲染方式的切换入口
- 将用户的渲染方式选择持久化到本地存储（localStorage）
- **非 BREAKING**：默认行为保持与当前版本一致（在确认 VexFlow 版稳定前）

## Impact

- 影响的规范: `specs/pattern-editor/`
- 影响的代码:
  - `src/components/PatternEditor/DrumNotation*.tsx`
  - `src/components/PatternEditor/PatternEditor.tsx`
  - `src/utils/storage.ts`（或新增 settings 存储工具）
  - 测试文件：相关 `*.test.tsx` / `*.test.ts`

## Risks

- VexFlow 渲染性能（每次网格编辑触发重绘）
- 触摸交互（双击/双触）需要保持与 Legacy 一致，避免影响 `seekTo(subdivision)`
- VexFlow 与自定义音符状态（ghost/grace/32 分拆分）之间的映射需要明确约束

## Decision

先以 **切换开关 + 默认 Legacy** 方式引入 VexFlow renderer，逐步对齐符号/样式；稳定后再考虑把默认渲染切换为 VexFlow（届时走新的 change 流程）。
