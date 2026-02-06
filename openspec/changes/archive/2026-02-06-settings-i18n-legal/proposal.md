# Change: Settings 多语言与法律文案支持

## Why

当前 Settings 弹窗的介绍文本仅有单语言，不支持跟随系统语言或手动切换；同时缺少隐私政策和用户协议的应用内展示，影响国际化可用性与合规信息可达性。

## What Changes

- 在 Settings 弹窗新增语言选择器，默认 `Auto`（跟随系统语言）。
- 支持数十种常见语言的介绍文本、隐私政策、用户协议文案展示。
- 新增语言偏好持久化存储（`auto` 或指定语言代码）。
- 在 Settings 弹窗新增“隐私政策”和“用户协议”内容区块，并纳入多语言体系。
- 补充单元测试，覆盖默认语言解析、手动切换、持久化读取与关键文案渲染。

## Impact

- 影响的规范:
  - `pattern-editor`（Settings 弹窗内容与交互）
  - `storage`（语言偏好存储）
- 影响的代码:
  - `src/components/Settings/Settings.tsx`
  - `src/components/Settings/Settings.css`
  - `src/components/Settings/Settings.test.tsx`
  - `src/utils/storage.ts`
  - `src/utils/storage.test.ts`
