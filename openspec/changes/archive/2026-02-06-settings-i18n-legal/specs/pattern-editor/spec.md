## ADDED Requirements

### Requirement: Settings 弹窗多语言内容

系统 SHALL 在 Settings 弹窗中提供语言选择能力，并对介绍文本进行多语言显示。

#### Scenario: 默认跟随系统语言

- **GIVEN** 用户未手动设置语言偏好
- **WHEN** 用户打开 Settings 弹窗
- **THEN** 系统根据 `navigator.language` 解析语言
- **AND** 若未命中支持列表，回退到英文

#### Scenario: 手动切换语言

- **GIVEN** 用户打开 Settings 弹窗
- **WHEN** 用户在语言选择器中切换到指定语言
- **THEN** 介绍文本 SHALL 立即切换到该语言
- **AND** 该选择 SHALL 持久化

### Requirement: Settings 弹窗法律文案

系统 SHALL 在 Settings 弹窗中展示隐私政策与用户协议，并支持多语言。

#### Scenario: 查看隐私政策

- **GIVEN** 用户打开 Settings 弹窗
- **WHEN** 用户滚动到法律文案区域
- **THEN** 能看到与当前语言一致的隐私政策内容

#### Scenario: 查看用户协议

- **GIVEN** 用户打开 Settings 弹窗
- **WHEN** 用户滚动到法律文案区域
- **THEN** 能看到与当前语言一致的用户协议内容
