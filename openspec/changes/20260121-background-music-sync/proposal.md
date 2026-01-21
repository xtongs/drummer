# 提案:背景音乐同步播放功能

## 元数据

- **提案ID**: `20260121-background-music-sync`
- **变更级别**: 🟡 常规功能
- **创建日期**: 2026-01-21
- **状态**: 待审核
- **负责人**: 待定

---

## 1. 功能背景

### 1.1 当前痛点

鼓手在练习时,经常需要:
1. 跟随原曲练习特定节奏型
2. 在熟悉节奏后,需要配合实际歌曲演奏
3. 希望在保持节奏型准确的同时,感受歌曲的整体氛围

目前工具已经支持:
- ✅ 编辑和播放自定义节奏型
- ✅ 变速播放(0.5x - 1.0x)进行渐进式练习
- ✅ 循环播放特定小节

**缺失能力**: 无法在播放节奏型的同时播放背景音乐,导致练习脱离实际音乐情境。

### 1.2 用户场景

**典型用户**: 鼓手学习者、乐队鼓手、节奏练习者

**核心使用场景**:

1. **歌曲跟练**
   - 用户想要学习某首歌的鼓点节奏
   - 先以慢速播放(0.6x)熟悉节奏型
   - 逐渐加速到原速(1.0x)
   - 在整个过程中需要听到背景音乐以感受歌曲情感

2. **演出准备**
   - 乐队鼓手准备演出曲目
   - 需要反复练习特定段落
   - 希望听到完整歌曲但突出鼓点部分

3. **创意练习**
   - 尝试不同的节奏型配合同一首歌
   - 探索不同的鼓点编排可能性

---

## 2. 功能目标

### 2.1 核心目标

提供一个**背景音乐同步播放系统**,使用户能够:

1. 🎵 **上传/选择背景音乐** - 支持常见音频格式(MP3, WAV, OGG)
2. 🔄 **完美同步** - 背景音乐与节奏型精确对齐,无延迟感
3. 🔊 **独立音量控制** - 背景音乐音量可调节(默认较低,不影响鼓点清晰度)
4. ⚡ **同步变速** - 背景音乐随节奏型同步变速(0.5x - 1.0x)
5. 📍 **循环播放** - 支持设置背景音乐的起始/结束位置

### 2.2 非目标

- ❌ 不支持音频剪辑功能(用户应使用专业音频工具预处理)
- ❌ 不支持实时音效处理(混响、EQ等)
- ❌ 不支持多轨音频(仅单轨背景音乐)

---

## 3. 功能需求

### 3.1 必须实现 (MUST)

#### 3.1.1 音频文件管理

**需求ID**: REQ-AUDIO-001

用户应该能够:
- 导入本地音频文件(支持格式: MP3, WAV, OGG, M4A)
- 为每个 Pattern 关联最多 1 个背景音乐文件
- 删除已关联的背景音乐

**技术约束**:
- 音频文件存储在 IndexedDB(不增加 LocalStorage 负担)
- 单个音频文件大小限制: 20MB
- 显示错误提示(不显示上传进度,简化交互)

#### 3.1.2 同步播放控制

**需求ID**: REQ-PLAY-002

播放器应该:
- 同时播放节奏型和背景音乐
- **支持播放偏移量设置**: 背景音乐可以提前或延后播放,以对齐节奏型
  - 偏移量精度: **10ms** (0.01秒)
  - 偏移量范围: -10s 到 +10s
  - 默认值: 0s(同时开始)
  - **快速调整**: 支持按钮快速调整(±10ms, ±100ms, ±1s)
- 支持暂停/继续(两路音频同步暂停/继续)
- 支持停止(两路音频都停止并回到初始位置)

**同步精度**:
- 两路音频延迟差 < 50ms(人耳无法察觉)
- 优先使用 Web Audio API 实现精确控制
- 降级方案:HTML5 Audio(但需要验证同步精度)

**使用场景说明**:
- 鼓谱节奏型的第一个小节通常不是歌曲的开头
- 例如:歌曲 BPM=120,前奏有 4 拍 = 2秒,设置偏移量 -2.0s
- 例如:鼓点需要提前 1 拍进入,设置偏移量 +0.5s(120 BPM 时)

#### 3.1.3 音量控制

**需求ID**: REQ-VOL-003

用户应该能够:
- **仅调节背景音乐音量** (鼓点音量固定 100%)
- **按钮切换模式**(不使用滑块):
  - 🔇 **静音**: 音乐 0%
  - 🔉 **低音量**: 音乐 20%
  - 🔊 **中音量**: 音乐 50%
  - 📢 **高音量**: 音乐 80%
- 默认模式:低音量(20%)

**设计理由**:
- 简化交互,减少控件数量
- 鼓点音量不需要调节,始终保持最佳清晰度
- 按钮切换比滑块更适合移动端(375px 宽度)

#### 3.1.4 变速播放

**需求ID**: REQ-SPEED-004

当用户调整播放速率时:
- 背景音乐应该与节奏型**同步变速**
- **保持音高不变**
- 支持 0.5x, 0.6x, 0.7x, 0.8x, 0.9x, 1.0x 六档速率

**技术方案**(基于深入调研):
- **第一原则**: 不破坏现有鼓声播放功能
- **鼓声采样**: 保持 Web Audio API,不做任何修改
- **节拍器**: 保持 Web Audio API,不做任何修改
- **背景音乐**: 优先使用 Web Audio API 实现精确控制
  - 使用 `AudioBufferSourceNode` + 解码后的音频数据
  - 变速使用 `playbackRate.value`
  - **变速保调方案**: 使用 Tone.js 或 Phase Vocoder 算法
- **降级方案**: 如果 Web Audio API 实现复杂度太高,使用 HTML5 Audio
  - HTML5 Audio 的 `preservesPitch=true` 可以保持音高
  - 但需要验证同步精度是否满足要求(< 50ms)

**技术约束**:
- 不能修改现有的 `audioEngine.ts` 中的鼓声播放逻辑
- 变速时不应产生音频毛刺或卡顿
- 浏览器兼容性: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### 3.2 循环区域同步 (MUST)

**需求ID**: REQ-LOOP-005

背景音乐必须同步应用 Pattern 的现有 `loopRange` 设置:
- 当用户设置 Pattern 的循环范围时,背景音乐同步循环
- 不需要额外的循环控制UI(复用现有的 loopRange 机制)
- 循环时,背景音乐从偏移量位置重新开始

**技术实现**:
- 监听 Pattern 的 `loopRange` 变化
- 当循环触发时,重置背景音乐的 `currentTime` 到初始偏移位置
- 确保循环点无音频断裂(利用 HTML5 Audio 的快速 seek)

---

## 4. 用户体验设计

### 4.1 用户流程

```
1. 用户打开 Pattern 编辑器
   ↓
2. 点击"添加背景音乐"按钮
   ↓
3. 选择本地音频文件(MP3/WAV等)
   ↓
4. 等待上传完成(显示进度条)
   ↓
5. 点击"播放"按钮
   ↓
6. 听到鼓点和背景音乐同步播放
   ↓
7. 调节音量和速度滑块
   ↓
8. 开始练习🥁
```

### 4.2 UI 设计要点

**设计原则**:
- ✅ **简洁**: 单行控件,减少空间占用
- ✅ **移动优先**: 适配 375px 宽度(iPhone SE)
- ✅ **图标化**: 使用图标代替文字,减少视觉负担
- ✅ **不破坏**: 播放按钮区域保持现状,只做单行扩展

**播放控制栏布局** (仅一行,图标化):

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  [📁] [⏱-0.02s]  [▶️ 播放]  [🔉 音量]  [🗑️]              │
│                                                            │
└────────────────────────────────────────────────────────────┘

图例:
[📁]  - 上传/选择音乐文件
[⏱-0.02s] - 偏移量显示和快速调整
[▶️ 播放] - 现有播放按钮(保持不变)
[🔉 音量] - 音乐音量模式切换
[🗑️] - 删除音乐
```

**控件详细说明**:

1. **文件选择按钮** `[📁]`
   - 未上传时:显示文件夹图标
   - 已上传时:显示音符图标 🎵
   - 点击:选择本地音频文件

2. **偏移量控制** `[⏱+0.00s]`
   - 显示当前偏移量(精度 10ms)
   - 点击弹出快速调整面板:
     ```
     ┌─────────────────┐
     │  偏移量调整     │
     ├─────────────────┤
     │ [-1s] [+1s]     │
     │ [-0.1s] [+0.1s] │
     │ [-10ms] [+10ms] │
     │ 当前: -0.02s    │
     └─────────────────┘
     ```
   - 长按显示:输入框手动输入精确值

3. **播放按钮** `[▶️ 播放]`
   - **完全保持现有实现**
   - 播放时显示暂停图标 `[⏸ 暂停]`
   - 不增加任何新功能

4. **音量模式按钮** `[🔉 音量]`
   - 单击循环切换 4 种模式:
     - 🔇 静音 (0%)
     - 🔉 低音量 (20%) - 默认
     - 🔊 中音量 (50%)
     - 📢 高音量 (80%)
   - 图标变化表示当前模式

5. **删除按钮** `[🗑️]`
   - 仅在已上传音乐时显示
   - 悬停/长按确认后删除
   - 未上传时隐藏

**响应式布局**:

```tsx
// 移动端 (≤ 375px)
<div className="flex items-center gap-2 px-4">
  <FileIconButton />
  <OffsetDisplay />
  <div className="flex-1" /> {/* 占位,播放按钮居中 */}
  <PlayButton /> {/* 现有按钮,居中 */}
  <div className="flex-1" /> {/* 占位 */}
  <VolumeModeButton />
  <DeleteIconButton />
</div>

// 桌面端 (> 375px)
// 布局相同,间距略微增加
```

**交互优化**:

1. **偏移量快速调整**:
   - 支持键盘快捷键(桌面端):
     - `[` / `]`: ±10ms
     - `-` / `=`: ±100ms
     - `Shift` + `-` / `=`: ±1s
   - 支持鼠标滚轮调整:
     - 普通滚动: ±10ms
     - 按住 Shift: ±100ms
     - 按住 Ctrl: ±1s

2. **音量模式切换**:
   - 单击切换到下一个模式
   - 右键单击切换到上一个模式
   - 滚轮循环切换模式

3. **文件上传**:
   - 拖拽音频文件到按钮区域
   - 自动识别并上传
   - 错误时显示 toast 提示

---

## 5. 技术方案概述

### 5.1 架构设计

**核心思路**: 在现有 Web Audio API 架构基础上,新增背景音乐播放轨道,不修改任何现有鼓声播放逻辑。

**音频架构**:

```
┌──────────────────────────────────────────────────────────────┐
│                        音频播放系统                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  现有实现 (保持不变)                                          │
│  ┌──────────────────┐                                        │
│  │   Drum Sounds    │ ──→ VolumeNode ──→ Destination         │
│  │   (鼓声采样)      │      (Web Audio API)                   │
│  └──────────────────┘                                        │
│         │                                                     │
│         │ playbackRate=0.5-1.0                                │
│         │ (允许音高变化,鼓手可接受)                            │
│         │                                                     │
│  ┌──────────────────┐                                        │
│  │   Metronome      │ ──→ VolumeNode ──→ Destination         │
│  │   (节拍器)        │      (Web Audio API)                   │
│  └──────────────────┘                                        │
│                                                               │
│  新增实现 (独立轨道)                                          │
│  ┌──────────────────┐                                        │
│  │  Background      │ ──→ VolumeNode ──→ Destination         │
│  │  Music           │      (独立音量控制)                     │
│  │  (背景音乐)       │                                         │
│  └──────────────────┘                                        │
│         │                                                     │
│         │ 方案1: Web Audio API (优先)                         │
│         │   - AudioBufferSourceNode                           │
│         │   - 使用 Tone.js PhaseVocoder 实现变速保调          │
│         │                                                     │
│         │ 方案2: HTML5 Audio (降级)                           │
│         │   - preservesPitch=true                             │
│         │   - 但需验证同步精度                                │
│         │                                                     │
│         ▼                                                     │
│  ┌──────────────────┐                                        │
│  │ AudioContext     │                                        │
│  │ Destination      │                                        │
│  └──────────────────┘                                        │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 关键技术点

#### 5.2.1 背景音乐播放 (新增)

**技术选型**: 优先 Web Audio API,降级 HTML5 Audio

**方案1: Web Audio API + Tone.js (推荐)**

**实现方案**:
```typescript
// 使用 Tone.js 的 Player 实现变速保调
import { Player } from 'tone';

const player = new Player({
  url: audioBuffer,
  loop: false,
  volume: -6,  // 初始音量
  playbackRate: 1.0,
  // Tone.js 内置 pitch shift 功能
});

// 变速且保调
player.playbackRate = 0.7;  // 0.7x 速度
player.detune = 0;          // 音高不变
```

**优点**:
- ✅ 精确的时序控制(与鼓声使用相同的 AudioContext)
- ✅ 变速保调效果优秀
- ✅ 可以精确控制播放进度(支持偏移量)

**缺点**:
- ❌ 引入 150KB 依赖
- ❌ 需要异步加载 Tone.js

**方案2: HTML5 Audio (降级方案)**

**实现方案**:
```typescript
const audio = new Audio(blobURL);
audio.preservesPitch = true;  // 浏览器原生保调
audio.playbackRate = 0.7;
audio.volume = 0.2;
audio.currentTime = offset;   // 设置偏移量
```

**优点**:
- ✅ 零依赖
- ✅ 浏览器原生优化,音质好
- ✅ 实现简单

**缺点**:
- ⚠️ 同步精度需要验证(可能 > 50ms)
- ⚠️ currentTime 设置可能不精确

**决策流程**:
```
1. 先实现方案2 (HTML5 Audio)
   ↓
2. 测试同步精度
   ↓
3. 如果精度 < 50ms,保留方案2
   ↓
4. 如果精度 ≥ 50ms,切换到方案1 (Tone.js)
```

#### 5.2.2 鼓声采样播放 (保持不变)

**技术选型**: 保持 Web Audio API

**第一原则**: **不修改现有鼓声播放逻辑**

**现有实现** ([audioEngine.ts:316](../../src/utils/audioEngine.ts#L316)):
```typescript
function playSample(
  name: string,
  time: number,
  volume: number = 1,
  applyVolumeMultiplier: boolean = true
): boolean {
  const buffer = sampleBuffers.get(name);
  if (!buffer) return false;

  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = currentPlaybackRate;  // 变速
  // 注意:鼓声变速时音高会变化,但这是可接受的
  // 鼓手练习时主要关注节奏清晰度,音高变化影响较小
  source.connect(audioContext.destination);
  source.start(time);
  return true;
}
```

**无需修改理由**:
1. 鼓声是短促音效,音高变化影响较小
2. 变速主要用于慢速练习,音高低沉反而更容易听清
3. 修改现有逻辑风险高,可能引入 bug

#### 5.2.3 节拍器播放 (保持不变)

**技术选型**: 保持 Web Audio API

**现有实现** ([audioEngine.ts:187](../../src/utils/audioEngine.ts#L187)):
```typescript
function playMetronomeSample(time: number, volume: number = 1): boolean {
  const buffer = sampleBuffers.get("metronome");
  if (!buffer) return false;

  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(time);
  return true;
}
```

**无需修改**: 节拍器永远 1.0x 速度,不需要变速保调

#### 5.2.4 同步控制

**播放同步**:
```typescript
async function playAll() {
  // 1. 计算背景音乐的起始时间(考虑偏移量)
  const offset = backgroundMusicState.offset; // 例如 -2.0s(提前播放)
  const startTime = Math.max(0, -offset);     // 实际从 currentTime=2.0s 开始

  // 2. 启动鼓声和节拍器 (现有逻辑,不修改)
  const ctx = getAudioContext();
  const playTime = ctx.currentTime + 0.1;
  playMetronomeTick(playTime);
  playDrumSamples(playTime);

  // 3. 启动背景音乐 (新增)
  if (backgroundMusicAudio) {
    backgroundMusicAudio.currentTime = startTime;
    await backgroundMusicAudio.play();
  }
}
```

**暂停同步**:
```typescript
function pauseAll() {
  // 暂停鼓声和节拍器 (现有逻辑)
  isPlaying = false;

  // 暂停背景音乐 (新增)
  if (backgroundMusicAudio) {
    backgroundMusicAudio.pause();
  }
}
```

**变速同步**:
```typescript
function setPlaybackRate(rate: number) {
  // 鼓声变速 (现有逻辑,不修改)
  currentPlaybackRate = rate;

  // 背景音乐变速 (新增)
  if (backgroundMusicAudio) {
    backgroundMusicAudio.playbackRate = rate;
  }
}
```

#### 5.2.5 循环同步

**监听 Pattern 的 loopRange**:
```typescript
useEffect(() => {
  if (pattern.loopRange && isPlaying) {
    // 当 Pattern 循环时(现有逻辑)
    const loopStartBar = pattern.loopRange.start;

    // 监听循环事件(新增)
    // 当鼓声播放器循环时,重置背景音乐
    const handleLoop = () => {
      if (backgroundMusicAudio) {
        const offset = backgroundMusicState.offset;
        const startTime = Math.max(0, -offset);
        backgroundMusicAudio.currentTime = startTime;
      }
    };

    // 注册监听器
    player.on('loop', handleLoop);

    return () => {
      player.off('loop', handleLoop);
    };
  }
}, [pattern.loopRange, isPlaying]);
```

#### 5.2.6 数据存储

**IndexedDB 存储结构**:
```typescript
// 数据库: DrummerDB (新增对象存储 backgroundMusic)

interface BackgroundMusicRecord {
  id: string;                  // 唯一标识
  patternId: string;           // 关联的 Pattern ID
  filename: string;            // 原始文件名
  blob: Blob;                  // 音频数据
  duration: number;            // 时长(秒)
  uploadedAt: number;          // 上传时间戳
  size: number;                // 文件大小(字节)
}

// 索引: patternId (用于快速查询)
```

### 5.3 数据模型变更

**扩展 `Pattern` 类型** ([src/types/index.ts](../../src/types/index.ts)):

```typescript
interface Pattern {
  id: string;
  name: string;
  bpm: number;
  timeSignature: [number, number];
  bars: number;
  grid: CellState[][];
  drums: DrumType[];
  loopRange?: LoopRange;

  // 新增字段
  backgroundMusic?: {
    id: string;           // 音频文件唯一标识
    filename: string;     // 原始文件名
    duration: number;     // 时长(秒)
    uploadedAt: number;   // 上传时间戳
  };

  // 新增字段:播放设置(简化)
  musicVolume?: number;    // 背景音乐音量模式: 0/0.2/0.5/0.8 (默认 0.2)
  musicOffset?: number;    // 背景音乐偏移量(秒),精度 10ms (默认 0)

  createdAt: number;
  updatedAt: number;
}
```

**新增全局播放状态** ([src/hooks/useBackgroundMusic.ts](../../src/hooks/useBackgroundMusic.ts)):

```typescript
interface BackgroundMusicState {
  // 音频元素
  audioElement: HTMLAudioElement | null;

  // 播放状态
  isPlaying: boolean;
  isLoading: boolean;
  isLoaded: boolean;

  // 音量模式和偏移
  volumeMode: 0 | 0.2 | 0.5 | 0.8;  // 音量模式
  offset: number;                   // 偏移量(秒),精度 10ms

  // 错误处理
  error?: string;

  // 当前关联的 Pattern
  patternId: string | null;
}

interface BackgroundMusicActions {
  load: (patternId: string) => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  setVolumeMode: (mode: 0 | 0.2 | 0.5 | 0.8) => void;
  setOffset: (offset: number) => void;
  setPlaybackRate: (rate: number) => void;
  remove: () => Promise<void>;
}
```

---

## 6. 实现计划

### 6.1 开发阶段

| 阶段 | 内容 | 预估工作量 |
|------|------|-----------|
| **Phase 0** | 技术验证:创建 HTML5 Audio 同步精度测试页面 | 1-2 小时 |
| **Phase 1** | IndexedDB 存储工具:音频文件上传和管理 | 2-3 小时 |
| **Phase 2** | 创建 useBackgroundMusic Hook:背景音乐播放控制(HTML5 Audio 方案) | 3-4 小时 |
| **Phase 3** | 同步控制集成到 useMultiPatternPlayer | 2-3 小时 |
| **Phase 4** | UI 组件开发:文件选择、偏移量、音量模式按钮 | 3-4 小时 |
| **Phase 5** | 循环同步:监听 loopRange 并重置背景音乐 | 1-2 小时 |
| **Phase 6** | 偏移量快速调整:按钮和输入框交互 | 2 小时 |
| **Phase 7** | 测试和优化:同步精度、浏览器兼容性、移动端适配 | 2-3 小时 |
| **Phase 8** (可选) | 如果 HTML5 Audio 精度不足,切换到 Tone.js 方案 | 4-6 小时 |
| **总计** | | **20-29 小时** (不含 Tone.js 方案) |

### 6.2 验收标准

- [ ] **技术验证**: HTML5 Audio 同步精度 < 50ms(Phase 0 验证)
- [ ] **音频上传**: 能够成功上传 MP3/WAV 文件到 IndexedDB
- [ ] **播放同步**: 背景音乐与鼓点同步播放,延迟 < 100ms
- [ ] **偏移量控制**: 能够精确设置到 10ms,支持快速调整
- [ ] **变速保调**: 变速时音乐音高保持不变(0.5x-1.0x)
- [ ] **循环同步**: Pattern 循环时背景音乐同步重置
- [ ] **音量模式**: 4 种音量模式切换流畅,默认 20%
- [ ] **移动端适配**: 375px 宽度下单行布局正常显示
- [ ] **代码质量**: 测试覆盖率 ≥ 80%,类型检查通过,Lint 通过
- [ ] **不破坏现有功能**: 鼓声和节拍器播放完全保持原样

---

## 7. 风险与挑战

### 7.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **HTML5 Audio 同步精度不足** | 高 | Phase 0 验证,如果 ≥ 50ms 则切换 Tone.js |
| **Tone.js 依赖过大** | 中 | 仅在必要时引入,使用动态导入减少初始包大小 |
| **偏移量精度不足** | 中 | 10ms 精度在 Web Audio API 范围内,HTML5 Audio 需验证 |
| **iOS Safari 限制** | 中 | 已有 `resumeAudioContext` 机制,HTML5 Audio 也需用户交互 |
| **IndexedDB 配额超限** | 低 | 添加存储空间检查,限制单个文件 20MB |

### 7.2 用户体验风险

| 风险 | 缓解措施 |
|------|---------|
| 偏移量设置不够直观 | 提供快速调整面板(±10ms/±100ms/±1s) |
| 音量模式不够灵活 | 4 种模式覆盖常见场景,足够使用 |
| 移动端空间不足 | 单行布局,图标化设计,375px 宽度可放下 |
| 上传错误格式 | 添加文件格式验证(MP3/WAV/OGG/M4A),toast 提示 |

### 7.3 已解决的风险

| 风险 | 解决方案 |
|------|---------|
| ~~鼓声采样变速保调复杂~~ | ✅ 保持 Web Audio API,允许音高变化 |
| ~~音频文件存储占用 LocalStorage~~ | ✅ 使用 IndexedDB 存储 |
| ~~循环区域设置复杂~~ | ✅ 复用现有 `loopRange` 机制 |
| ~~UI 控件过多~~ | ✅ 单行布局,图标化,按钮切换音量模式 |

---

## 8. 成功指标

### 8.1 功能指标

- 背景音乐上传成功率 ≥ 99%
- 播放同步精度 < 50ms (HTML5 Audio 方案)
- 偏移量调整精度 = 10ms
- 音量模式切换响应延迟 < 50ms

### 8.2 用户满意度指标(未来收集)

- 功能使用率(使用背景音乐的 Pattern 比例)
- 用户反馈评分

---

## 9. 后续迭代方向

暂无。本功能聚焦核心需求,已完成 MUST 实现。

---

## 10. 附录

### 10.1 技术选型总结

**鼓声采样**: 保持 Web Audio API
- **理由**: 第一原则是不破坏现有功能
- **接受**: 变速时音高变化(鼓手可接受,短促音效影响小)

**背景音乐**: 优先 HTML5 Audio,降级 Tone.js
- **方案1 (HTML5 Audio)**: 零依赖,实现简单,但需验证同步精度
- **方案2 (Tone.js)**: 精确控制,变速保调效果好,但引入 150KB 依赖

**决策流程**:
1. Phase 0 验证 HTML5 Audio 同步精度
2. 如果 < 50ms,使用方案1
3. 如果 ≥ 50ms,使用方案2(Tone.js)

### 10.2 参考文档

- [Web Audio API 规范](https://webaudio.github.io/web-audio-api/)
- [IndexedDB 使用指南](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [HTMLMediaElement.preservesPitch](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/preservesPitch)
- 现有代码: [src/utils/audioEngine.ts](../../src/utils/audioEngine.ts)
- 现有代码: [src/hooks/useMultiPatternPlayer.ts](../../src/hooks/useMultiPatternPlayer.ts)

### 10.3 相关 Issue

(暂无,首次提出)

---

**变更历史**:
- 2026-01-21 v2: 根据用户反馈优化技术方案和 UI 设计
- 2026-01-21 v1: 初稿创建
