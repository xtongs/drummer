// 鼓件列表（按标准鼓谱顺序）
export var DRUMS = [
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
export var DEFAULT_BPM = 120;
export var DEFAULT_TIME_SIGNATURE = [4, 4];
export var DEFAULT_BARS = 2;
export var MIN_BPM = 40;
export var MAX_BPM = 200;
// 16分音符细分（每拍4个格子）
export var SUBDIVISIONS_PER_BEAT = 4;
// 鼓谱符号映射
export var DRUM_NOTATION = {
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
export var THEME_COLOR = "#282a36";
