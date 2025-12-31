import type { DrumType, TimeSignature } from "../types";

// 鼓件列表（按标准鼓谱顺序，从上到下）
export const DRUMS: DrumType[] = [
  "Crash 1",
  "Crash 2",
  "Hi-Hat Open",
  "Hi-Hat Closed",
  "Ride",
  "Tom 1", // 一嗵（高音）
  "Tom 2", // 二嗵（中音）
  "Snare",
  "Tom 3", // 三嗵（低音）
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

// 网格单元格基准大小（像素）
// 实际使用动态计算的值，参见 useGridCellSize hook
// 以 393px 宽度下 cellSize = 23px 为基准，最大容器宽度 500px
export const GRID_CELL_SIZE = 23;

// 鼓谱符号映射
// 位置说明：五线谱从上到下5条线，中间线（第3条）为0
// line: -2=第1条线, -1=第2条线, 0=第3条线, 1=第4条线, 2=第5条线
// 线间位置：-1.5=第1-2线间, -0.5=第2-3线间, 0.5=第3-4线间, 1.5=第4-5线间
export const DRUM_NOTATION: Record<
  DrumType,
  {
    position: "above" | "center" | "below";
    symbol: "x" | "o" | "●" | "○";
    line: number; // 相对中间线的位置（可以是小数，表示线间位置）
  }
> = {
  "Crash 1": { position: "above", symbol: "x", line: -2.5 }, // 第一条线上方半个间距 X
  "Crash 2": { position: "above", symbol: "o", line: -2 }, // 第一条线上 O
  "Hi-Hat Open": { position: "above", symbol: "o", line: -1.5 }, // 第一线和第二线之间 O
  "Hi-Hat Closed": { position: "above", symbol: "x", line: -1.5 }, // 第一线和第二线间 X
  Ride: { position: "above", symbol: "x", line: -1 }, // 第二线上 X
  "Tom 1": { position: "center", symbol: "●", line: -0.5 }, // 第二和第三线间 实心O
  "Tom 2": { position: "center", symbol: "●", line: 0 }, // 第三线上 实心O
  Snare: { position: "center", symbol: "●", line: 0.5 }, // 第三线和第四线间 实心O
  "Tom 3": { position: "below", symbol: "●", line: 1.5 }, // 第四和第五线间 实心O
  Kick: { position: "below", symbol: "●", line: 2.5 }, // 第五线下 实心O（往下挪一半间距）
};

// 主题颜色（与 CSS 变量 --theme-color 保持一致）
export const THEME_COLOR = "#282a36";
