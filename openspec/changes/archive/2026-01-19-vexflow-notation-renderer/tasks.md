# Tasks: 使用 VexFlow 绘制 notation 区域，并支持新旧渲染切换

## 1. 规范对齐（Review）

- [x] 1.1 对齐规范差异清单：逐条核对 `openspec/changes/vexflow-notation-renderer/specs/pattern-editor/spec.md` 中的 **SHALL** 行为是否都在任务覆盖范围内  
  - 验收：产出"spec 条目 → 代码位置/测试用例"的 checklist（至少覆盖：映射表、two voices、32 分拆分、双击以 subdivision、颜色一致、布局无跳变、渲染器切换与持久化、符杠连接、简化休止符、静默回退）

## 2. 核心实现

- [x] 2.1 拆分现有 `DrumNotation` 为 `LegacyDrumNotation`（保留现状实现）  
  - 验收：Legacy 渲染在功能与交互上与当前一致；相关测试全绿

- [x] 2.2 新增 settings 存储：`drummer-notation-renderer`（localStorage）  
  - 验收：默认值为 `"legacy"`；非法值回退默认；`set` 后 `get` 返回一致

- [x] 2.3 新增 `VexFlowDrumNotation`（VexFlow SVG 渲染）  
  - 验收：按 spec diff 完成关键语义映射：
    - DrumType → 线位/符头/附加标记（open hihat "o" 等）
    - 上下声部（Kick 下声部、其余上声部）时间对齐（x 坐标对齐）
    - 32 分拆分（DOUBLE/FIRST/SECOND）在 subdivision 内均匀分布
    - 符杠连接（beaming）：按 beat 分组，休止符或拍边界会打断
    - 简化休止符：整拍或更长空白显示休止符，短空隙可省略

- [x] 2.4 新增 wrapper `DrumNotation`：按设置选择渲染器，并统一交互与兜底  
  - 验收：Legacy/VexFlow 下 `onNotationDoubleClick(subdivision)` 行为一致；VexFlow 渲染异常时自动回退 Legacy（notation 区域仍可用）

- [x] 2.5 在 `PatternEditor` 增加渲染方式切换 UI（VexFlow / Legacy）  
  - 验收：
    - 切换控件位于 `pattern-editor-actions-right` 内最左侧
    - 使用"音符 SVG 图标"的 button（无文字标签），默认样式与 `pattern-tab` 一致
    - active 状态背景为 primary，表示当前为 VexFlow
    - 点击为 toggle：Legacy → VexFlow → Legacy
    - 切换后立即生效；刷新后保持选择；默认仍为 Legacy

## 3. 测试（TDD）

- [x] 3.1 单测：settings 读写与默认/容错  
  - 验收：覆盖默认值、非法值回退、set/get 一致性

- [x] 3.2 组件测：切换 UI 与持久化  
  - 验收：RTL 验证切换会改变渲染器；刷新/重新挂载后仍保持选择

- [x] 3.3 交互测：双击/双触 subdivision 映射一致  
  - 验收：在 Legacy 与 VexFlow 下，对同一 x 位置触发交互，得到相同 subdivision

- [x] 3.4 VexFlow 渲染测试（mock VexFlow）  
  - 验收：验证渲染入口与"two voices/32 分/open hihat"关键语义映射被调用；避免在 JSDOM 进行真实绘制

- [x] 3.5 beaming/rests 测试（mock VexFlow）  
  - 验收：验证符杠分组以 beat 为边界、休止符/拍边界会打断；验证整拍空白时会生成休止符（短空隙允许省略）

- [x] 3.6 回退测试：VexFlow 异常自动回退 Legacy  
  - 验收：模拟 VexFlow 抛错时仍渲染 Legacy 且交互可用

## 4. 验证

- [x] 4.1 `bun run test:run` 全量通过
- [x] 4.2 `bun run typecheck` 通过
- [x] 4.3 `bun run lint` 通过

## 验收标准（最终）

- [x] 默认渲染方式保持与当前版本一致（Legacy）
- [x] 用户可以在 UI 中选择 **VexFlow / Legacy** 两种 notation 绘制方式
- [x] 切换后立即生效，并在刷新页面后保持用户选择
- [x] 双击/双触 notation 的 subdivision 计算行为与当前版本一致
- [x] VexFlow 渲染异常时，系统自动回退到 Legacy，保证 notation 区域可用
