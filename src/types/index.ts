// 鼓件类型（按标准鼓谱顺序从上到下）
export type DrumType =
  | "Crash 1" // 高音镲片1
  | "Crash 2" // 高音镲片2
  | "Ride" // 叮叮镲片
  | "Hi-Hat Open" // 踩镲（开合）
  | "Hi-Hat Closed" // 踩镲（闭合）
  | "Snare" // 军鼓
  | "Tom 1" // 一嗵鼓（高音）
  | "Tom 2" // 二嗵鼓（中音）
  | "Tom 3" // 三嗵鼓（低音）
  | "Kick"; // 底鼓

// 拍号类型
export type TimeSignature = [number, number]; // [beatsPerBar, noteValue]

// 循环范围（单个 pattern 内）
export type LoopRange = [number, number]; // [startBar, endBar]

// 跨 Pattern 循环范围
export interface CrossPatternLoop {
  startPatternName: string; // pattern 名称 (A, B, C...)
  startBar: number;         // 0-based 小节索引
  endPatternName: string;
  endBar: number;
}

// 单元格状态：0=未激活, 1=正常, 2=鬼音
export type CellState = 0 | 1 | 2;
export const CELL_OFF = 0 as const;
export const CELL_NORMAL = 1 as const;
export const CELL_GHOST = 2 as const;

// 节奏型接口
export interface Pattern {
  id: string;
  name: string;
  bpm: number;
  timeSignature: TimeSignature; // 默认 [4, 4]
  bars: number; // 小节数，默认2
  grid: CellState[][]; // [drumIndex][beatIndex] - 0=未激活, 1=正常, 2=鬼音
  drums: DrumType[]; // 鼓件列表（固定顺序）
  loopRange?: LoopRange; // 循环播放范围，可选
  createdAt: number; // 创建时间戳
  updatedAt: number; // 更新时间戳
}

// 存储数据结构
export interface StorageData {
  patterns: Pattern[];
  currentPatternId?: string;
  settings?: {
    defaultBPM: number;
    defaultTimeSignature: TimeSignature;
  };
}
