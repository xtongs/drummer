# Pattern Management 规范

## 概述

Pattern（节奏型）管理是 Drummer 的核心功能，负责节奏型的创建、编辑、保存、加载和删除。

## 需求

### Requirement: Pattern 创建

系统 SHALL 允许用户创建新的节奏型，包含默认配置。

#### Scenario: 创建默认节奏型

- **GIVEN** 用户打开应用
- **WHEN** 首次加载或点击"新建"
- **THEN** 创建一个包含默认配置的 Pattern：
  - BPM: 120
  - 拍号: 4/4
  - 小节数: 2
  - 鼓组: [kick, snare, hi-hat-closed, hi-hat-open, crash, ride, tom1, tom2, tom3]
  - 网格: 全部为 CELL_OFF

### Requirement: Pattern 编辑

系统 SHALL 允许用户编辑节奏型的各项属性。

#### Scenario: 修改 BPM

- **GIVEN** 已加载一个 Pattern
- **WHEN** 用户调整 BPM 值（范围 30-300）
- **THEN** Pattern 的 BPM 更新
- **AND** 播放速度实时响应变化

#### Scenario: 修改拍号

- **GIVEN** 已加载一个 Pattern
- **WHEN** 用户修改拍号
- **THEN** 网格自动调整以匹配新拍号
- **AND** 保留现有音符数据（在有效范围内）

#### Scenario: 修改小节数

- **GIVEN** 已加载一个 Pattern
- **WHEN** 用户增加/减少小节数
- **THEN** 网格列数相应调整
- **AND** 扩展时新列填充 CELL_OFF
- **AND** 收缩时多余列被截断

### Requirement: Pattern 保存

系统 SHALL 允许用户保存节奏型到本地存储。

#### Scenario: 保存新 Pattern

- **GIVEN** 用户编辑了一个新 Pattern
- **WHEN** 点击保存按钮
- **THEN** 弹出命名对话框
- **AND** 用户输入名称后保存到 localStorage
- **AND** 更新 Pattern 的 createdAt 和 updatedAt

#### Scenario: 更新已有 Pattern

- **GIVEN** 用户编辑了一个已保存的 Pattern
- **WHEN** 点击保存按钮
- **THEN** 覆盖原有数据
- **AND** 只更新 updatedAt

### Requirement: Pattern 加载

系统 SHALL 允许用户加载已保存的节奏型。

#### Scenario: 从列表加载

- **GIVEN** localStorage 中存在已保存的 Pattern
- **WHEN** 用户点击 Pattern 列表中的项目
- **THEN** 当前编辑器加载该 Pattern 数据
- **AND** 如有未保存更改，提示用户确认

### Requirement: Pattern 删除

系统 SHALL 允许用户删除已保存的节奏型。

#### Scenario: 删除 Pattern

- **GIVEN** Pattern 列表中存在已保存的项目
- **WHEN** 用户点击删除按钮
- **THEN** 弹出确认对话框
- **AND** 确认后从 localStorage 移除
- **AND** 更新列表显示

### Requirement: Pattern 复制

系统 SHALL 允许用户复制节奏型。

#### Scenario: 复制 Pattern 数据

- **GIVEN** 已加载一个 Pattern
- **WHEN** 用户执行复制操作
- **THEN** Pattern 的网格数据被复制到剪贴板
- **AND** 可粘贴到其他应用或导入回本应用

## 边界条件

| 属性             | 最小值 | 最大值 | 默认值     |
| ---------------- | ------ | ------ | ---------- |
| BPM              | 30     | 300    | 120        |
| 小节数           | 1      | 16     | 2          |
| Pattern 名称长度 | 1      | 50     | "Untitled" |

## 错误处理

### Scenario: localStorage 已满

- **WHEN** 保存时 localStorage 空间不足
- **THEN** 显示错误提示
- **AND** 不丢失当前编辑数据

### Scenario: 数据损坏

- **WHEN** 加载的 Pattern 数据格式无效
- **THEN** 跳过该 Pattern
- **AND** 记录错误日志
- **AND** 不影响其他 Pattern 加载
