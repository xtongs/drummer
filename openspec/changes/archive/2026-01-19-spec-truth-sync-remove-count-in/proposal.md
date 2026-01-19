# Change: 以当前实现为准修正规范（并移除 count-in）

## Why

当前 `openspec/specs/` 内存在多处规范之间冲突、以及与当前代码实现不一致的描述（例如 BPM 范围、默认 bars、鼓件命名/顺序、音量比例等），会导致后续开发与验收依据不清晰。

另外，`specs/metronome` 中包含 **count-in（预备拍）** 能力描述，但项目当前不打算实现，需要从规范中移除以避免误导。

## What Changes

- 以当前实现为真相，修正以下规范内容：
  - `specs/metronome/`：移除 count-in；明确 UI BPM 调整范围与导入/存储校验范围
  - `specs/pattern-management/`：修正默认 bars、鼓件列表（命名与顺序）、BPM 范围描述
  - `specs/pattern-editor/`：修正与实现不一致的 bars 上限描述
  - `specs/audio-engine/`：修正 ghost 力度比例、采样标识符命名、AudioContext 配置描述
  - `specs/loop-range/`：修正规范与当前 LoopRangeSelector 行为一致（自动扩展、切换 Pattern 的重置逻辑等）
  - `specs/storage/`：修正保存/加载 BPM 的校验位置描述（保存不校验、加载校验）

## Impact

- 影响的规范:
  - `specs/metronome/`
  - `specs/pattern-management/`
  - `specs/pattern-editor/`
  - `specs/audio-engine/`
  - `specs/loop-range/`
  - `specs/storage/`
- 影响的代码: 无（仅文档变更）

## Notes

- 本变更为 **truth sync（仅文档）**，不修改任何运行时行为。

