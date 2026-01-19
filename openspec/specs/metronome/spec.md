# Metronome 规范

## 概述

Metronome（节拍器）是 Drummer 的核心播放引擎，负责按照指定 BPM 和拍号精确调度音频播放。

## 需求

### Requirement: 基础播放控制

系统 SHALL 提供播放、暂停、停止控制。

#### Scenario: 开始播放

- **GIVEN** 已加载一个 Pattern
- **WHEN** 用户点击播放按钮
- **THEN** 从当前位置（或起始位置）开始播放
- **AND** 按 BPM 精确调度每个节拍
- **AND** 播放指示器同步移动

#### Scenario: 暂停播放

- **GIVEN** Pattern 正在播放
- **WHEN** 用户点击暂停按钮
- **THEN** 立即停止音频输出
- **AND** 保持当前播放位置
- **AND** 再次播放时从暂停位置继续

#### Scenario: 停止播放

- **GIVEN** Pattern 正在播放或已暂停
- **WHEN** 用户点击停止按钮
- **THEN** 停止音频输出
- **AND** 播放位置重置到起始位置

### Requirement: 循环播放

系统 SHALL 支持循环播放模式。

#### Scenario: 全曲循环

- **GIVEN** 未设置循环范围
- **WHEN** 播放到 Pattern 末尾
- **THEN** 自动从头开始播放
- **AND** 无缝衔接，无明显中断

#### Scenario: 区间循环

- **GIVEN** 用户设置了循环范围 (startBeat, endBeat)
- **WHEN** 播放到 endBeat
- **THEN** 自动跳回 startBeat 继续播放
- **AND** 循环范围可视化显示

### Requirement: 节拍器音效

系统 SHALL 提供可选的节拍器点击声。

#### Scenario: 启用节拍器

- **GIVEN** 节拍器开关为开启状态
- **WHEN** 每个节拍到达时
- **THEN** 播放节拍器音效
- **AND** 重拍（第一拍）使用不同音效/音量

#### Scenario: 禁用节拍器

- **GIVEN** 节拍器开关为关闭状态
- **WHEN** 播放时
- **THEN** 只播放鼓点音效，无节拍器音效

### Requirement: BPM 变速快捷切换（rate next/prev）

系统 SHALL 支持通过点击 BPM 数字区域快速切换变速倍率。

#### Scenario: 左侧点击切换到下一个倍率（next）

- **GIVEN** 当前存在变速倍率集合 `rates`，并以 `rateIndex` 表示累积倍率状态
- **WHEN** 用户点击 BPM 数字区域的左半部分
- **THEN** 系统将 `rateIndex` 视为向后推进一个 step（next）
- **AND** BPM 显示值 SHALL 随累积倍率变化而更新

#### Scenario: 右侧点击切换到上一个倍率（prev）

- **GIVEN** 当前存在变速倍率集合 `rates`，并以 `rateIndex` 表示累积倍率状态
- **WHEN** 用户点击 BPM 数字区域的右半部分
- **THEN** 系统将 `rateIndex` 视为向前回退一个 step（prev，支持 wrap）
- **AND** BPM 显示值 SHALL 随累积倍率变化而更新

### Requirement: 预备拍

系统 SHALL 支持播放前的预备拍。

#### Scenario: 带预备拍播放

- **GIVEN** 预备拍功能已启用
- **WHEN** 用户点击播放
- **THEN** 先播放一小节节拍器预备拍
- **AND** 预备拍结束后开始播放 Pattern

### Requirement: 时间精度

系统 SHALL 保证高精度的时间调度。

#### Scenario: 精确播放

- **GIVEN** 任意 BPM 设置（30-300）
- **WHEN** 播放时
- **THEN** 每个音符的触发时间误差 < 10ms
- **AND** 使用 Web Audio API 的精确调度而非 setTimeout

## 技术约束

### 音频上下文
- 使用 AudioContext 进行音频调度
- 提前调度音符（lookahead）以保证精度
- 处理浏览器音频策略（用户交互后启动）

### 性能
- 播放时 CPU 占用应保持低水平
- 避免在音频线程上执行耗时操作
- 使用 requestAnimationFrame 更新 UI

## 状态定义

```typescript
type PlaybackState = 'stopped' | 'playing' | 'paused';

interface MetronomeState {
  state: PlaybackState;
  currentBeat: number;
  isMetronomeEnabled: boolean;
  isCountInEnabled: boolean;
}
```
