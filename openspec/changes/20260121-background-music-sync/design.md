# 技术设计文档:背景音乐同步播放功能

## 元数据

- **提案ID**: `20260121-background-music-sync`
- **文档版本**: 1.0
- **创建日期**: 2026-01-21
- **状态**: 设计阶段
- **作者**: AI Assistant

---

## 1. 架构设计

### 1.1 系统架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                         用户界面层                           │
├─────────────────────────────────────────────────────────────┤
│  [BackgroundMusicControls] - 新增组件                        │
│    ├── FileIconButton        - 文件选择按钮                 │
│    ├── OffsetDisplay         - 偏移量显示和调整              │
│    ├── VolumeModeButton      - 音量模式切换                 │
│    └── DeleteIconButton      - 删除按钮                     │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         状态管理层                           │
├─────────────────────────────────────────────────────────────┤
│  [useBackgroundMusic] - 新增 Hook                            │
│    ├── 管理背景音乐播放状态                                   │
│    ├── 处理偏移量和音量                                       │
│    ├── 集成到 useMultiPatternPlayer                          │
│    └── 同步播放/暂停/变速/循环                                │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         数据持久层                           │
├─────────────────────────────────────────────────────────────┤
│  [IndexedDB] - backgroundMusic 对象存储                       │
│    ├── 存储音频 Blob 数据                                     │
│    ├── 索引: patternId                                       │
│    └── CRUD 操作                                             │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         音频播放层                           │
├─────────────────────────────────────────────────────────────┤
│  [现有实现 - 保持不变]                                        │
│    ├── audioEngine.ts (鼓声采样 - Web Audio API)            │
│    └── useMetronome.ts (节拍器 - Web Audio API)             │
│                                                              │
│  [新增实现]                                                   │
│    └── HTML5 Audio Element (背景音乐)                       │
│         ├── preservesPitch=true                            │
│         ├── playbackRate=0.5-1.0                            │
│         └── 精确时序控制                                     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心设计原则

1. **不破坏现有功能**
   - 鼓声播放逻辑完全保持不变
   - 节拍器播放逻辑完全保持不变
   - 所有现有组件不受影响

2. **增量式开发**
   - 新增功能独立模块化
   - 可选的降级方案(Tone.js)
   - 渐进式集成到现有系统

3. **性能优先**
   - 音频数据存储在 IndexedDB,不占用内存
   - 使用懒加载,仅在需要时创建音频元素
   - 优化渲染,单行 UI 减少重绘

---

## 2. 数据模型设计

### 2.1 类型定义扩展

**文件**: `src/types/index.ts`

```typescript
// ==================== 现有类型 (保持不变) ====================
export type DrumType =
  | "Crash 1" | "Crash 2" | "Hi-Hat Open" | "Hi-Hat Closed"
  | "Ride" | "Tom 1" | "Tom 2" | "Snare" | "Tom 3" | "Kick";

export type CellState = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface LoopRange {
  start: number;  // 起始小节
  end: number;    // 结束小节
}

// ==================== 扩展现有类型 ====================

export interface Pattern {
  id: string;
  name: string;
  bpm: number;
  timeSignature: [number, number];
  bars: number;
  grid: CellState[][];
  drums: DrumType[];
  loopRange?: LoopRange;

  // 新增字段:背景音乐
  backgroundMusic?: BackgroundMusicInfo;

  // 新增字段:播放设置
  musicVolume?: MusicVolumeMode;
  musicOffset?: number;  // 偏移量(秒),精度 10ms

  createdAt: number;
  updatedAt: number;
}

// ==================== 新增类型定义 ====================

/**
 * 背景音乐信息
 */
export interface BackgroundMusicInfo {
  id: string;          // 唯一标识
  filename: string;    // 原始文件名
  duration: number;    // 时长(秒)
  uploadedAt: number;  // 上传时间戳
}

/**
 * 音乐音量模式
 */
export type MusicVolumeMode = 0 | 0.2 | 0.5 | 0.8;

/**
 * 背景音乐播放状态
 */
export interface BackgroundMusicState {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
  isLoading: boolean;
  isLoaded: boolean;
  volumeMode: MusicVolumeMode;
  offset: number;  // 偏移量(秒),精度 10ms
  error?: string;
  patternId: string | null;
}

/**
 * 背景音乐操作接口
 */
export interface BackgroundMusicActions {
  load: (patternId: string) => Promise<void>;
  play: (offset: number) => Promise<void>;
  pause: () => void;
  stop: () => void;
  setVolumeMode: (mode: MusicVolumeMode) => void;
  setOffset: (offset: number) => void;
  setPlaybackRate: (rate: number) => void;
  remove: () => Promise<void>;
}

/**
 * IndexedDB 存储记录
 */
export interface BackgroundMusicRecord {
  id: string;
  patternId: string;
  filename: string;
  blob: Blob;
  duration: number;
  uploadedAt: number;
  size: number;
}
```

### 2.2 数据存储设计

**IndexedDB 数据库结构**:

```
数据库名: DrummerDB
对象存储: backgroundMusic

索引:
  - patternId (unique, 用于快速查询)

记录结构:
  {
    id: string (primary key)
    patternId: string (indexed)
    filename: string
    blob: Blob
    duration: number
    uploadedAt: number
    size: number
  }
```

---

## 3. 核心模块设计

### 3.1 IndexedDB 存储模块

**文件**: `src/utils/backgroundMusicStorage.ts`

```typescript
/**
 * IndexedDB 操作封装
 */

const DB_NAME = 'DrummerDB';
const STORE_NAME = 'backgroundMusic';
const INDEX_PATTERN_ID = 'patternId';

export class BackgroundMusicStorage {
  private db: IDBDatabase | null = null;

  /**
   * 初始化数据库
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 2); // 版本号升级

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建对象存储
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex(INDEX_PATTERN_ID, 'patternId', { unique: true });
        }
      };
    });
  }

  /**
   * 保存背景音乐
   */
  async save(record: BackgroundMusicRecord): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 根据 patternId 查询
   */
  async getByPatternId(patternId: string): Promise<BackgroundMusicRecord | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index(INDEX_PATTERN_ID);
      const request = index.get(patternId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 根据 patternId 删除
   */
  async deleteByPatternId(patternId: string): Promise<void> {
    if (!this.db) await this.init();

    // 先获取记录的 id
    const record = await this.getByPatternId(patternId);
    if (!record) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(record.id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取 Blob URL (用于播放)
   */
  async getBlobURL(patternId: string): Promise<string | null> {
    const record = await this.getByPatternId(patternId);
    if (!record) return null;
    return URL.createObjectURL(record.blob);
  }
}

// 导出单例
export const backgroundMusicStorage = new BackgroundMusicStorage();
```

### 3.2 useBackgroundMusic Hook

**文件**: `src/hooks/useBackgroundMusic.ts`

```typescript
import { useState, useEffect, useRef } from 'react';
import type { Pattern, BackgroundMusicState, BackgroundMusicActions, MusicVolumeMode } from '../types';
import { backgroundMusicStorage } from '../utils/backgroundMusicStorage';

export function useBackgroundMusic(pattern: Pattern | null): [BackgroundMusicState, BackgroundMusicActions] {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [state, setState] = useState<BackgroundMusicState>({
    audioElement: null,
    isPlaying: false,
    isLoading: false,
    isLoaded: false,
    volumeMode: (pattern?.musicVolume ?? 0.2) as MusicVolumeMode,
    offset: pattern?.musicOffset ?? 0,
    error: undefined,
    patternId: pattern?.id ?? null,
  });

  // 初始化音频元素
  useEffect(() => {
    if (!pattern?.backgroundMusic) return;

    const initAudio = async () => {
      setState(prev => ({ ...prev, isLoading: true }));

      try {
        const blobURL = await backgroundMusicStorage.getBlobURL(pattern.id);

        if (!blobURL) {
          throw new Error('背景音乐文件未找到');
        }

        const audio = new Audio(blobURL);
        audio.preservesPitch = true;  // 关键:变速保调
        audio.volume = state.volumeMode;

        audioRef.current = audio;
        setState(prev => ({
          ...prev,
          audioElement: audio,
          isLoaded: true,
          isLoading: false,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : '加载失败',
          isLoading: false,
        }));
      }
    };

    initAudio();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [pattern?.id]);

  // 加载背景音乐
  const load = async (patternId: string): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const blobURL = await backgroundMusicStorage.getBlobURL(patternId);

      if (!blobURL) {
        throw new Error('背景音乐文件未找到');
      }

      const audio = new Audio(blobURL);
      audio.preservesPitch = true;
      audio.volume = state.volumeMode;

      audioRef.current = audio;
      setState(prev => ({
        ...prev,
        audioElement: audio,
        isLoaded: true,
        isLoading: false,
        patternId,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '加载失败',
        isLoading: false,
      }));
      throw error;
    }
  };

  // 播放
  const play = async (offset: number): Promise<void> => {
    const audio = audioRef.current;
    if (!audio || !state.isLoaded) return;

    try {
      // 计算起始时间
      const startTime = Math.max(0, -offset);
      audio.currentTime = startTime;
      await audio.play();

      setState(prev => ({ ...prev, isPlaying: true, offset }));
    } catch (error) {
      console.error('播放背景音乐失败:', error);
      throw error;
    }
  };

  // 暂停
  const pause = (): void => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
  };

  // 停止
  const stop = (): void => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setState(prev => ({ ...prev, isPlaying: false }));
  };

  // 设置音量模式
  const setVolumeMode = (mode: MusicVolumeMode): void => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = mode;
    }
    setState(prev => ({ ...prev, volumeMode: mode }));
  };

  // 设置偏移量
  const setOffset = (offset: number): void => {
    setState(prev => ({ ...prev, offset }));
  };

  // 设置播放速率
  const setPlaybackRate = (rate: number): void => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = rate;
  };

  // 删除
  const remove = async (): Promise<void> => {
    if (!state.patternId) return;

    await backgroundMusicStorage.deleteByPatternId(state.patternId);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setState({
      audioElement: null,
      isPlaying: false,
      isLoading: false,
      isLoaded: false,
      volumeMode: 0.2,
      offset: 0,
      patternId: null,
    });
  };

  const actions: BackgroundMusicActions = {
    load,
    play,
    pause,
    stop,
    setVolumeMode,
    setOffset,
    setPlaybackRate,
    remove,
  };

  return [state, actions];
}
```

### 3.3 集成到 useMultiPatternPlayer

**文件**: `src/hooks/useMultiPatternPlayer.ts` (修改)

```typescript
// 在现有的 useMultiPatternPlayer 中集成背景音乐

import { useBackgroundMusic } from './useBackgroundMusic';

export function useMultiPatternPlayer(patterns: Pattern[]) {
  // ... 现有代码 ...

  // 新增:获取当前 Pattern 的背景音乐控制
  const currentPattern = patterns.find(p => p.id === currentPatternId);
  const [bgMusicState, bgMusicActions] = useBackgroundMusic(currentPattern ?? null);

  // 修改播放函数
  const play = useCallback(async () => {
    // ... 现有播放逻辑(鼓声和节拍器)...

    // 新增:播放背景音乐
    if (currentPattern?.backgroundMusic && bgMusicState.isLoaded) {
      const offset = currentPattern.musicOffset ?? 0;
      await bgMusicActions.play(offset);
    }
  }, [/* 现有依赖 */, bgMusicActions, currentPattern, bgMusicState.isLoaded]);

  // 修改暂停函数
  const pause = useCallback(() => {
    // ... 现有暂停逻辑...

    // 新增:暂停背景音乐
    bgMusicActions.pause();
  }, [/* 现有依赖 */, bgMusicActions]);

  // 修改停止函数
  const stop = useCallback(() => {
    // ... 现有停止逻辑...

    // 新增:停止背景音乐
    bgMusicActions.stop();
  }, [/* 现有依赖 */, bgMusicActions]);

  // 修改变速函数
  const setPlaybackRate = useCallback((rateIndex: number) => {
    // ... 现有变速逻辑(鼓声)...

    // 新增:背景音乐同步变速
    const rate = calculateCumulativeRate(rateIndex);
    bgMusicActions.setPlaybackRate(rate);
  }, [/* 现有依赖 */, bgMusicActions]);

  // 新增:循环时重置背景音乐
  useEffect(() => {
    if (currentPattern?.loopRange && isPlaying) {
      const handleLoop = () => {
        const offset = currentPattern.musicOffset ?? 0;
        if (bgMusicState.isPlaying) {
          bgMusicActions.play(offset);
        }
      };

      // 监听循环事件(需要扩展 useMultiPatternPlayer)
      // 具体实现取决于现有的循环机制

      return () => {
        // 清理监听器
      };
    }
  }, [currentPattern?.loopRange, isPlaying, bgMusicState.isPlaying, bgMusicActions]);

  return {
    // ... 现有返回值 ...
    bgMusicState,      // 新增:背景音乐状态
    bgMusicActions,    // 新增:背景音乐操作
  };
}
```

---

## 4. UI 组件设计

### 4.1 背景音乐控制组件

**文件**: `src/components/BackgroundMusicControls/BackgroundMusicControls.tsx`

```typescript
import React, { useState } from 'react';
import { FolderIcon, MusicNoteIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { BackgroundMusicState, BackgroundMusicActions, MusicVolumeMode } from '../../types';
import { FileIconButton } from './FileIconButton';
import { OffsetDisplay } from './OffsetDisplay';
import { VolumeModeButton } from './VolumeModeButton';
import { DeleteIconButton } from './DeleteIconButton';

interface BackgroundMusicControlsProps {
  state: BackgroundMusicState;
  actions: BackgroundMusicActions;
  patternId: string;
}

export function BackgroundMusicControls({
  state,
  actions,
  patternId,
}: BackgroundMusicControlsProps) {
  return (
    <div className="flex items-center gap-2 px-4">
      {/* 左侧:文件选择和偏移量 */}
      <div className="flex items-center gap-2">
        <FileIconButton
          isLoaded={state.isLoaded}
          onLoad={() => actions.load(patternId)}
        />
        {state.isLoaded && (
          <OffsetDisplay
            offset={state.offset}
            onOffsetChange={actions.setOffset}
          />
        )}
      </div>

      {/* 中间:播放按钮占位(实际播放按钮在其他组件) */}
      <div className="flex-1" />

      {/* 右侧:音量和删除 */}
      {state.isLoaded && (
        <div className="flex items-center gap-2">
          <VolumeModeButton
            volumeMode={state.volumeMode}
            onModeChange={actions.setVolumeMode}
          />
          <DeleteIconButton onDelete={actions.remove} />
        </div>
      )}
    </div>
  );
}
```

### 4.2 文件选择按钮

**文件**: `src/components/BackgroundMusicControls/FileIconButton.tsx`

```typescript
import React, { useRef } from 'react';
import { FolderIcon, MusicNoteIcon } from '@heroicons/react/24/heroicons';
import { backgroundMusicStorage } from '../../utils/backgroundMusicStorage';

interface FileIconButtonProps {
  isLoaded: boolean;
  onLoad: () => Promise<void>;
}

export function FileIconButton({ isLoaded, onLoad }: FileIconButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (isLoaded) return;
    inputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件格式
    const validFormats = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];
    if (!validFormats.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
      alert('请选择 MP3、WAV、OGG 或 M4A 格式的音频文件');
      return;
    }

    // 验证文件大小 (20MB)
    if (file.size > 20 * 1024 * 1024) {
      alert('文件大小不能超过 20MB');
      return;
    }

    try {
      // 保存到 IndexedDB
      const record = {
        id: crypto.randomUUID(),
        patternId: '', // 从父组件传入
        filename: file.name,
        blob: file,
        duration: 0, // 需要在加载后获取
        uploadedAt: Date.now(),
        size: file.size,
      };

      await backgroundMusicStorage.save(record);

      // 触发加载
      await onLoad();
    } catch (error) {
      console.error('上传背景音乐失败:', error);
      alert('上传失败,请重试');
    }

    // 重置 input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button
        onClick={handleClick}
        className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        title={isLoaded ? '背景音乐已加载' : '上传背景音乐'}
      >
        {isLoaded ? (
          <MusicNoteIcon className="w-5 h-5 text-green-500" />
        ) : (
          <FolderIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        )}
      </button>
    </>
  );
}
```

### 4.3 偏移量显示和调整

**文件**: `src/components/BackgroundMusicControls/OffsetDisplay.tsx`

```typescript
import React, { useState } from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

interface OffsetDisplayProps {
  offset: number;  // 偏移量(秒),精度 10ms
  onOffsetChange: (offset: number) => void;
}

export function OffsetDisplay({ offset, onOffsetChange }: OffsetDisplayProps) {
  const [showPanel, setShowPanel] = useState(false);

  const formatOffset = (value: number): string => {
    const sign = value >= 0 ? '+' : '-';
    const absValue = Math.abs(value);
    const seconds = Math.floor(absValue);
    const milliseconds = Math.round((absValue - seconds) * 100);
    return `${sign}${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
  };

  const handleAdjust = (delta: number) => {
    const newOffset = Math.max(-10, Math.min(10, offset + delta));
    onOffsetChange(newOffset);
  };

  return (
    <div className="relative">
      {/* 偏移量显示 */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
      >
        <ClockIcon className="w-4 h-4" />
        <span>{formatOffset(offset)}</span>
      </button>

      {/* 快速调整面板 */}
      {showPanel && (
        <div className="absolute bottom-full left-0 mb-2 p-3 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-xs font-medium mb-2">偏移量调整</div>
          <div className="space-y-1">
            <div className="flex gap-2">
              <button onClick={() => handleAdjust(-1)} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                -1s
              </button>
              <button onClick={() => handleAdjust(1)} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                +1s
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleAdjust(-0.1)} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                -0.1s
              </button>
              <button onClick={() => handleAdjust(0.1)} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                +0.1s
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleAdjust(-0.01)} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                -10ms
              </button>
              <button onClick={() => handleAdjust(0.01)} className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">
                +10ms
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4.4 音量模式按钮

**文件**: `src/components/BackgroundMusicControls/VolumeModeButton.tsx`

```typescript
import React from 'react';
import { VolumeOffIcon, VolumeLowIcon, VolumeMediumIcon, VolumeHighIcon } from '@heroicons/react/24/outline';
import type { MusicVolumeMode } from '../../types';

interface VolumeModeButtonProps {
  volumeMode: MusicVolumeMode;
  onModeChange: (mode: MusicVolumeMode) => void;
}

const MODES: MusicVolumeMode[] = [0, 0.2, 0.5, 0.8];
const ICONS = {
  0: VolumeOffIcon,
  0.2: VolumeLowIcon,
  0.5: VolumeMediumIcon,
  0.8: VolumeHighIcon,
};

export function VolumeModeButton({ volumeMode, onModeChange }: VolumeModeButtonProps) {
  const CurrentIcon = ICONS[volumeMode];
  const currentIndex = MODES.indexOf(volumeMode);

  const handleClick = () => {
    const nextIndex = (currentIndex + 1) % MODES.length;
    onModeChange(MODES[nextIndex]);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const prevIndex = (currentIndex - 1 + MODES.length) % MODES.length;
    onModeChange(MODES[prevIndex]);
  };

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
      title={`音乐音量: ${Math.round(volumeMode * 100)}% (左键:下一个,右键:上一个)`}
    >
      <CurrentIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
    </button>
  );
}
```

### 4.5 删除按钮

**文件**: `src/components/BackgroundMusicControls/DeleteIconButton.tsx`

```typescript
import React, { useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

interface DeleteIconButtonProps {
  onDelete: () => Promise<void>;
}

export function DeleteIconButton({ onDelete }: DeleteIconButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClick = () => {
    if (!showConfirm) {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000); // 3秒后自动隐藏
      return;
    }

    onDelete();
    setShowConfirm(false);
  };

  return (
    <button
      onClick={handleClick}
      className={`p-2 rounded transition ${
        showConfirm
          ? 'bg-red-500 text-white hover:bg-red-600'
          : 'hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
      title={showConfirm ? '确认删除?' : '删除背景音乐'}
    >
      <TrashIcon className="w-5 h-5" />
    </button>
  );
}
```

---

## 5. 响应式设计

### 5.1 移动端适配 (≤375px)

```css
/* 移动端特定样式 */
@media (max-width: 375px) {
  .background-music-controls {
    padding: 0 8px;
    gap: 8px;
  }

  .background-music-controls button {
    padding: 8px;
  }

  .offset-display {
    font-size: 12px;
  }

  .offset-panel {
    width: 200px;
  }
}
```

### 5.2 布局断点

```tsx
// 响应式间距
<div className={cn(
  "flex items-center gap-2",
  "px-4",           // 默认
  "sm:px-6",        // ≥640px
  "md:gap-4",       // ≥768px
)}>
  {/* 控件 */}
</div>
```

---

## 6. 测试策略

### 6.1 单元测试

**文件**: `src/hooks/__tests__/useBackgroundMusic.test.ts`

```typescript
import { renderHook, act } from '@testing-library/react';
import { useBackgroundMusic } from '../useBackgroundMusic';

describe('useBackgroundMusic', () => {
  it('should load background music', async () => {
    const pattern = {
      id: 'test-pattern',
      backgroundMusic: {
        id: 'test-music',
        filename: 'test.mp3',
        duration: 180,
        uploadedAt: Date.now(),
      },
    };

    const { result } = renderHook(() => useBackgroundMusic(pattern));

    expect(result.current[0].isLoading).toBe(true);

    await act(async () => {
      await result.current[1].load('test-pattern');
    });

    expect(result.current[0].isLoaded).toBe(true);
  });

  it('should play with offset', async () => {
    // ... 测试播放逻辑
  });

  it('should adjust offset in 10ms precision', () => {
    // ... 测试偏移量调整
  });
});
```

### 6.2 集成测试

**测试同步播放**:
```typescript
describe('Background Music Sync', () => {
  it('should play drums and background music together', async () => {
    // 测试鼓声和背景音乐同时播放
  });

  it('should pause both tracks together', () => {
    // 测试同步暂停
  });

  it('should loop background music with pattern', () => {
    // 测试循环同步
  });
});
```

### 6.3 手动测试清单

- [ ] 上传 MP3 文件成功
- [ ] 上传 WAV 文件成功
- [ ] 上传错误格式被拒绝
- [ ] 上传超大文件(>20MB)被拒绝
- [ ] 播放时背景音乐与鼓点同步
- [ ] 暂停时背景音乐同步暂停
- [ ] 停止时背景音乐重置
- [ ] 变速时背景音乐同步变速
- [ ] 变速时音高保持不变
- [ ] 偏移量调整精度 10ms
- [ ] 循环时背景音乐同步重置
- [ ] 音量模式切换流畅
- [ ] 删除背景音乐成功
- [ ] 移动端(375px)布局正常

---

## 7. 性能优化

### 7.1 懒加载

```typescript
// 仅在 Pattern 有背景音乐时才加载音频元素
useEffect(() => {
  if (!pattern?.backgroundMusic) {
    // 清理
    return;
  }

  // 加载音频
  loadAudio(pattern.backgroundMusic);
}, [pattern?.backgroundMusic]);
```

### 7.2 内存管理

```typescript
// 组件卸载时释放资源
useEffect(() => {
  return () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
      audioElement = null;
    }
  };
}, []);
```

### 7.3 IndexedDB 优化

```typescript
// 使用索引加速查询
const index = store.index('patternId');
const request = index.get(patternId);
```

---

## 8. 可选降级方案 (Tone.js)

### 8.1 何时切换

如果 Phase 0 验证发现 HTML5 Audio 同步精度 ≥ 50ms,则切换到 Tone.js 方案。

### 8.2 实现差异

**使用 Tone.js 的代码**:

```typescript
import { Player } from 'tone';

// 创建播放器
const player = new Player({
  url: audioBuffer,
  loop: false,
  volume: -6,
  playbackRate: 1.0,
});

// 连接到输出
player.connect(getAudioContext().destination);

// 播放(精确调度)
player.start(0, offset, duration);

// 变速保调
player.playbackRate = 0.7;
```

**优点**:
- 精确的时序控制(Web Audio API)
- 变速保调效果好

**缺点**:
- 引入 150KB 依赖
- 需要异步加载 Tone.js

### 8.3 动态导入

```typescript
// 仅在需要时加载 Tone.js
const loadToneJs = async () => {
  const tone = await import('tone');
  return tone;
};
```

---

## 9. 部署清单

### 9.1 新增文件

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
└── types/
    └── index.ts (修改)
```

### 9.2 修改文件

```
src/
├── hooks/
│   └── useMultiPatternPlayer.ts (集成背景音乐)
└── components/
    └── [播放控制组件].tsx (添加 BackgroundMusicControls)
```

### 9.3 依赖

**HTML5 Audio 方案** (优先):
- 无需新增依赖

**Tone.js 方案** (可选):
```bash
bun add tone
```

---

## 10. 附录

### 10.1 浏览器兼容性

| 特性 | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| HTML5 Audio | ✅ 90+ | ✅ 88+ | ✅ 14+ | ✅ 90+ |
| preservesPitch | ✅ 90+ | ✅ 88+ | ✅ 14+ | ✅ 90+ |
| IndexedDB | ✅ 90+ | ✅ 88+ | ✅ 14+ | ✅ 90+ |
| Tone.js (可选) | ✅ 90+ | ✅ 88+ | ✅ 14+ | ✅ 90+ |

### 10.2 相关文档

- [HTML5 Audio 规范](https://html.spec.whatwg.org/multipage/media.html)
- [IndexedDB 规范](https://w3c.github.io/IndexedDB/)
- [Tone.js 文档](https://tonejs.github.io/)
- 现有代码: [src/utils/audioEngine.ts](../../src/utils/audioEngine.ts)
- 现有代码: [src/hooks/useMultiPatternPlayer.ts](../../src/hooks/useMultiPatternPlayer.ts)

---

**变更历史**:
- 2026-01-21: 初始版本创建
