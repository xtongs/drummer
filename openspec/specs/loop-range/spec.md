# Loop Range 规范

## 概述

Loop Range（循环范围）功能允许用户设置播放的循环区间，支持单 Pattern 内循环和跨 Pattern 循环。

## 需求

### Requirement: 单 Pattern 循环

系统 SHALL 支持在单个 Pattern 内设置循环范围。

#### Scenario: 设置循环起点

- **GIVEN** 显示循环范围选择器
- **WHEN** 用户调整起始小节
- **THEN** 循环起点更新为指定小节
- **AND** 确保起点 <= 终点

#### Scenario: 设置循环终点

- **GIVEN** 显示循环范围选择器
- **WHEN** 用户调整结束小节
- **THEN** 循环终点更新为指定小节
- **AND** 确保终点 >= 起点

#### Scenario: 长按快速调整

- **GIVEN** 循环范围控件可见
- **WHEN** 用户长按 +/- 按钮
- **THEN** 连续递增/递减小节数
- **AND** 到达边界时停止

### Requirement: 跨 Pattern 循环

系统 SHALL 支持跨多个 Pattern 的循环播放。

#### Scenario: 选择起始 Pattern

- **GIVEN** 有多个已保存的 Pattern
- **WHEN** 用户在起始位置选择不同 Pattern
- **THEN** 循环起点更新为该 Pattern 的指定小节
- **AND** 验证起点位置早于或等于终点

#### Scenario: 选择结束 Pattern

- **GIVEN** 有多个已保存的 Pattern
- **WHEN** 用户在结束位置选择不同 Pattern
- **THEN** 循环终点更新为该 Pattern 的指定小节
- **AND** 验证终点位置晚于或等于起点

#### Scenario: Pattern 顺序

- **GIVEN** 跨 Pattern 循环已设置
- **WHEN** 播放时
- **THEN** 按 Pattern 名称字母顺序播放
- **AND** 草稿（空名称）排在最前

### Requirement: 自动范围调整

系统 SHALL 在小节数变化时自动调整循环范围。

#### Scenario: 增加小节

- **GIVEN** 循环范围（CrossPatternLoop）的结束位置在当前 Pattern 且为单 Pattern 循环（startPatternName == endPatternName）
- **WHEN** 用户增加小节数
- **THEN** 循环终点 SHOULD 自动扩展到新的最后小节
- **AND** 若为跨 Pattern 循环（startPatternName != endPatternName），系统 SHALL NOT 自动扩展终点（保持用户设置）

#### Scenario: 减少小节

- **GIVEN** 循环终点在最后一个小节
- **WHEN** 用户减少小节数
- **THEN** 循环终点自动调整到新的最后小节
- **AND** 如果起点超出范围，同时调整起点

#### Scenario: 切换 Pattern

- **GIVEN** 循环范围已设置
- **WHEN** 用户切换到不同的 Pattern
- **THEN** 如果循环范围不包含当前 Pattern
- **AND** 重置为当前 Pattern 的完整范围

### Requirement: 草稿模式循环

系统 SHALL 支持草稿模式下的循环设置。

#### Scenario: 草稿作为起点/终点

- **GIVEN** 处于草稿模式
- **WHEN** 设置循环范围
- **THEN** 草稿用空字符串 "" 作为 patternName
- **AND** 草稿在选项列表中显示为 "○"

## 数据结构

```typescript
interface CrossPatternLoop {
  startPatternName: string;  // 起始 Pattern 名称（"" 表示草稿）
  startBar: number;          // 起始小节（0-indexed）
  endPatternName: string;    // 结束 Pattern 名称
  endBar: number;            // 结束小节（0-indexed）
}
```

## 位置比较规则

比较两个位置的先后顺序：

1. 如果 Pattern 相同，比较小节数
2. 如果 Pattern 不同：
   - 草稿（""）排在最前
   - 其他按名称字母顺序排序

## 边界条件

| 条件 | 处理方式 |
|------|----------|
| 起点 > 终点 | 调整终点等于起点 |
| 小节超出范围 | 调整到最大有效值 |
| Pattern 被删除 | 重置为当前 Pattern 范围 |
| 跨 Pattern + 增加小节 | 不自动扩展终点（保持用户设置） |

## UI 布局

```
┌─────────────────────────────────────────────┐
│ [Pattern ▼] [-] [1] [+] - [Pattern ▼] [-] [4] [+] │
└─────────────────────────────────────────────┘
     起始 Pattern  起始小节    结束 Pattern  结束小节
```

## 持久化

- 循环范围保存到 localStorage
- key: `drummer-cross-pattern-loop`
- 应用启动时自动恢复
