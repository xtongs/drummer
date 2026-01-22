## ADDED Requirements

### Requirement: 手机横屏完整练习模式

系统 SHALL 在手机横屏时进入完整练习模式，并根据该模式调整编辑器布局。

#### Scenario: 进入完整练习模式

- **GIVEN** 用户在手机设备上使用应用
- **WHEN** 设备处于横屏方向
- **THEN** 系统 SHALL 进入完整练习模式

#### Scenario: 完整练习模式布局

- **GIVEN** 系统处于完整练习模式
- **WHEN** Pattern Editor 渲染
- **THEN** grid 区域 SHALL 隐藏
- **AND** notation 区域 SHALL 在视口内展示两个小节
