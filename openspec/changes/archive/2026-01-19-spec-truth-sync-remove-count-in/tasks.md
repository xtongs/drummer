## 1. 规范修正（以当前实现为准）

- [x] 1.1 `specs/metronome/spec.md`：移除 count-in（预备拍）相关 Requirement/Scenario；统一 BPM 范围描述（UI 调整 40-200；导入/存储校验 20-300）
- [x] 1.2 `specs/pattern-management/spec.md`：修正默认 bars=1；鼓件列表/顺序与实现一致；更新 BPM 范围描述
- [x] 1.3 `specs/pattern-editor/spec.md`：移除/修正“bars < 16”之类实现不存在的上限描述
- [x] 1.4 `specs/audio-engine/spec.md`：修正 ghost 力度比例（30%）；采样标识符命名与实现一致；更新 AudioContext 配置描述为“默认 AudioContext + 用户交互后 resume”
- [x] 1.5 `specs/loop-range/spec.md`：修正“自动范围调整”与切换 Pattern 重置逻辑，使其与 `LoopRangeSelector` 一致
- [x] 1.6 `specs/storage/spec.md`：修正 save/load metronome BPM 的范围校验位置描述（保存不校验、加载校验）

## 2. 一致性自查

- [x] 2.1 全局搜索 `openspec/specs/`，确认不存在 count-in / 预备拍相关描述
- [x] 2.2 检查 BPM 范围在各 spec 中不再互相冲突（明确区分 UI 范围与校验范围）
- [x] 2.3 检查默认 bars、鼓件命名/顺序在相关 spec 中一致
- [x] 2.4 检查 metronome spec 不再包含未实现的开关字段（如 isMetronomeEnabled / isCountInEnabled）

