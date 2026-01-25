# Background Music Feature Spec

## 概述

提供背景音乐（BGM）播放功能，允许用户在练习节奏时同时播放背景音乐，支持自定义偏移量以实现精确同步。

## 功能需求

### 1. BGM 文件管理

- 支持上传音频文件作为 BGM
- 支持 BGM 文件的存储和加载
- 支持 BGM 文件的删除

### 2. BGM 播放控制

- 支持 BGM 的播放和停止
- 支持音量调节（0-100%）
- 支持自定义偏移量（offset）
  - 正值：BGM 滞后于节奏
  - 负值：BGM 提前于节奏

### 3. 同步逻辑（关键）

**核心原则：BGM offset 是相对于"原始节奏"的，不受 `playbackRate` 影响！**

#### 问题场景

当用户设置 playbackRate < 1（如 0.9）且 range 不是从 bar 0 开始时（如 A2-A3），BGM 可能会不同步。

#### 错误做法

使用考虑 `playbackRate` 的时间计算 BGM 位置：

```typescript
// ❌ 错误
const effectiveBpm = barBpm * playbackRate;
const beatDuration = (60 / effectiveBpm) * (4 / pattern.timeSignature[1]);
```

结果：
- rate=1.0: BGM 同步 ✓
- rate=0.9: BGM 偏离 ✗

#### 正确做法

使用**不考虑 playbackRate 的原始 BPM** 计算 BGM 位置：

```typescript
// ✅ 正确
// 1. 计算 range start 的原始节奏时间（使用原始 BPM）
let timeAtRangeStartOriginal = 0;
for (let barIndex = 0; barIndex < rangeStartBar; barIndex++) {
  const barBpm = pattern.barBpmOverrides?.[barIndex] ?? pattern.bpm;
  const originalBeatDuration = (60 / barBpm) * (4 / pattern.timeSignature[1]);
  const originalBarDuration = originalBeatDuration * beatsPerBar;
  timeAtRangeStartOriginal += originalBarDuration;
}

// 2. 将 patternTime（已考虑 playbackRate）转换为原始节奏时间
const patternTimeOriginal = patternTime / playbackRate;

// 3. 使用原始节奏时间计算 BGM 位置
const absolutePatternTime = patternTimeOriginal + timeAtRangeStartOriginal;
const adjustedPatternTime = absolutePatternTime - offsetSeconds;
const desiredBgmPosition = adjustedPatternTime / effectiveRate;
```

结果：
- rate=1.0: BGM 同步 ✓
- rate=0.9: BGM 同步 ✓

#### 关键点

1. **offset 是用户设置的，相对于原始节奏的固定偏移**
2. **计算 BGM 位置时，必须使用原始节奏时间（不考虑 playbackRate）**
3. **BGM player 的 playbackRate 会自动处理播放速度的变化**
4. **这样无论 rate 如何变化，BGM 都能保持与节奏的正确同步**

### 4. 实现细节

#### Hook: `useBackgroundMusicPlayer`

**输入参数：**
- `isPlaying`: 是否正在播放
- `isFullPracticeMode`: 是否全屏练习模式
- `playbackRate`: 播放速率
- `bgmConfig`: BGM 配置（fileId, offsetMs, volumePct）
- `currentSubdivision`: 当前播放位置
- `pattern`: 当前 pattern
- `patternStartToken`: pattern 开始标记
- `rangeStartBar`: 当前播放范围起始小节（新增，用于正确计算时间偏移）

**返回状态：**
- `isLoading`: 是否正在加载
- `isLoaded`: 是否已加载
- `error`: 错误信息

#### BGM 播放器配置

- 使用 Tone.js 的 GrainPlayer
- 支持循环播放（loop = false，手动控制）
- 播放速率跟随 `playbackRate`
- 优化参数：
  - `grainSize = 200ms`
  - `overlap = 20ms`

## 测试

参见 `src/hooks/useBackgroundMusicPlayer.test.ts`

关键测试用例：
- 原始节奏时间计算（不使用 playbackRate）
- patternTime 转换为原始节奏时间
- BGM 位置计算（不同 rate 下的一致性）
- 错误做法验证

## 版本历史

- **v1.1.0** (2025-01-26): 修复 BGM 在 rate < 1 且 range 不是从 bar 0 开始时的同步问题
