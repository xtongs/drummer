import type { DrumType, TimeSignature } from "../types";

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
export const DEFAULT_BARS = 1;
export const MIN_BPM = 40;
export const MAX_BPM = 200;

// 16分音符细分（每拍4个格子）
export const SUBDIVISIONS_PER_BEAT = 4;

// 网格单元格大小（像素），调整以确保第一小节在375px宽度下完整显示
export const GRID_CELL_SIZE = 23;

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

// 主题颜色（与 CSS 变量 --theme-color 保持一致）
export const THEME_COLOR = "#282a36";
