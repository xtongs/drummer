# 变更：节奏型播放前一小节计拍

## Why

在练习时，直接进入节奏型播放容易错过起拍，需要在播放前提供一个完整小节的计拍提示，帮助用户进入节奏。

## What Changes

- 增加“播放前计拍”开关按钮（节拍器图标），位于练习模式切换按钮左侧
- 当开关启用时，播放节奏型前先播放一小节计拍，随后再开始节奏型与 BGM 播放
- 计拍使用 range start 小节所在 pattern 的拍号与 BPM（含速率设置）

## Impact

- 影响规范：`openspec/specs/pattern-editor/spec.md`
- 影响代码（预期）：
  - `src/App.tsx`（播放流程与计拍调度）
  - `src/components/PatternEditor/PatternEditor.tsx`（新增按钮）
  - `src/components/PatternEditor/PatternEditor.css`（按钮样式）

## Risks

- 计拍期间 UI 播放状态可能与节奏型播放状态不一致
- 若跨 pattern range 起始 pattern 未加载，需确保回退逻辑一致

## Alternatives Considered

1. **默认总是计拍**：影响已有用户习惯
2. **放到设置页面**：操作路径更长，不便快捷切换

## Decision

提供手动开关的播放前计拍功能，默认关闭。
