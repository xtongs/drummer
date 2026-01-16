# Change: 添加音量渐变功能

> ⚠️ 这是一个示例变更提案，展示 OpenSpec 流程的使用方式

## Why

当前播放开始和停止时音量是突变的，可能导致听感上的不适（Pop 声）。需要添加音量渐变（fade in/out）功能来改善用户体验。

## What Changes

- 播放开始时添加 fade-in 效果（默认 50ms）
- 播放停止时添加 fade-out 效果（默认 50ms）
- 添加用户可配置的渐变时长选项
- 在设置中添加开关控制

## Impact

- 影响的规范: `specs/audio-engine/`, `specs/metronome/`
- 影响的代码: 
  - `src/utils/audioEngine.ts`
  - `src/hooks/useMetronome.ts`
  - `src/components/MetronomeBar/`

## Risks

- 渐变可能影响精确的节拍时序
- 需要确保渐变不会影响多声部同时播放

## Alternatives Considered

1. **固定渐变时长**：更简单，但灵活性不足
2. **仅 fade-out**：部分解决问题，但不完整
3. **无渐变（当前状态）**：不解决问题

## Decision

选择方案：完整的 fade-in/out 支持，带可配置时长。
