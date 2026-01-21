# 任务清单:背景音乐同步播放功能

## 元数据

- **提案ID**: `20260121-background-music-sync`
- **创建日期**: 2026-01-21
- **状态**: 待开始
- **预估总工时**: 20-29 小时

---

## Phase 0: 技术验证 (1-2 小时)

**目标**: 验证 HTML5 Audio 同步精度是否满足要求

### 0.1 创建同步精度测试页面

**文件**: `src/tests/sync-precision-test.html`

**任务**:
- [ ] 创建 HTML5 Audio 测试页面
- [ ] 实现播放同步逻辑
- [ ] 添加精度测量代码
- [ ] 显示延迟结果

**实现要点**:
```html
<!DOCTYPE html>
<html>
<head>
  <title>HTML5 Audio 同步精度测试</title>
</head>
<body>
  <h1>同步精度测试</h1>
  <button id="playBtn">播放</button>
  <div id="results"></div>

  <script>
    const audio = new Audio();
    audio.preservesPitch = true;
    audio.src = 'test-music.mp3';

    let results = [];

    document.getElementById('playBtn').addEventListener('click', async () => {
      const startTime = performance.now();

      // 播放鼓声 (Web Audio API)
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      oscillator.connect(ctx.destination);
      oscillator.start(ctx.currentTime + 0.1);

      // 播放背景音乐 (HTML5 Audio)
      audio.currentTime = 0;
      await audio.play();

      const delay = performance.now() - startTime;
      results.push(delay);

      document.getElementById('results').innerHTML = `
        <p>延迟: ${delay.toFixed(2)}ms</p>
        <p>平均: ${(results.reduce((a,b) => a+b) / results.length).toFixed(2)}ms</p>
      `;
    });
  </script>
</body>
</html>
```

**验收标准**:
- [ ] 测试页面可正常运行
- [ ] 能测量播放延迟
- [ ] 多次测试后计算平均延迟

**预估时间**: 30 分钟

### 0.2 执行测试并记录结果

**任务**:
- [ ] 准备测试音频文件(MP3, 3-5 分钟)
- [ ] 执行 20 次播放测试
- [ ] 记录每次延迟数据
- [ ] 计算平均延迟和标准差

**测试数据记录表**:

| 测试次数 | 延迟(ms) | 备注 |
|---------|---------|------|
| 1 | | |
| 2 | | |
| ... | | |
| 20 | | |
| **平均** | | |
| **标准差** | | |

**验收标准**:
- [ ] 完成 20 次测试
- [ ] 平均延迟 < 50ms ✅ 使用 HTML5 Audio
- [ ] 平均延迟 ≥ 50ms ⚠️ 需要切换 Tone.js

**预估时间**: 30 分钟

### 0.3 决策:选择技术方案

**任务**:
- [ ] 根据测试结果决定使用 HTML5 Audio 或 Tone.js
- [ ] 如果选择 Tone.js,添加到 package.json
- [ ] 更新 design.md 文档

**决策标准**:
```
平均延迟 < 50ms  → 使用 HTML5 Audio (方案1)
平均延迟 ≥ 50ms → 使用 Tone.js (方案2)
```

**预估时间**: 30 分钟

---

## Phase 1: IndexedDB 存储工具 (2-3 小时)

**目标**: 实现音频文件的持久化存储

### 1.1 创建 IndexedDB 封装类

**文件**: `src/utils/backgroundMusicStorage.ts`

**任务**:
- [ ] 定义 `BackgroundMusicRecord` 类型
- [ ] 实现 `BackgroundMusicStorage` 类
- [ ] 实现 `init()` 方法
- [ ] 实现 `save()` 方法
- [ ] 实现 `getByPatternId()` 方法
- [ ] 实现 `deleteByPatternId()` 方法
- [ ] 实现 `getBlobURL()` 方法
- [ ] 导出单例 `backgroundMusicStorage`

**代码参考**: 见 [design.md §3.1](./design.md#31-indexeddb-存储模块)

**验收标准**:
- [ ] TypeScript 类型检查通过
- [ ] 所有方法有错误处理
- [ ] 单元测试覆盖率 ≥ 80%

**预估时间**: 1.5 小时

### 1.2 单元测试

**文件**: `src/utils/__tests__/backgroundMusicStorage.test.ts`

**任务**:
- [ ] 测试 `save()` 方法
- [ ] 测试 `getByPatternId()` 方法
- [ ] 测试 `deleteByPatternId()` 方法
- [ ] 测试 `getBlobURL()` 方法
- [ ] 测试错误处理(数据库未初始化等)

**测试用例**:
```typescript
describe('BackgroundMusicStorage', () => {
  it('should save background music record', async () => {
    // ...
  });

  it('should retrieve record by patternId', async () => {
    // ...
  });

  it('should delete record by patternId', async () => {
    // ...
  });

  it('should return null for non-existent patternId', async () => {
    // ...
  });
});
```

**验收标准**:
- [ ] 所有测试通过
- [ ] 测试覆盖率 ≥ 80%

**预估时间**: 1 小时

---

## Phase 2: useBackgroundMusic Hook (3-4 小时)

**目标**: 实现背景音乐播放控制逻辑

### 2.1 创建 Hook 主文件

**文件**: `src/hooks/useBackgroundMusic.ts`

**任务**:
- [ ] 定义 `BackgroundMusicState` 类型
- [ ] 定义 `BackgroundMusicActions` 类型
- [ ] 实现 `useBackgroundMusic` Hook
- [ ] 实现 `load()` 函数
- [ ] 实现 `play()` 函数
- [ ] 实现 `pause()` 函数
- [ ] 实现 `stop()` 函数
- [ ] 实现 `setVolumeMode()` 函数
- [ ] 实现 `setOffset()` 函数
- [ ] 实现 `setPlaybackRate()` 函数
- [ ] 实现 `remove()` 函数
- [ ] 添加音频元素初始化逻辑
- [ ] 添加资源清理逻辑

**代码参考**: 见 [design.md §3.2](./design.md#32-usebackgroundmusic-hook)

**验收标准**:
- [ ] TypeScript 类型检查通过
- [ ] 所有函数有错误处理
- [ ] 音频元素正确初始化和清理
- [ ] `preservesPitch=true` 正确设置

**预估时间**: 2.5 小时

### 2.2 单元测试

**文件**: `src/hooks/__tests__/useBackgroundMusic.test.ts`

**任务**:
- [ ] 测试音频加载
- [ ] 测试播放功能
- [ ] 测试暂停功能
- [ ] 测试停止功能
- [ ] 测试音量模式切换
- [ ] 测试偏移量设置
- [ ] 测试播放速率设置
- [ ] 测试删除功能
- [ ] 测试错误处理

**验收标准**:
- [ ] 所有测试通过
- [ ] 测试覆盖率 ≥ 80%

**预估时间**: 1 小时

---

## Phase 3: 集成到 useMultiPatternPlayer (2-3 小时)

**目标**: 将背景音乐集成到现有播放器

### 3.1 修改 useMultiPatternPlayer

**文件**: `src/hooks/useMultiPatternPlayer.ts`

**任务**:
- [ ] 导入 `useBackgroundMusic`
- [ ] 获取当前 Pattern 的背景音乐控制
- [ ] 修改 `play()` 函数,添加背景音乐播放
- [ ] 修改 `pause()` 函数,添加背景音乐暂停
- [ ] 修改 `stop()` 函数,添加背景音乐停止
- [ ] 修改 `setPlaybackRate()` 函数,添加背景音乐变速
- [ ] 添加循环监听,重置背景音乐
- [ ] 返回 `bgMusicState` 和 `bgMusicActions`

**代码参考**: 见 [design.md §3.3](./design.md#33-集成到-usemultipatternplayer)

**注意事项**:
- ⚠️ 不修改鼓声播放逻辑
- ⚠️ 不修改节拍器播放逻辑
- ⚠️ 仅添加背景音乐相关代码

**验收标准**:
- [ ] 现有播放功能不受影响
- [ ] 背景音乐与鼓声同步播放
- [ ] 背景音乐与鼓声同步暂停
- [ ] 背景音乐与鼓声同步变速
- [ ] 循环时背景音乐正确重置

**预估时间**: 2 小时

### 3.2 集成测试

**文件**: `src/hooks/__tests__/useMultiPatternPlayer.integration.test.ts`

**任务**:
- [ ] 测试鼓声和背景音乐同步播放
- [ ] 测试鼓声和背景音乐同步暂停
- [ ] 测试鼓声和背景音乐同步变速
- [ ] 测试循环时背景音乐重置
- [ ] 测试无背景音乐时现有功能正常

**验收标准**:
- [ ] 所有集成测试通过
- [ ] 现有功能 100% 正常

**预估时间**: 1 小时

---

## Phase 4: UI 组件开发 (3-4 小时)

**目标**: 实现用户界面组件

### 4.1 创建主控制组件

**文件**: `src/components/BackgroundMusicControls/BackgroundMusicControls.tsx`

**任务**:
- [ ] 创建组件结构
- [ ] 集成 `FileIconButton`
- [ ] 集成 `OffsetDisplay`
- [ ] 集成 `VolumeModeButton`
- [ ] 集成 `DeleteIconButton`
- [ ] 添加响应式布局
- [ ] 添加样式(Tailwind CSS)

**代码参考**: 见 [design.md §4.1](./design.md#41-背景音乐控制组件)

**验收标准**:
- [ ] 组件在 375px 宽度下正常显示
- [ ] 所有子组件正确集成
- [ ] 样式与现有控件一致

**预估时间**: 30 分钟

### 4.2 文件选择按钮

**文件**: `src/components/BackgroundMusicControls/FileIconButton.tsx`

**任务**:
- [ ] 实现文件选择按钮
- [ ] 实现文件格式验证(MP3/WAV/OGG/M4A)
- [ ] 实现文件大小验证(≤20MB)
- [ ] 实现文件上传到 IndexedDB
- [ ] 添加图标(未加载/已加载)
- [ ] 添加加载状态提示

**代码参考**: 见 [design.md §4.2](./design.md#42-文件选择按钮)

**验收标准**:
- [ ] 点击按钮能选择文件
- [ ] 错误格式文件被拒绝
- [ ] 超大文件被拒绝
- [ ] 成功上传后图标变化

**预估时间**: 1 小时

### 4.3 偏移量显示和调整

**文件**: `src/components/BackgroundMusicControls/OffsetDisplay.tsx`

**任务**:
- [ ] 实现偏移量显示(格式: ±2.30s)
- [ ] 实现快速调整面板
- [ ] 实现调整按钮(±10ms, ±100ms, ±1s)
- [ ] 实现手动输入框(长按触发)
- [ ] 添加偏移量范围限制(-10s 到 +10s)
- [ ] 添加键盘快捷键支持(桌面端)
- [ ] 添加鼠标滚轮支持

**代码参考**: 见 [design.md §4.3](./design.md#43-偏移量显示和调整)

**验收标准**:
- [ ] 显示精度为 10ms
- [ ] 快速调整面板正常工作
- [ ] 偏移量范围限制生效
- [ ] 键盘快捷键正常工作

**预估时间**: 1.5 小时

### 4.4 音量模式按钮

**文件**: `src/components/BackgroundMusicControls/VolumeModeButton.tsx`

**任务**:
- [ ] 实现音量模式按钮
- [ ] 实现 4 种模式图标(静音/低/中/高)
- [ ] 实现左键切换下一个模式
- [ ] 实现右键切换上一个模式
- [ ] 实现滚轮循环切换
- [ ] 添加 tool tip 提示

**代码参考**: 见 [design.md §4.4](./design.md#44-音量模式按钮)

**验收标准**:
- [ ] 单击切换到下一个模式
- [ ] 右键切换到上一个模式
- [ ] 滚轮循环切换
- [ ] 图标正确反映当前模式

**预估时间**: 1 小时

### 4.5 删除按钮

**文件**: `src/components/BackgroundMusicControls/DeleteIconButton.tsx`

**任务**:
- [ ] 实现删除按钮
- [ ] 实现两次点击确认机制
- [ ] 实现 3 秒自动隐藏确认
- [ ] 添加确认时样式变化

**代码参考**: 见 [design.md §4.5](./design.md#45-删除按钮)

**验收标准**:
- [ ] 第一次点击显示确认
- [ ] 第二次点击执行删除
- [ ] 3 秒后自动隐藏确认

**预估时间**: 30 分钟

---

## Phase 5: 循环同步 (1-2 小时)

**目标**: 实现循环时背景音乐重置

### 5.1 监听循环事件

**文件**: `src/hooks/useMultiPatternPlayer.ts` (修改)

**任务**:
- [ ] 在 `useMultiPatternPlayer` 中添加循环监听
- [ ] 实现循环回调函数
- [ ] 在循环时重置背景音乐
- [ ] 测试循环功能

**代码参考**: 见 [design.md §3.3](./design.md#33-集成到-usemultipatternplayer)

**验收标准**:
- [ ] Pattern 循环时背景音乐同步重置
- [ ] 偏移量正确应用

**预估时间**: 1.5 小时

### 5.2 集成测试

**任务**:
- [ ] 测试循环同步功能
- [ ] 测试不同偏移量下的循环
- [ ] 测试循环时的音质(无断裂)

**预估时间**: 30 分钟

---

## Phase 6: 偏移量快速调整优化 (2 小时)

**目标**: 优化偏移量调整交互

### 6.1 键盘快捷键

**文件**: `src/components/BackgroundMusicControls/OffsetDisplay.tsx` (修改)

**任务**:
- [ ] 添加键盘事件监听
- [ ] 实现 `[` / `]`: ±10ms
- [ ] 实现 `-` / `=`: ±100ms
- [ ] 实现 `Shift` + `-` / `=`: ±1s
- [ ] 添加 tool tip 提示快捷键

**验收标准**:
- [ ] 快捷键在桌面端正常工作
- [ ] 快捷键不影响其他组件

**预估时间**: 1 小时

### 6.2 鼠标滚轮支持

**文件**: `src/components/BackgroundMusicControls/OffsetDisplay.tsx` (修改)

**任务**:
- [ ] 添加滚轮事件监听
- [ ] 实现普通滚轮: ±10ms
- [ ] 实现按住 Shift: ±100ms
- [ ] 实现按住 Ctrl: ±1s

**验收标准**:
- [ ] 滚轮调整精确到 10ms
- [ ] 组合键正常工作

**预估时间**: 1 小时

---

## Phase 7: 测试和优化 (2-3 小时)

**目标**: 全面测试和优化

### 7.1 手动测试

**任务**:
- [ ] 测试音频上传(MP3/WAV/OGG/M4A)
- [ ] 测试播放同步
- [ ] 测试暂停同步
- [ ] 测试停止功能
- [ ] 测试变速保调(0.5x-1.0x)
- [ ] 测试偏移量调整
- [ ] 测试循环同步
- [ ] 测试音量模式切换
- [ ] 测试删除功能
- [ ] 测试错误处理

**测试清单**: 见 [design.md §6.3](./design.md#63-手动测试清单)

**预估时间**: 1.5 小时

### 7.2 性能优化

**任务**:
- [ ] 检查内存泄漏
- [ ] 优化音频元素生命周期
- [ ] 优化 IndexedDB 查询
- [ ] 优化渲染性能
- [ ] 使用 React DevTools Profiler

**验收标准**:
- [ ] 无内存泄漏
- [ ] 组件卸载时资源正确释放
- [ ] 首次加载时间 < 1s

**预估时间**: 1 小时

### 7.3 移动端适配测试

**任务**:
- [ ] 在 375px 宽度下测试(iPhone SE)
- [ ] 测试触摸交互
- [ ] 测试横屏模式
- [ ] 测试不同浏览器(Safari/Chrome)

**验收标准**:
- [ ] 375px 宽度下单行布局正常
- [ ] 所有按钮可点击
- [ ] 无横向滚动

**预估时间**: 30 分钟

---

## Phase 8: (可选) 切换到 Tone.js 方案 (4-6 小时)

**前提**: Phase 0 测试发现 HTML5 Audio 精度不足

### 8.1 安装依赖

**任务**:
- [ ] 运行 `bun add tone`
- [ ] 验证安装成功

**预估时间**: 15 分钟

### 8.2 重写 useBackgroundMusic Hook

**文件**: `src/hooks/useBackgroundMusic.ts` (修改)

**任务**:
- [ ] 替换 HTML5 Audio 为 Tone.js Player
- [ ] 实现精确时序调度
- [ ] 实现变速保调
- [ ] 测试同步精度

**代码参考**: 见 [design.md §8.2](./design.md#82-实现差异)

**验收标准**:
- [ ] 同步精度 < 50ms
- [ ] 变速保调效果良好

**预估时间**: 3 小时

### 8.3 更新测试

**任务**:
- [ ] 更新单元测试
- [ ] 更新集成测试
- [ ] 更新手动测试清单

**预估时间**: 1.5 小时

### 8.4 性能优化

**任务**:
- [ ] 实现动态导入 Tone.js
- [ ] 减少初始包大小
- [ ] 优化加载时间

**验收标准**:
- [ ] 初始包大小增加 < 50KB
- [ ] 首次加载时间 < 2s

**预估时间**: 1.5 小时

---

## 验收标准总结

### 功能验收

- [ ] 能够成功上传 MP3/WAV/OGG/M4A 文件到 IndexedDB
- [ ] 背景音乐与鼓点同步播放,延迟 < 100ms
- [ ] 偏移量能够精确设置到 10ms
- [ ] 偏移量支持快速调整(按钮/键盘/滚轮)
- [ ] 变速时音乐音高保持不变(0.5x-1.0x)
- [ ] Pattern 循环时背景音乐同步重置
- [ ] 4 种音量模式切换流畅,默认 20%
- [ ] 移动端 375px 宽度下单行布局正常显示
- [ ] 删除背景音乐成功

### 代码质量验收

- [ ] 测试覆盖率 ≥ 80%
- [ ] `bun run typecheck` 通过
- [ ] `bun run lint` 通过
- [ ] 所有组件有 TypeScript 类型定义
- [ ] 无 console.error 或 console.warning

### 性能验收

- [ ] 首次加载时间 < 1s
- [ ] 音量模式切换响应延迟 < 50ms
- [ ] 偏移量调整响应延迟 < 50ms
- [ ] 无内存泄漏

### 兼容性验收

- [ ] Chrome 90+ 正常工作
- [ ] Firefox 88+ 正常工作
- [ ] Safari 14+ 正常工作
- [ ] Edge 90+ 正常工作
- [ ] 移动端(iOS Safari)正常工作

### 不破坏现有功能

- [ ] 鼓声播放完全保持原样
- [ ] 节拍器播放完全保持原样
- [ ] 所有现有组件不受影响
- [ ] 现有测试 100% 通过

---

## 附录

### A. 文件清单

**新增文件**:
```
src/
├── components/
│   └── BackgroundMusicControls/
│       ├── BackgroundMusicControls.tsx
│       ├── FileIconButton.tsx
│       ├── OffsetDisplay.tsx
│       ├── VolumeModeButton.tsx
│       └── DeleteIconButton.tsx
├── hooks/
│   └── useBackgroundMusic.ts
├── utils/
│   └── backgroundMusicStorage.ts
└── tests/
    └── sync-precision-test.html
```

**修改文件**:
```
src/
├── types/
│   └── index.ts
├── hooks/
│   └── useMultiPatternPlayer.ts
└── components/
    └── [播放控制组件].tsx
```

### B. 依赖清单

**必须**(HTML5 Audio 方案):
- 无需新增依赖

**可选**(Tone.js 方案):
```bash
bun add tone
```

### C. 相关文档

- [提案文档](./proposal.md)
- [设计文档](./design.md)
- [现有代码: audioEngine.ts](../../src/utils/audioEngine.ts)
- [现有代码: useMultiPatternPlayer.ts](../../src/hooks/useMultiPatternPlayer.ts)

---

**变更历史**:
- 2026-01-21: 初始版本创建
