## ADDED Requirements

### Requirement: 完整练习模式背景音乐控件

系统 SHALL 在完整练习模式下提供背景音乐上传与控制 UI。

#### Scenario: 控件可见性与布局

- **GIVEN** 系统处于完整练习模式
- **WHEN** Pattern Editor 渲染
- **THEN** 背景音乐控件 SHALL 显示在 scrollable 区域下方
- **AND** 控件两端对齐排列
- **AND** 仅在完整练习模式下显示

#### Scenario: 控件样式

- **GIVEN** 背景音乐控件渲染
- **WHEN** 渲染上传/控制按钮
- **THEN** 按钮样式 SHALL 遵循现有按钮规范
- **AND** 使用 SVG 图标
- **AND** 控件包含音量与偏移量调节，均为图标 + 数字 + +/- 按钮布局

#### Scenario: 播放位置同步

- **GIVEN** 用户暂停播放并移动鼓谱游标到新位置
- **WHEN** 用户再次开始播放
- **THEN** 背景音乐播放位置 SHALL 与当前游标位置对齐
- **AND** 应用已设置的偏移量
- **AND** 背景音乐位置基于当前 subdivision 的绝对时间

### Requirement: Loop Range 游标对齐

系统 SHALL 在调整 loop range 后对齐游标位置。

#### Scenario: 调整起始小节

- **GIVEN** 用户调整 loop range 的起始小节
- **WHEN** 当前 pattern 与起始 pattern 相同
- **THEN** 游标 SHALL 跳转到新的起始小节
