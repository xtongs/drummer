// 鼓件类型（按标准鼓谱顺序从上到下）
export type DrumType =
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
export type TimeSignature = [number, number]; // [beatsPerBar, noteValue]

// 循环范围
export type LoopRange = [number, number]; // [startBar, endBar]

// 节奏型接口
export interface Pattern {
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
export interface StorageData {
  patterns: Pattern[];
  currentPatternId?: string;
  settings?: {
    defaultBPM: number;
    defaultTimeSignature: TimeSignature;
  };
}

