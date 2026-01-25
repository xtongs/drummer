# 变更：节奏型网格复制与前后粘贴

## Why

用户希望将一个节奏型的鼓点网格快速复制到另一个节奏型，并在目标节奏型前/后插入，以便快速扩展编排。

## What Changes

- 在 BarControls 后新增网格复制/粘贴按钮
- 点击复制仅复制节奏型的 grid（鼓件节奏），不复制 BPM/拍号等设置
- 复制后显示“向前插入/向后插入”两个粘贴按钮
- 在其它已保存节奏型上点击粘贴，按小节插入到前或后

## Impact

- 影响规范：`openspec/specs/pattern-editor/spec.md`
- 影响代码（预期）：
  - `src/hooks/usePattern.ts`（插入 grid 的逻辑）
  - `src/components/PatternEditor/PatternEditor.tsx`（按钮与交互）
  - `src/components/PatternEditor/PatternEditor.css`（样式）
  - `src/App.tsx`（复制缓存与粘贴流程）

## Risks

- 不同拍号/鼓件配置的 pattern 之间粘贴可能导致不一致
- 大规模粘贴可能影响性能

## Alternatives Considered

1. **使用系统剪贴板**：需要序列化与权限处理，交互更复杂
2. **只允许在同一 pattern 内粘贴**：无法满足跨 pattern 复用需求

## Decision

实现应用内复制缓存与前/后插入粘贴，并在不兼容时禁用粘贴。
