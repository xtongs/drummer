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
  - 小节数: 1
  - 鼓组（从上到下的谱面顺序）: ["Crash 1", "Crash 2", "Hi-Hat Open", "Hi-Hat Closed", "Ride", "Tom 1", "Tom 2", "Snare", "Tom 3", "Kick"]
  - 网格: 全部为 CELL_OFF

### Requirement: Pattern 编辑

系统 SHALL 允许用户编辑节奏型的各项属性。

#### Scenario: 修改 BPM

- **GIVEN** 已加载一个 Pattern
- **WHEN** 用户调整 BPM 值（UI 可调范围 40-200；导入/存储校验范围 20-300）
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

### Requirement: Pattern 导出为 ZIP

系统 SHALL 允许用户将节奏型导出为 ZIP 文件，包含节奏型数据和关联的 BGM。

#### Scenario: 导出包含 BGM 的节奏型

- **GIVEN** 已加载一个 Pattern
- **AND** 该 Pattern 已配置背景音乐（BGM）
- **WHEN** 用户长按保存按钮（500ms）
- **THEN** 系统创建 ZIP 文件并触发下载
- **AND** ZIP 文件包含：
  - `pattern.json` - 节奏型完整数据
  - BGM 配置（fileId, offsetMs, volumePct, meta）
  - BGM 音频文件（Base64 编码）
- **AND** 文件名为 `{patternName}.zip`

#### Scenario: 导出不含 BGM 的节奏型

- **GIVEN** 已加载一个 Pattern
- **AND** 该 Pattern 未配置背景音乐
- **WHEN** 用户长按保存按钮（500ms）
- **THEN** 系统创建 ZIP 文件并触发下载
- **AND** ZIP 文件仅包含节奏型数据
- **AND** 不包含 BGM 配置和音频文件

### Requirement: Pattern 从 ZIP 导入

系统 SHALL 允许用户从 ZIP 文件导入节奏型，自动恢复关联的 BGM。

#### Scenario: 导入包含 BGM 的节奏型

- **GIVEN** 用户选择一个有效的 ZIP 文件
- **AND** ZIP 包含节奏型数据和 BGM
- **WHEN** 用户长按添加按钮（500ms）并选择文件
- **THEN** 系统解析 ZIP 文件
- **AND** 验证数据结构完整性
- **AND** 恢复 BGM 文件到 IndexedDB
- **AND** 创建新的 Pattern（分配新的 ID 和名称）
- **AND** 将 BGM 配置关联到新 Pattern
- **AND** 自动切换到新导入的 Pattern

#### Scenario: 导入不含 BGM 的节奏型

- **GIVEN** 用户选择一个有效的 ZIP 文件
- **AND** ZIP 仅包含节奏型数据
- **WHEN** 用户长按添加按钮（500ms）并选择文件
- **THEN** 系统解析 ZIP 文件
- **AND** 创建新的 Pattern（分配新的 ID 和名称）
- **AND** 自动切换到新导入的 Pattern
- **AND** 不恢复任何 BGM 配置

#### Scenario: 导入无效文件

- **GIVEN** 用户选择文件
- **WHEN** 文件不是有效的 ZIP 格式
- **THEN** 显示错误提示："Please select a valid pattern file (.zip format)"
- **AND** 不执行任何导入操作

#### Scenario: 导入损坏数据

- **GIVEN** 用户选择一个有效的 ZIP 文件
- **WHEN** ZIP 内的数据结构无效或损坏
- **THEN** 显示错误提示："Failed to import pattern file..."
- **AND** 记录错误日志
- **AND** 不修改现有数据

## 边界条件

| 属性             | 最小值 | 最大值 | 默认值     |
| ---------------- | ------ | ------ | ---------- |
| BPM              | 40（UI）/ 20（校验） | 200（UI）/ 300（校验） | 120        |
| 小节数           | 1      | 未限制（当前实现未强制上限） | 1          |
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
