# Multi-Pattern Player 规范

## 概述

Multi-Pattern Player 是 Drummer 的高级播放引擎，支持跨多个 Pattern 的顺序播放和循环，是对基础 Metronome 的扩展。

## 需求

### Requirement: 播放序列构建

系统 SHALL 根据循环范围构建播放序列。

#### Scenario: 单 Pattern 序列

- **GIVEN** 循环范围在单个 Pattern 内
- **WHEN** 构建播放序列
- **THEN** 序列包含一个 PlayStep
- **AND** 包含该 Pattern 的指定小节范围

#### Scenario: 多 Pattern 序列

- **GIVEN** 循环范围跨越多个 Pattern
- **WHEN** 构建播放序列
- **THEN** 按 Pattern 名称字母顺序构建序列
- **AND** 每个 Pattern 创建一个 PlayStep
- **AND** 首尾 Pattern 使用指定的小节范围，中间 Pattern 使用完整范围

#### Scenario: 实时更新序列

- **GIVEN** 正在播放中
- **WHEN** 用户修改当前 Pattern 内容
- **THEN** 序列使用最新的 Pattern 数据
- **AND** 不中断播放

### Requirement: 跨 Pattern 播放

系统 SHALL 支持无缝跨 Pattern 播放。

#### Scenario: Pattern 切换

- **GIVEN** 当前 PlayStep 播放到结束小节
- **WHEN** 进入下一个 PlayStep
- **THEN** 无缝切换到下一个 Pattern
- **AND** 使用下一个 Pattern 的 BPM
- **AND** 触发 onPatternChange 回调

#### Scenario: 循环回放

- **GIVEN** 播放到序列最后一个 PlayStep 的最后小节
- **WHEN** 需要循环
- **THEN** 无缝跳回第一个 PlayStep 的起始位置
- **AND** 继续播放

### Requirement: 播放速率控制

系统 SHALL 支持可变播放速率。

#### Scenario: 应用播放速率

- **GIVEN** playbackRate 设置（如 0.9）
- **WHEN** 计算 subdivision 时长
- **THEN** effectiveBPM = pattern.bpm * playbackRate
- **AND** 速率 < 1 时减慢，> 1 时加快

### Requirement: 位置跳转

系统 SHALL 支持跳转到指定播放位置。

#### Scenario: seekTo 跳转

- **GIVEN** 提供目标 subdivision 索引
- **WHEN** 调用 seekTo 函数
- **THEN** 找到包含该 subdivision 的 PlayStep
- **AND** 更新当前播放位置
- **AND** 如正在播放，从新位置继续

#### Scenario: 无效位置处理

- **GIVEN** 目标 subdivision 不在任何 PlayStep 范围内
- **WHEN** 调用 seekTo 函数
- **THEN** 跳转到第一个 PlayStep 的起始位置

### Requirement: 状态回调

系统 SHALL 提供播放状态回调。

#### Scenario: subdivision 变化回调

- **GIVEN** 注册了 onSubdivisionChange 回调
- **WHEN** 每个 subdivision 播放时
- **THEN** 调用回调并传入当前 subdivision 索引
- **AND** 使用 requestAnimationFrame 优化性能

#### Scenario: Pattern 变化回调

- **GIVEN** 注册了 onPatternChange 回调
- **WHEN** 切换到不同 Pattern
- **THEN** 调用回调并传入新的 patternName

### Requirement: 屏幕唤醒锁

系统 SHALL 在播放时保持屏幕唤醒。

#### Scenario: 播放开始

- **GIVEN** 支持 WakeLock API
- **WHEN** 开始播放
- **THEN** 请求屏幕唤醒锁
- **AND** 防止设备进入休眠

#### Scenario: 播放停止

- **GIVEN** 持有唤醒锁
- **WHEN** 停止播放
- **THEN** 释放唤醒锁
- **AND** 允许设备正常休眠

## 数据结构

```typescript
interface PlayStep {
  patternName: string;  // Pattern 名称（"" 表示草稿）
  pattern: Pattern;     // Pattern 数据
  startBar: number;     // 起始小节
  endBar: number;       // 结束小节
}

interface UseMultiPatternPlayerOptions {
  currentPattern: Pattern;
  savedPatterns: Pattern[];
  crossPatternLoop: CrossPatternLoop | undefined;
  isPlaying: boolean;
  isDraftMode: boolean;
  playbackRate?: number;  // 默认 1
  onSubdivisionChange?: (subdivision: number) => void;
  onPatternChange?: (patternName: string) => void;
}
```

## 技术实现

### 调度器参数

| 参数 | 值 | 描述 |
|------|-----|------|
| scheduleAheadTime | 0.2s | 提前调度时间 |
| lookahead | 50ms | 调度器轮询间隔 |

### 动画更新节流

- 使用 `ANIMATION_THROTTLE = 16ms` 节流动画更新
- 避免过于频繁的 React 状态更新

### 播放开始逻辑

1. 检查当前位置是否有效
2. 如果位置无效或不在当前 Pattern，重置到：
   - 当前选中 Pattern 在序列中的位置（如果在范围内）
   - 或序列的第一个 PlayStep
3. 恢复 AudioContext（如果 suspended）
4. 请求 WakeLock
5. 启动调度器
