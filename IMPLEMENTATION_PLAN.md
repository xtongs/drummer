# 鼓手节拍器工具 - 详细实现计划

## 项目概述

一个专为鼓手设计的节拍器和节奏型编辑器工具，支持：

- 基础节拍器功能（BPM 控制、可视化）
- 节奏型网格编辑（类似库乐队）
- 实时鼓谱显示（SVG 五线谱）
- 本地存储（保存/加载节奏型）
- PWA 支持（离线使用）

## 一、技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **音频**: Web Audio API
- **存储**: localStorage
- **PWA**: vite-plugin-pwa
- **UI**: 原生 CSS（移动端优先）

## 二、数据结构设计

### 2.1 核心类型定义

```typescript
// 鼓件类型（按标准鼓谱顺序从上到下）
type DrumType =
  | "Crash 1" // 高音镲片1
  | "Crash 2" // 高音镲片2
  | "Ride" // 叮叮镲片
  | "Hi-Hat Open" // 踩镲（开合）
  | "Hi-Hat Closed" // 踩镲（闭合）
  | "Snare" // 军鼓
  | "Tom 3" // 三嗵鼓
  | "Tom 2" // 二嗵鼓
  | "Tom 1" // 一嗵鼓
  | "Kick"; // 底鼓

// 拍号类型
type TimeSignature = [number, number]; // [beatsPerBar, noteValue]

// 循环范围
type LoopRange = [number, number]; // [startBar, endBar]

// 节奏型接口
interface Pattern {
  id: string;
  name: string;
  bpm: number;
  timeSignature: TimeSignature; // 默认 [4, 4]
  bars: number; // 小节数，默认2
  grid: boolean[][]; // [drumIndex][beatIndex]
  drums: DrumType[]; // 鼓件列表（固定顺序）
  loopRange?: LoopRange; // 循环播放范围，可选
  createdAt: number; // 创建时间戳
  updatedAt: number; // 更新时间戳
}

// 存储数据结构
interface StorageData {
  patterns: Pattern[];
  currentPatternId?: string;
  settings?: {
    defaultBPM: number;
    defaultTimeSignature: TimeSignature;
  };
}
```

### 2.2 常量定义

```typescript
// 鼓件列表（按标准鼓谱顺序）
export const DRUMS: DrumType[] = [
  "Crash 1",
  "Crash 2",
  "Ride",
  "Hi-Hat Open",
  "Hi-Hat Closed",
  "Snare",
  "Tom 3",
  "Tom 2",
  "Tom 1",
  "Kick",
];

// 默认值
export const DEFAULT_BPM = 120;
export const DEFAULT_TIME_SIGNATURE: TimeSignature = [4, 4];
export const DEFAULT_BARS = 2;
export const MIN_BPM = 40;
export const MAX_BPM = 200;

// 鼓谱符号映射
export const DRUM_NOTATION: Record<
  DrumType,
  {
    position: "above" | "center" | "below";
    symbol: "x" | "o" | "●" | "○";
    line: number; // 相对中间线的位置（-2到2）
  }
> = {
  "Crash 1": { position: "above", symbol: "x", line: -2 },
  "Crash 2": { position: "above", symbol: "x", line: -1.5 },
  Ride: { position: "above", symbol: "x", line: -1 },
  "Hi-Hat Open": { position: "above", symbol: "o", line: -0.5 },
  "Hi-Hat Closed": { position: "above", symbol: "x", line: 0 },
  Snare: { position: "center", symbol: "●", line: 0 },
  "Tom 3": { position: "below", symbol: "○", line: 0.5 },
  "Tom 2": { position: "below", symbol: "○", line: 1 },
  "Tom 1": { position: "below", symbol: "○", line: 1.5 },
  Kick: { position: "below", symbol: "●", line: 2 },
};
```

## 三、项目文件结构

```
src/
├── components/
│   ├── MetronomeBar/              # 顶部节拍器条
│   │   ├── MetronomeBar.tsx       # 主组件
│   │   ├── BPMControl.tsx         # BPM控制组件
│   │   ├── PlayButton.tsx         # 播放/暂停按钮
│   │   └── BeatDots.tsx           # 四个点可视化
│   ├── PatternEditor/              # 节奏型编辑器
│   │   ├── PatternEditor.tsx      # 主组件
│   │   ├── DrumNotation.tsx       # 鼓谱显示（SVG）
│   │   ├── Grid.tsx               # 网格编辑组件
│   │   ├── GridCell.tsx           # 单个格子
│   │   ├── BarControls.tsx        # 小节控制（添加/删除）
│   │   └── LoopRangeSelector.tsx  # 循环范围选择
│   ├── PatternManager/             # 节奏型管理
│   │   ├── PatternList.tsx        # 节奏型列表
│   │   ├── PatternSaveDialog.tsx  # 保存对话框
│   │   └── PatternLoadDialog.tsx  # 加载对话框
│   └── Layout/
│       └── AppLayout.tsx          # 应用布局
├── hooks/
│   ├── useMetronome.ts            # 节拍器逻辑
│   ├── usePattern.ts              # 节奏型状态管理
│   ├── usePatternPlayer.ts        # 节奏型播放逻辑
│   └── useAudio.ts                # 音频播放Hook
├── utils/
│   ├── audioEngine.ts             # 音频引擎（Web Audio API）
│   ├── storage.ts                 # localStorage封装
│   ├── constants.ts               # 常量定义
│   └── drumNotation.ts            # 鼓谱渲染工具函数
├── types/
│   └── index.ts                   # TypeScript类型定义
├── styles/
│   ├── app.css                    # 全局样式
│   └── variables.css              # CSS变量
├── App.tsx                        # 根组件
└── main.tsx                       # 入口文件
```

## 四、核心功能实现

### 4.1 节拍器功能（MetronomeBar）

#### 4.1.1 组件结构

- **位置**: 固定在页面顶部
- **高度**: 60-80px
- **内容**: BPM 控制 + 播放按钮 + 四个点可视化

#### 4.1.2 功能实现

**BPMControl.tsx**

```typescript
// 功能：
- 显示当前BPM值
- 输入框/滑块控制BPM（40-200）
- 实时更新pattern.bpm
```

**PlayButton.tsx**

```typescript
// 功能：
- 播放/暂停切换
- 图标状态切换（▶ / ⏸）
- 触发播放逻辑
```

**BeatDots.tsx**

```typescript
// 功能：
- 显示四个圆点（● ● ● ○）
- 当前拍高亮（颜色/大小变化）
- 根据timeSignature显示对应数量的点
```

**useMetronome.ts Hook**

```typescript
// 功能：
- 管理节拍器状态（isPlaying, currentBeat）
- 使用Web Audio API生成节拍声音
- 精确的节拍调度（基于AudioContext.currentTime）
- 节拍可视化更新
```

### 4.2 节奏型编辑器（PatternEditor）

#### 4.2.1 布局设计

```
┌─────────────────────────────────────┐
│  鼓谱显示区（SVG，可横向滚动）        │
│  [← →] 横向滚动                      │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  网格编辑区（可横向滚动，与鼓谱同步） │
│  Crash 1 │   │   │   │   │   │   │   │
│  Crash 2 │   │   │   │   │   │   │   │
│  ...                                 │
│  Kick    │   │   │   │   │   │   │   │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  控制区                               │
│  [添加小节] [删除小节] [循环范围]     │
│  [保存] [加载] [清除]                 │
└─────────────────────────────────────┘
```

#### 4.2.2 鼓谱显示（DrumNotation.tsx）

**实现要点：**

- 使用 SVG 绘制五线谱
- 实时根据 grid 数据渲染符号
- 支持横向滚动（小节数多时）
- 播放时高亮当前拍
- 小节分隔线清晰显示

**SVG 结构：**

```typescript
<svg viewBox="0 0 {totalWidth} {height}">
  {/* 五线谱背景（5条横线） */}
  {[0, 1, 2, 3, 4].map((i) => (
    <line
      key={i}
      x1={0}
      y1={staffLineY(i)}
      x2={totalWidth}
      y2={staffLineY(i)}
      stroke="#000"
      strokeWidth={1}
    />
  ))}

  {/* 小节分隔线 */}
  {bars.map((bar, index) => (
    <line
      key={index}
      x1={barX(index)}
      y1={0}
      x2={barX(index)}
      y2={height}
      stroke="#666"
      strokeWidth={2}
    />
  ))}

  {/* 鼓谱符号 */}
  {DRUMS.map((drum, drumIndex) => {
    const notation = DRUM_NOTATION[drum];
    return beats.map((beat, beatIndex) => {
      if (grid[drumIndex][beatIndex]) {
        return (
          <g key={`${drumIndex}-${beatIndex}`}>
            {/* 根据符号类型绘制 */}
            {notation.symbol === "x" && (
              <path d="M{x-5} {y-5} L{x+5} {y+5} M{x+5} {y-5} L{x-5} {y+5}" />
            )}
            {notation.symbol === "o" && (
              <circle cx={x} cy={y} r={4} fill="none" stroke="#000" />
            )}
            {notation.symbol === "●" && (
              <circle cx={x} cy={y} r={4} fill="#000" />
            )}
            {notation.symbol === "○" && (
              <circle cx={x} cy={y} r={4} fill="none" stroke="#000" />
            )}
          </g>
        );
      }
    });
  })}

  {/* 当前播放位置高亮 */}
  {currentBeat !== undefined && (
    <rect
      x={beatX(currentBeat)}
      y={0}
      width={beatWidth}
      height={height}
      fill="#ffeb3b"
      opacity={0.3}
    />
  )}
</svg>
```

**滚动同步：**

- 鼓谱和网格使用相同的滚动容器或同步滚动事件
- 使用`useRef`和`scrollLeft`实现同步

#### 4.2.3 网格编辑（Grid.tsx）

**实现要点：**

- 使用 CSS Grid 布局
- 每行对应一个鼓件（按标准顺序）
- 每列对应一个拍
- 点击切换开关状态
- 与鼓谱实时同步

**GridCell.tsx**

```typescript
// 功能：
- 显示单个格子的状态（on/off）
- 点击切换状态
- 视觉反馈（激活状态明显）
- 触摸友好（至少40x40px）
```

**滚动实现：**

```typescript
// 使用overflow-x: auto实现横向滚动
// 与鼓谱区域同步滚动
const handleScroll = (e: React.UIEvent) => {
  const scrollLeft = e.currentTarget.scrollLeft;
  // 同步另一个滚动容器的scrollLeft
};
```

#### 4.2.4 小节管理（BarControls.tsx）

**添加小节：**

```typescript
// 功能：
- 点击"添加小节"按钮
- 在grid数组末尾添加新的列（beatsPerBar列）
- 更新pattern.bars
- 鼓谱和网格自动更新
```

**删除小节：**

```typescript
// 功能：
- 点击"删除小节"按钮
- 从grid数组删除最后一个小节
- 至少保留1个小节
- 更新pattern.bars
```

#### 4.2.5 循环范围选择（LoopRangeSelector.tsx）

**实现要点：**

- 选择起始小节和结束小节
- 默认循环整个节奏型
- 播放时只播放选定范围
- 循环时无缝衔接

```typescript
// 循环逻辑：
const startBeat = loopRange[0] * beatsPerBar;
const endBeat = (loopRange[1] + 1) * beatsPerBar;
// 播放到endBeat时，回到startBeat
```

### 4.3 节奏型管理（PatternManager）

#### 4.3.1 保存功能（PatternSaveDialog.tsx）

```typescript
// 功能：
-弹出对话框输入名称 -
  保存当前pattern到localStorage -
  生成唯一ID和时间戳 -
  更新patterns列表;
```

#### 4.3.2 加载功能（PatternLoadDialog.tsx）

```typescript
// 功能：
-显示已保存的节奏型列表 - 点击加载选中的节奏型 - 替换当前编辑的pattern;
```

#### 4.3.3 删除功能

```typescript
// 功能：
-在列表中显示删除按钮 - 确认后从localStorage删除 - 更新列表显示;
```

### 4.4 音频播放（usePatternPlayer.ts）

#### 4.4.1 播放逻辑

```typescript
// 使用Web Audio API实现：
1. 创建AudioContext
2. 根据BPM计算每拍时长
3. 根据loopRange确定播放范围
4. 遍历grid数组，在对应时间点播放对应鼓件
5. 循环播放时，到达endBar后回到startBar
6. 同步更新currentBeat用于可视化
```

#### 4.4.2 音频引擎（audioEngine.ts）

```typescript
// 功能：
- 生成不同鼓件的声音（使用振荡器或预加载音频）
- 支持多轨道同时播放
- 精确的时间调度
- 音频资源管理
```

**声音生成方案：**

- 方案 A：使用 Web Audio API 的 OscillatorNode 生成简单声音
- 方案 B：预加载音频文件（需要 Service Worker 缓存）
- 推荐：方案 A（简单，无需额外资源）

### 4.5 数据存储（storage.ts）

```typescript
// 功能：
-封装localStorage操作 -
  保存patterns数组 -
  加载patterns数组 -
  删除指定pattern -
  数据序列化 / 反序列化 -
  错误处理;
```

## 五、PWA 配置

### 5.1 安装依赖

```bash
npm install -D vite-plugin-pwa
```

### 5.2 vite.config.ts 配置

```typescript
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Drummer - 鼓手节拍器",
        short_name: "Drummer",
        description: "专为鼓手设计的节拍器和节奏型编辑器",
        theme_color: "#000000",
        icons: [
          {
            src: "/icon.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
});
```

### 5.3 manifest.json 配置

- 应用名称、图标
- 启动画面
- 主题色
- 显示模式（standalone）

## 六、样式设计

### 6.1 移动端优先

- 响应式布局
- 触摸友好的按钮大小（至少 44x44px）
- 适配不同屏幕尺寸

### 6.2 颜色方案

- 背景：浅色/深色（根据系统偏好）
- 主色：简洁的黑白灰
- 激活状态：明显的视觉反馈
- 鼓谱：黑色符号，无颜色区分

### 6.3 字体

- 系统字体栈
- 清晰易读
- 适当的大小

## 七、实现阶段

### 阶段 1：项目基础搭建 ✅

- [x] 清理 src 和 dist 文件夹
- [ ] 创建项目文件结构
- [ ] 配置 TypeScript 类型
- [ ] 设置基础样式

### 阶段 2：节拍器核心功能

- [ ] 实现 useMetronome Hook
- [ ] 实现 MetronomeBar 组件
- [ ] BPM 控制功能
- [ ] 四个点可视化
- [ ] 节拍声音生成

### 阶段 3：节奏型数据结构

- [ ] 定义 Pattern 类型
- [ ] 实现 usePattern Hook
- [ ] 实现 storage 工具函数
- [ ] 初始化默认 pattern

### 阶段 4：网格编辑器

- [ ] 实现 Grid 组件
- [ ] 实现 GridCell 组件
- [ ] 点击编辑功能
- [ ] 状态管理

### 阶段 5：鼓谱显示

- [ ] 实现 DrumNotation 组件（SVG）
- [ ] 五线谱绘制
- [ ] 符号渲染
- [ ] 实时更新机制
- [ ] 横向滚动

### 阶段 6：小节管理

- [ ] 实现 BarControls 组件
- [ ] 添加小节功能
- [ ] 删除小节功能
- [ ] 网格和鼓谱同步更新

### 阶段 7：循环播放

- [ ] 实现 LoopRangeSelector 组件
- [ ] 循环范围选择
- [ ] 播放逻辑更新

### 阶段 8：音频播放

- [ ] 实现 audioEngine
- [ ] 实现 usePatternPlayer Hook
- [ ] 多轨道播放
- [ ] 精确时间调度
- [ ] 循环播放逻辑

### 阶段 9：节奏型管理

- [ ] 实现 PatternSaveDialog
- [ ] 实现 PatternLoadDialog
- [ ] 实现 PatternList
- [ ] 保存/加载/删除功能

### 阶段 10：PWA 支持

- [ ] 安装 vite-plugin-pwa
- [ ] 配置 Service Worker
- [ ] 配置 manifest
- [ ] 测试离线功能

### 阶段 11：优化与测试

- [ ] 性能优化
- [ ] 移动端测试
- [ ] 浏览器兼容性测试
- [ ] 音频延迟优化
- [ ] 滚动同步优化

## 八、技术难点与解决方案

### 8.1 音频同步精度

**问题**: setInterval 不够精确，会有延迟累积
**解决方案**:

- 使用 Web Audio API 的 AudioContext.currentTime
- 提前调度音频事件（look-ahead scheduling）
- 使用 requestAnimationFrame 更新可视化

### 8.2 移动端音频延迟

**问题**: 移动浏览器音频延迟较高
**解决方案**:

- 使用 AudioContext 而非 HTML5 Audio
- 预加载音频资源
- 优化音频生成逻辑

### 8.3 滚动同步

**问题**: 鼓谱和网格需要同步滚动
**解决方案**:

- 使用相同的 scrollLeft 值
- 监听 scroll 事件，同步更新
- 使用 useRef 避免重复渲染

### 8.4 SVG 性能

**问题**: 小节数多时，SVG 元素过多可能影响性能
**解决方案**:

- 使用 React.memo 优化组件
- 虚拟滚动（只渲染可见区域）
- 使用 useMemo 缓存计算结果

## 九、测试要点

### 9.1 功能测试

- [ ] 节拍器 BPM 调整
- [ ] 播放/暂停功能
- [ ] 网格编辑功能
- [ ] 鼓谱实时更新
- [ ] 小节添加/删除
- [ ] 循环播放
- [ ] 保存/加载节奏型
- [ ] 删除节奏型

### 9.2 兼容性测试

- [ ] iOS Safari
- [ ] Android Chrome
- [ ] 桌面 Chrome
- [ ] 桌面 Firefox
- [ ] 桌面 Safari

### 9.3 性能测试

- [ ] 音频播放延迟
- [ ] 大量小节时的性能
- [ ] 滚动流畅度
- [ ] 内存使用

## 十、后续优化方向

1. **音频质量提升**

   - 使用真实鼓声采样
   - 支持音量调节
   - 支持音色选择

2. **功能扩展**

   - 支持更多拍号（3/4, 6/8 等）
   - 支持速度渐变
   - 支持节拍器声音选择

3. **用户体验**

   - 手势操作（滑动切换小节）
   - 快捷键支持（桌面端）
   - 主题切换（深色/浅色）

4. **数据管理**
   - 导出/导入节奏型（JSON 文件）
   - 节奏型分类/标签
   - 搜索功能

---

**文档版本**: v1.0
**创建时间**: 2024
**最后更新**: 2024
