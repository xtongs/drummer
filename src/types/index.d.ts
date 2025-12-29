export type DrumType = "Crash 1" | "Crash 2" | "Ride" | "Hi-Hat Open" | "Hi-Hat Closed" | "Snare" | "Tom 3" | "Tom 2" | "Tom 1" | "Kick";
export type TimeSignature = [number, number];
export type LoopRange = [number, number];
export interface Pattern {
    id: string;
    name: string;
    bpm: number;
    timeSignature: TimeSignature;
    bars: number;
    grid: boolean[][];
    drums: DrumType[];
    loopRange?: LoopRange;
    createdAt: number;
    updatedAt: number;
}
export interface StorageData {
    patterns: Pattern[];
    currentPatternId?: string;
    settings?: {
        defaultBPM: number;
        defaultTimeSignature: TimeSignature;
    };
}
