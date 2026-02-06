## ADDED Requirements

### Requirement: UI 语言偏好存储

系统 SHALL 持久化 Settings 弹窗的 UI 语言偏好。

#### Scenario: 保存语言偏好

- **GIVEN** 用户在 Settings 中选择 `auto` 或某个具体语言代码
- **WHEN** 调用语言偏好保存接口
- **THEN** 系统将该值写入 localStorage

#### Scenario: 加载语言偏好

- **GIVEN** 应用初始化
- **WHEN** 调用语言偏好读取接口
- **THEN** 返回已保存的有效值
- **AND** 若值缺失或非法，返回 `auto`
