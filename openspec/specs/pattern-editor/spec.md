# Pattern Editor 规范

## 概述

Pattern Editor 是 Drummer 的核心编辑界面，提供网格编辑器、鼓谱显示、小节控制等功能。

## 需求

### Requirement: 网格编辑

系统 SHALL 提供交互式网格编辑器，允许用户编辑鼓点。

#### Scenario: 点击切换单元格

- **GIVEN** 网格已渲染
- **WHEN** 用户点击单元格
- **THEN** 单元格状态在 OFF 和 NORMAL 之间切换
- **AND** 视觉反馈立即更新

#### Scenario: 长按切换鬼音

- **GIVEN** 单元格处于 NORMAL 状态
- **WHEN** 用户长按单元格（>300ms）
- **THEN** 单元格状态切换到 GHOST
- **AND** 显示弱音视觉样式

#### Scenario: 双击循环 32 分音符

- **GIVEN** 单元格处于激活状态
- **WHEN** 用户双击单元格
- **THEN** 状态在以下循环：NORMAL → DOUBLE_32 → FIRST_32 → SECOND_32 → NORMAL

### Requirement: 鼓谱显示

系统 SHALL 显示五线谱格式的鼓谱。

#### Scenario: 实时同步

- **GIVEN** Pattern 网格有内容
- **WHEN** 用户编辑网格
- **THEN** 鼓谱实时更新显示
- **AND** 使用 VexFlow 渲染标准鼓谱符号

#### Scenario: 播放位置指示

- **GIVEN** Pattern 正在播放
- **WHEN** 每个 subdivision 到达
- **THEN** 鼓谱上显示当前播放位置指示器
- **AND** 指示器平滑移动

### Requirement: 小节控制

系统 SHALL 允许用户增减小节数量。

#### Scenario: 增加小节

- **GIVEN** 当前小节数 < 16
- **WHEN** 用户点击 "+" 按钮
- **THEN** 在当前播放位置附近插入新小节
- **AND** 新小节初始化为空白
- **AND** 循环范围自动扩展（如适用）

#### Scenario: 减少小节

- **GIVEN** 当前小节数 > 1
- **WHEN** 用户点击 "-" 按钮
- **THEN** 删除最后一个小节
- **AND** 循环范围自动调整（如超出范围）

#### Scenario: 智能插入位置

- **GIVEN** 正在播放且有播放位置
- **WHEN** 用户点击 "+" 按钮
- **THEN** 根据播放位置判断插入位置：
  - 在小节前半部分：在该小节前插入
  - 在小节后半部分：在该小节后插入

### Requirement: 清空网格

系统 SHALL 允许用户一键清空所有鼓点。

#### Scenario: 清空确认

- **GIVEN** 网格中有鼓点
- **WHEN** 用户点击清空按钮
- **THEN** 所有单元格重置为 CELL_OFF
- **AND** 不改变小节数和其他设置

### Requirement: 水平滚动

系统 SHALL 支持网格和鼓谱的水平滚动。

#### Scenario: 手动滚动

- **GIVEN** Pattern 小节数较多（超出视口）
- **WHEN** 用户水平滑动
- **THEN** 网格和鼓谱同步滚动

#### Scenario: 播放时自动滚动

- **GIVEN** Pattern 正在播放
- **WHEN** 播放位置即将超出视口
- **THEN** 自动滚动使播放位置保持可见
- **AND** 滚动平滑，不影响用户体验

### Requirement: Pattern 标签页

系统 SHALL 显示已保存的 Pattern 标签页。

#### Scenario: 切换 Pattern

- **GIVEN** 有多个已保存的 Pattern
- **WHEN** 用户点击标签
- **THEN** 加载对应的 Pattern 到编辑器
- **AND** 如有未保存更改，提示用户

#### Scenario: 草稿模式

- **GIVEN** 用户点击草稿标签（○）
- **WHEN** 切换到草稿模式
- **THEN** 显示临时编辑区
- **AND** 草稿不会自动保存

### Requirement: 导入/导出

系统 SHALL 支持 Pattern 的导入和导出。

#### Scenario: 长按导出

- **GIVEN** 当前编辑的是已保存的 Pattern
- **WHEN** 用户长按保存按钮
- **THEN** 将 Pattern JSON 复制到剪贴板
- **OR** 显示可选择复制的文本框（如剪贴板 API 不可用）

#### Scenario: 导入 Pattern

- **GIVEN** 用户有有效的 Pattern JSON
- **WHEN** 通过导入功能粘贴
- **THEN** 验证 JSON 格式
- **AND** 成功则创建新 Pattern
- **AND** 失败则显示错误提示

## 单元格状态视觉样式

| 状态 | 外观 | 描述 |
|------|------|------|
| CELL_OFF | 空白/透明 | 未激活 |
| CELL_NORMAL | 实心圆点 | 正常音符 |
| CELL_GHOST | 半透明圆点 | 鬼音（弱） |
| CELL_GRACE | 小圆点+主圆点 | 倚音 |
| CELL_DOUBLE_32 | 双圆点 | 双 32 分 |
| CELL_FIRST_32 | 左半圆点 | 前半 32 分 |
| CELL_SECOND_32 | 右半圆点 | 后半 32 分 |

## 技术约束

### 单元格尺寸

- 动态计算，适应不同屏幕宽度
- 最小 24px，最大 48px
- 使用 `useGridCellSize` hook 计算

### 触摸交互

- 支持触摸设备
- 防止滚动时误触发编辑
- 长按延迟: 300ms
