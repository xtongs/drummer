# Tasks: 使用 VexFlow 绘制 notation 区域，并支持新旧渲染切换

## 1. 规范与设计

- [ ] 1.1 添加本变更的 `design.md`，明确 renderer 架构、交互兼容与性能策略
- [ ] 1.2 在 `openspec/changes/vexflow-notation-renderer/specs/` 增加对 `pattern-editor` 的 spec 差异说明

## 2. 核心实现

- [ ] 2.1 拆分现有 `DrumNotation` 为 `LegacyDrumNotation`（保留现状实现）
- [ ] 2.2 新增 `VexFlowDrumNotation`（VexFlow SVG 渲染）
- [ ] 2.3 新增 wrapper `DrumNotation`：根据设置选择渲染器，并确保双击/双触映射一致
- [ ] 2.4 在 `PatternEditor` 增加渲染方式切换 UI
- [ ] 2.5 新增设置持久化：读取/写入 `notationRenderer`（localStorage）

## 3. 测试（TDD）

- [ ] 3.1 单测：设置读写与默认值（storage/settings）
- [ ] 3.2 组件测：切换 UI 能正确切换 renderer，并持久化选择
- [ ] 3.3 交互测：双击 notation 仍正确触发 `onNotationDoubleClick(subdivision)`
- [ ] 3.4 VexFlow 渲染测试：对 VexFlow 调用进行 mock，验证渲染入口被调用（避免在 JSDOM 真实绘制）

## 4. 验证

- [ ] 4.1 `bun run test:run` 全量通过
- [ ] 4.2 `bun run typecheck` 通过
- [ ] 4.3 `bun run lint` 通过

## 验收标准

- 用户可以在 UI 中选择 **VexFlow / Legacy** 两种 notation 绘制方式
- 切换后立即生效，并在刷新页面后保持用户选择
- 双击/双触 notation 的 subdivision 计算行为与当前版本一致
- 默认渲染方式保持与当前版本一致（Legacy）
