# Storage 规范

## 概述

Storage 模块负责管理 Drummer 应用的本地数据持久化，使用 localStorage 存储 Pattern 数据和应用设置。

## 需求

### Requirement: Pattern 数据存储

系统 SHALL 支持 Pattern 数据的完整 CRUD 操作。

#### Scenario: 保存新 Pattern

- **GIVEN** 创建了新的 Pattern
- **WHEN** 调用 savePattern
- **THEN** Pattern 添加到 patterns 数组
- **AND** 数据持久化到 localStorage

#### Scenario: 更新已有 Pattern

- **GIVEN** Pattern 已存在（ID 匹配）
- **WHEN** 调用 savePattern
- **THEN** 覆盖原有 Pattern 数据
- **AND** 保持数组中的位置

#### Scenario: 删除 Pattern

- **GIVEN** Pattern 存在于存储中
- **WHEN** 调用 deletePattern
- **THEN** 从 patterns 数组移除
- **AND** 如果是当前选中的 Pattern，清除 currentPatternId

#### Scenario: 加载所有 Pattern

- **GIVEN** localStorage 中有存储数据
- **WHEN** 调用 loadPatterns
- **THEN** 返回所有已保存的 Pattern 数组
- **AND** 自动执行数据迁移（如需要）

### Requirement: 数据迁移

系统 SHALL 支持从旧版数据格式迁移。

#### Scenario: Boolean Grid 迁移

- **GIVEN** 旧版 Pattern 使用 boolean[][] grid
- **WHEN** 加载数据
- **THEN** 自动转换为 CellState[][] grid
- **AND** true → CELL_NORMAL (1)
- **AND** false → CELL_OFF (0)

#### Scenario: 无效 CellState 处理

- **GIVEN** grid 中存在无效的数值
- **WHEN** 迁移数据
- **THEN** 无效值降级为 CELL_OFF (0)

### Requirement: 应用设置存储

系统 SHALL 存储应用级别的设置。

#### Scenario: 保存节拍器 BPM

- **GIVEN** 用户调整了节拍器 BPM
- **WHEN** 调用 saveMetronomeBPM
- **THEN** BPM 值保存到独立 key
- **AND** 当前实现不在保存时做范围校验（范围校验在加载/使用时进行）

#### Scenario: 加载节拍器 BPM

- **GIVEN** 应用启动
- **WHEN** 调用 loadMetronomeBPM
- **THEN** 返回已保存的 BPM 值
- **OR** 返回 null（如未设置或无效；有效范围为 20-300）

#### Scenario: 保存跨 Pattern 循环

- **GIVEN** 用户设置了循环范围
- **WHEN** 调用 saveCrossPatternLoop
- **THEN** 循环配置保存到 localStorage
- **AND** undefined 时删除该 key

#### Scenario: 加载跨 Pattern 循环

- **GIVEN** 应用启动
- **WHEN** 调用 loadCrossPatternLoop
- **THEN** 返回已保存的循环配置
- **AND** 验证数据格式有效性

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

### Requirement: Pattern 导入/导出

系统 SHALL 支持 Pattern 的 JSON 导入导出。

#### Scenario: 序列化 Pattern

- **GIVEN** 有效的 Pattern 对象
- **WHEN** 调用 serializePatternToJSON
- **THEN** 返回 JSON 字符串

#### Scenario: 解析 Pattern JSON

- **GIVEN** JSON 字符串
- **WHEN** 调用 parsePatternFromJSON
- **THEN** 验证 JSON 格式
- **AND** 验证所有必需字段
- **AND** 验证 CellState 值有效
- **AND** 成功返回 Pattern 对象，失败返回 null

#### Scenario: 验证 Pattern 数据

- **GIVEN** 未知来源的数据对象
- **WHEN** 调用 validatePattern
- **THEN** 验证以下字段：
  - id: 非空字符串
  - name: 非空字符串
  - bpm: 数字，范围 20-300
  - timeSignature: [number, number]
  - bars: 数字，范围 1-100
  - grid: CellState[][]
  - drums: string[]
  - createdAt/updatedAt: 数字

### Requirement: Pattern 命名

系统 SHALL 自动生成唯一的 Pattern 名称。

#### Scenario: 获取下一个名称

- **GIVEN** 已有若干 Pattern
- **WHEN** 调用 getNextPatternName
- **THEN** 返回下一个可用的单字母 (A-Z)
- **AND** 如果 A-Z 都已使用，返回第一个未使用的字母

## 存储 Key 定义

| Key | 数据类型 | 描述 |
|-----|----------|------|
| `drummer-app-data` | StorageData | 主数据（patterns, currentPatternId） |
| `drummer-metronome-bpm` | string | 节拍器 BPM |
| `drummer-cross-pattern-loop` | CrossPatternLoop | 跨 Pattern 循环设置 |
| `drummer-settings-language` | string | Settings 弹窗语言偏好（`auto` 或语言代码） |

## 数据结构

```typescript
interface StorageData {
  patterns: Pattern[];
  currentPatternId?: string;
}
```

## 有效 CellState 值

```typescript
const VALID_CELL_STATES = new Set<CellState>([
  0,  // CELL_OFF
  1,  // CELL_NORMAL
  2,  // CELL_GHOST
  3,  // CELL_GRACE
  4,  // CELL_DOUBLE_32
  5,  // CELL_FIRST_32
  6,  // CELL_SECOND_32
]);
```

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| localStorage 不可用 | 返回空数据，记录错误日志 |
| JSON 解析失败 | 返回空数据，记录错误日志 |
| 数据格式无效 | 跳过无效项，继续处理其他数据 |
| 存储空间已满 | 抛出异常，由调用方处理 |

## 安全考虑

- 所有数据仅存储在本地
- 不传输敏感信息到外部服务
- 导入时严格验证数据格式
