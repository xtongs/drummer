# Audio Engine 规范

## 概述

Audio Engine 负责管理所有音频资源的加载、缓存和播放，是 Drummer 的底层音频基础设施。

## 需求

### Requirement: 音频采样加载

系统 SHALL 支持加载和管理多种鼓点音频采样。

#### Scenario: 初始化加载

- **GIVEN** 应用启动
- **WHEN** 音频引擎初始化
- **THEN** 预加载所有必要的音频采样
- **AND** 显示加载进度（可选）
- **AND** 缓存到 IndexedDB 避免重复下载

#### Scenario: 按需加载

- **GIVEN** 某个采样未在缓存中
- **WHEN** 需要播放该采样
- **THEN** 从网络加载
- **AND** 加载完成前使用合成音色替代

### Requirement: 音频播放

系统 SHALL 支持低延迟、高精度的音频播放。

#### Scenario: 播放单个采样

- **GIVEN** 采样已加载
- **WHEN** 触发播放
- **THEN** 立即（<50ms 延迟）播放音频
- **AND** 支持同时播放多个采样（polyphony）

#### Scenario: 调度播放

- **GIVEN** 采样已加载
- **WHEN** 调度未来某时刻播放
- **THEN** 在指定的 AudioContext 时间精确播放
- **AND** 误差 < 10ms

### Requirement: 音量控制

系统 SHALL 支持细粒度的音量控制。

#### Scenario: 全局音量

- **GIVEN** 应用运行中
- **WHEN** 用户调整主音量
- **THEN** 所有音频输出按比例调整

#### Scenario: 力度控制

- **GIVEN** 不同 CellState（正常/鬼音）
- **WHEN** 播放音符
- **THEN** 按力度等级调整音量：
  - CELL_NORMAL: 100%
  - CELL_GHOST: 40%

### Requirement: 音频上下文管理

系统 SHALL 正确管理 Web Audio API 的生命周期。

#### Scenario: 延迟初始化

- **GIVEN** 浏览器音频策略限制
- **WHEN** 用户首次交互
- **THEN** 初始化或恢复 AudioContext
- **AND** 后续播放正常工作

#### Scenario: 页面可见性变化

- **GIVEN** 用户切换到其他标签页
- **WHEN** 页面变为不可见
- **THEN** 可选择暂停播放以节省资源
- **AND** 页面再次可见时恢复

## 支持的音频格式

| 格式 | 用途 | 优先级 |
|------|------|--------|
| MP3 | 通用兼容 | 主要 |
| WAV | 无损音质 | 备选 |
| OGG | 高压缩比 | 备选 |

## 鼓点采样列表

| 标识符 | 文件 | 描述 |
|--------|------|------|
| kick | kick.mp3 | 底鼓 |
| snare | snare.mp3 | 军鼓 |
| hi-hat-closed | hi-hat-closed.mp3 | 闭合镲 |
| hi-hat-open | hi-hat-open.mp3 | 开放镲 |
| crash | crash.mp3 | 碎音镲 |
| crash2 | crash2.mp3 | 碎音镲 2 |
| ride | ride.mp3 | 叮叮镲 |
| tom1 | tom1.mp3 | 高音桶鼓 |
| tom2 | tom2.mp3 | 中音桶鼓 |
| tom3 | tom3.mp3 | 低音桶鼓 |
| metronome | metronome.mp3 | 节拍器 |

## 技术约束

### AudioContext 配置
```typescript
const audioContext = new AudioContext({
  sampleRate: 44100,
  latencyHint: 'interactive'
});
```

### 缓存策略
- 使用 IndexedDB 持久化音频 buffer
- 缓存键: 文件 URL + 版本哈希
- 缓存有效期: 永久（直到应用更新）
