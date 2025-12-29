import type { DrumType, TimeSignature } from "../types";
export declare const DRUMS: DrumType[];
export declare const DEFAULT_BPM = 120;
export declare const DEFAULT_TIME_SIGNATURE: TimeSignature;
export declare const DEFAULT_BARS = 2;
export declare const MIN_BPM = 40;
export declare const MAX_BPM = 200;
export declare const SUBDIVISIONS_PER_BEAT = 4;
export declare const DRUM_NOTATION: Record<DrumType, {
    position: "above" | "center" | "below";
    symbol: "x" | "o" | "●" | "○";
    line: number;
}>;
export declare const THEME_COLOR = "#282a36";
