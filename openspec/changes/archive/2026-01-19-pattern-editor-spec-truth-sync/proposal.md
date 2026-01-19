# Change: 同步 Pattern Editor 规范为当前实现（truth sync，仅文档）

## Why

`openspec/specs/pattern-editor/spec.md` 中包含多处与当前代码实现不一致的描述（例如 VexFlow 渲染器切换、五线谱 vs 六线谱、加/减小节行为、长按交互语义等），会导致后续开发与测试的验收依据不清晰。

## What Changes

- 仅修改规范文档以匹配当前实现（**非 BREAKING**，不改代码行为）
- 明确区分：
  - 现状：Legacy 自绘 SVG 鼓谱（六线谱视觉）与现有网格交互
  - 规划：VexFlow 渲染器与切换能力（已在 `changes/vexflow-notation-renderer/` 中定义）

## Impact

- 影响的规范:
  - `specs/pattern-editor/`
- 影响的代码:
  - 无（仅文档变更）

