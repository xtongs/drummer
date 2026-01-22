# 变更：手机横屏完整练习模式

## Why

手机横屏时当前布局空间紧张，需要一个专门的练习模式来充分利用横向宽高，并减少干扰。

## What Changes

- 增加一个全局“完整练习模式”标记，在手机横屏时为 true
- 在完整练习模式下隐藏 grid 区域
- 在完整练习模式下，notation 区域在视口内展示两个小节

## Impact

- 影响规范：`openspec/specs/`（notation 布局、grid 可见性、响应式行为）
- 影响代码（预期）：
  - `src/components/`（布局容器、notation 与 grid）
  - `src/hooks/` 或 `src/utils/`（横竖屏检测与全局状态）
  - `src/styles/`（响应式布局调整）

## Risks

- 全局模式标记可能在不同路由/组件间引入非预期的 UI 状态变化
- 横竖屏检测在不同设备/浏览器上可能不一致

## Alternatives Considered

1. **仅用 CSS 媒体查询**：更简单，但无法提供全局模式标记供逻辑判断
2. **提供用户开关**：更可控，但增加 UI 复杂度且无法自动适配横屏

## Decision

采用手机横屏触发的全局完整练习模式，并先实现基础行为（隐藏 grid、notation 显示两个小节）。
