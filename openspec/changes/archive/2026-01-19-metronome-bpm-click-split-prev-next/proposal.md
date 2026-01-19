# Change: Metronome BPM 数字点击区域左右分区（next/prev）

## Why

当前 BPM 数字区域点击只能单向循环变速倍率，无法快速“向前/向后”切换倍率，操作效率低。

## What Changes

- 将 BPM 数字点击热区分成左右两部分：左侧点击按 `rates` 顺序向后（next）循环，右侧点击向前（prev）循环
- 变速倍率的计算保持与现有 `rateIndex`/`calculateCumulativeRate` 的累积逻辑一致

## Impact

- 影响的规范: `specs/metronome/`（交互细节补充/保持一致）
- 影响的代码: `src/components/MetronomeBar/MetronomeBar.tsx`, `src/components/MetronomeBar/MetronomeBar.css`

