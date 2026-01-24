# Per-Bar BPM Feature Proposal

## 问题描述

当前的 Pattern 只有一个全局 BPM 设置，应用于所有小节。用户希望能够为每个小节单独设置不同的 BPM，以支持更复杂的节奏变化练习。

## 解决方案

### 数据结构扩展（向后兼容）

在 `Pattern` 接口中添加可选字段 `barBpmOverrides`：

```typescript
interface Pattern {
  // ... 现有字段
  barBpmOverrides?: Record<number, number>;  // key: 小节索引 (0-based), value: BPM
}
```

**向后兼容性**：
- 该字段为可选，现有数据无需迁移
- 如果 `barBpmOverrides` 不存在或某小节没有覆盖值，使用全局 `bpm`
- 播放时按小节索引查找覆盖值

### UI 变更

1. **在 pattern-bar-tools 添加"小节 BPM"按钮**
   - 位置：在 pattern-copy-controls 右边
   - 图标：节拍器图标（三角底座 + 摆锤）
   - 样式：与 pattern-tab 一致（透明背景、边框）
   - active 时按钮高亮显示（紫色）

2. **按钮交互行为**
   - 当前小节无覆盖时点击 → 立即用全局 BPM 设置该小节的覆盖 → 按钮变 active
   - 当前小节有覆盖时点击 → 清除该小节的覆盖 → 按钮恢复默认
   - active 状态仅由当前游标所在小节是否有覆盖决定

3. **BPM 调整行为变更**
   - 正常模式：BPM 变更影响全局 `pattern.bpm`
   - 小节 BPM 编辑模式（isBarBpmMode=true）：
     - BPM 变更只影响当前游标所在小节的 `barBpmOverrides[barIndex]`
     - BPM 显示区域显示当前小节的 BPM（覆盖值或全局值）

4. **保存行为**
   - 保存 pattern 时，`barBpmOverrides` 一并保存
   - 加载时自动恢复

5. **复制粘贴行为**
   - 复制节奏型时，同时复制 `barBpmOverrides` 和全局 `bpm`
   - 粘贴时：如果目标节奏型 BPM 与来源不同，为所有粘贴的小节创建 BPM 覆盖

### 播放逻辑变更

在 `useMultiPatternPlayer` 中的 `getSubdivisionDuration` 函数考虑当前播放的小节是否有 BPM 覆盖：

```typescript
const getSubdivisionDuration = (pattern: Pattern, subdivisionIndex?: number): number => {
  let baseBPM = pattern.bpm;
  if (subdivisionIndex !== undefined && pattern.barBpmOverrides) {
    const [beatsPerBar] = pattern.timeSignature;
    const subdivisionsPerBar = beatsPerBar * SUBDIVISIONS_PER_BEAT;
    const barIndex = Math.floor(subdivisionIndex / subdivisionsPerBar);
    baseBPM = pattern.barBpmOverrides[barIndex] ?? pattern.bpm;
  }
  
  const effectiveBPM = baseBPM * playbackRateRef.current;
  const beatDuration = (60.0 / effectiveBPM) * (4.0 / pattern.timeSignature[1]);
  return beatDuration / SUBDIVISIONS_PER_BEAT;
};
```

## 变更级别

🟡 **常规功能**（Feature）

## 实现状态

✅ 已完成

## 文件变更列表

- `src/types/index.ts` - 扩展 Pattern 类型，添加 barBpmOverrides
- `src/components/PatternEditor/PatternEditor.tsx` - 添加小节 BPM 按钮
- `src/components/PatternEditor/BarControls.tsx` - 移除按钮相关 props
- `src/components/PatternEditor/BarControls.css` - 按钮样式
- `src/hooks/usePattern.ts` - 添加 updateBarBpm 方法，更新 addBar/removeBar/insertPatternGrid
- `src/hooks/useMultiPatternPlayer.ts` - 使用每小节 BPM
- `src/utils/storage.ts` - 验证 barBpmOverrides
- `src/App.tsx` - 管理小节 BPM 编辑模式状态和交互逻辑
