import type { Pattern, DrumType, CellState } from "../types";
import {
  CELL_OFF,
  CELL_DOUBLE_32,
  CELL_FIRST_32,
  CELL_SECOND_32,
} from "../types";
import { SUBDIVISIONS_PER_BEAT } from "./constants";
import {
  pickLargestDurationToken,
  splitGapIntoDurationTokens,
  type VexflowDurationToken,
} from "./vexflowDurations";

export const DRUM_TO_VEXFLOW: Record<
  DrumType,
  {
    keys: string[];
    isLowerVoice: boolean;
  }
> = {
  "Crash 1": { keys: ["b/5"], isLowerVoice: false },
  "Crash 2": { keys: ["a/5"], isLowerVoice: false },
  "Hi-Hat Open": { keys: ["g/5"], isLowerVoice: false },
  "Hi-Hat Closed": { keys: ["g/5"], isLowerVoice: false },
  Ride: { keys: ["f/5"], isLowerVoice: false },
  "Tom 1": { keys: ["e/5"], isLowerVoice: false },
  "Tom 2": { keys: ["d/5"], isLowerVoice: false },
  Snare: { keys: ["c/5"], isLowerVoice: false },
  "Tom 3": { keys: ["a/4"], isLowerVoice: false },
  Kick: { keys: ["f/4"], isLowerVoice: true },
};

export interface VexflowNoteEvent {
  subdivision: number;
  subPosition: 0 | 1;
  drums: {
    drum: DrumType;
    cellState: CellState;
  }[];
  is32nd: boolean;
}

/**
 * 将 Pattern grid 转换为 VexFlow 事件列表（按上下声部分离）。
 */
export function patternToVexflowNoteEvents(pattern: Pattern): {
  upperVoice: VexflowNoteEvent[];
  lowerVoice: VexflowNoteEvent[];
} {
  const upperEvents: VexflowNoteEvent[] = [];
  const lowerEvents: VexflowNoteEvent[] = [];

  const [beatsPerBar] = pattern.timeSignature;
  const totalSubdivisions = pattern.bars * beatsPerBar * SUBDIVISIONS_PER_BEAT;

  for (let sub = 0; sub < totalSubdivisions; sub++) {
    const upperDrumsPos0: { drum: DrumType; cellState: CellState }[] = [];
    const upperDrumsPos1: { drum: DrumType; cellState: CellState }[] = [];
    const lowerDrumsPos0: { drum: DrumType; cellState: CellState }[] = [];
    const lowerDrumsPos1: { drum: DrumType; cellState: CellState }[] = [];
    let has32ndUpper = false;
    let has32ndLower = false;

    pattern.drums.forEach((drum, drumIndex) => {
      const cellState = pattern.grid[drumIndex]?.[sub] ?? CELL_OFF;
      if (cellState === CELL_OFF) return;

      const isLower = DRUM_TO_VEXFLOW[drum].isLowerVoice;
      const targetPos0 = isLower ? lowerDrumsPos0 : upperDrumsPos0;
      const targetPos1 = isLower ? lowerDrumsPos1 : upperDrumsPos1;

      if (cellState === CELL_DOUBLE_32) {
        targetPos0.push({ drum, cellState });
        targetPos1.push({ drum, cellState });
        if (isLower) has32ndLower = true;
        else has32ndUpper = true;
      } else if (cellState === CELL_FIRST_32) {
        targetPos0.push({ drum, cellState });
        if (isLower) has32ndLower = true;
        else has32ndUpper = true;
      } else if (cellState === CELL_SECOND_32) {
        targetPos1.push({ drum, cellState });
        if (isLower) has32ndLower = true;
        else has32ndUpper = true;
      } else {
        targetPos0.push({ drum, cellState });
      }
    });

    if (upperDrumsPos0.length > 0) {
      upperEvents.push({
        subdivision: sub,
        subPosition: 0,
        drums: upperDrumsPos0,
        is32nd: has32ndUpper,
      });
    }
    if (upperDrumsPos1.length > 0) {
      upperEvents.push({
        subdivision: sub,
        subPosition: 1,
        drums: upperDrumsPos1,
        is32nd: true,
      });
    }
    if (lowerDrumsPos0.length > 0) {
      lowerEvents.push({
        subdivision: sub,
        subPosition: 0,
        drums: lowerDrumsPos0,
        is32nd: has32ndLower,
      });
    }
    if (lowerDrumsPos1.length > 0) {
      lowerEvents.push({
        subdivision: sub,
        subPosition: 1,
        drums: lowerDrumsPos1,
        is32nd: true,
      });
    }
  }

  return { upperVoice: upperEvents, lowerVoice: lowerEvents };
}

export type BarTimelineItem =
  | {
      kind: "note";
      event: VexflowNoteEvent;
      startUnits32InBar: number;
      durationToken: VexflowDurationToken;
      durationUnits32: number;
    }
  | {
      kind: "rest";
      startUnits32InBar: number;
      durationToken: VexflowDurationToken;
      durationUnits32: number;
    };

export interface BuildBarTimelineOptions {
  /**
   * 小节完全空白时是否生成“整小节休止符”。
   * 默认 true（避免谱面空白）。
   */
  includeFullBarRestWhenEmpty?: boolean;
  /**
   * 是否省略小节尾部休止符（最后一个音符之后的空白）。
   * 默认 true（减少尾部休止符）。
   */
  omitTailRests?: boolean;
  /**
   * 单个音符时值最多覆盖的小节长度比例（休止符允许跨段）。
   * 例如 0.25 表示“不要跨 1/4 小节边界”（默认）。
   *
   * 目前只支持 0.25（因为该项目的排版目标是按 1/4 小节分段，避免音符跨段造成大量补休止符）。
   */
  maxSpanBarFraction?: 0.25;
}

/**
 * 将一个小节内的 events（subdivision 已经是小节内相对位置）构建成时间线：
 * - 事件之间：音符尽可能用大时值
 * - 空档：休止符尽可能用大时值
 *
 * 以 32 分音符作为最小单位进行计算（16 分=2 units）。
 */
export function buildBarTimeline(
  events: VexflowNoteEvent[],
  totalSubdivisionsInBar: number,
  options: BuildBarTimelineOptions = {}
): BarTimelineItem[] {
  const includeFullBarRestWhenEmpty = options.includeFullBarRestWhenEmpty ?? true;
  const omitTailRests = options.omitTailRests ?? true;
  const maxSpanBarFraction = options.maxSpanBarFraction ?? 0.25;

  const totalUnits32 = totalSubdivisionsInBar * 2;
  const maxSpanUnits32 =
    maxSpanBarFraction === 0.25 ? totalUnits32 / 4 : totalUnits32;
  const sorted = [...events].sort((a, b) => {
    if (a.subdivision !== b.subdivision) return a.subdivision - b.subdivision;
    return a.subPosition - b.subPosition;
  });

  const getStartUnits32 = (e: VexflowNoteEvent) =>
    e.subdivision * 2 + e.subPosition;

  const result: BarTimelineItem[] = [];
  let cursorUnits32 = 0;

  const getRemainingInSpan = (posUnits32: number) => {
    if (maxSpanUnits32 <= 0) return 1;
    const mod = posUnits32 % maxSpanUnits32;
    return mod === 0 ? maxSpanUnits32 : maxSpanUnits32 - mod;
  };

  if (sorted.length === 0) {
    if (!includeFullBarRestWhenEmpty) return result;
    const restTokens = splitGapIntoDurationTokens(totalUnits32);
    for (const token of restTokens) {
      result.push({
        kind: "rest",
        startUnits32InBar: cursorUnits32,
        durationToken: token,
        durationUnits32: token.units32,
      });
      cursorUnits32 += token.units32;
    }
    return result;
  }

  for (let i = 0; i < sorted.length; i++) {
    const event = sorted[i]!;
    const startUnits32 = getStartUnits32(event);
    const nextStartUnits32 =
      i + 1 < sorted.length ? getStartUnits32(sorted[i + 1]!) : totalUnits32;

    // gap before this event => rests
    if (startUnits32 > cursorUnits32) {
      const gap = startUnits32 - cursorUnits32;
      const restTokens = splitGapIntoDurationTokens(gap);
      for (const token of restTokens) {
        result.push({
          kind: "rest",
          startUnits32InBar: cursorUnits32,
          durationToken: token,
          durationUnits32: token.units32,
        });
        cursorUnits32 += token.units32;
      }
    }

    cursorUnits32 = Math.max(cursorUnits32, startUnits32);

    // choose largest note duration within [start, nextStart)
    const gapToNext = Math.max(1, nextStartUnits32 - startUnits32);
    const remainingInSpan = getRemainingInSpan(startUnits32);
    const maxNoteGap = Math.max(1, Math.min(gapToNext, remainingInSpan));
    const noteToken = pickLargestDurationToken(maxNoteGap);
    result.push({
      kind: "note",
      event,
      startUnits32InBar: startUnits32,
      durationToken: noteToken,
      durationUnits32: noteToken.units32,
    });
    cursorUnits32 = startUnits32 + noteToken.units32;

    // leftover gap after this note before next event => rests
    const isLastEvent = i + 1 >= sorted.length;
    if (!isLastEvent && cursorUnits32 < nextStartUnits32) {
      const leftover = nextStartUnits32 - cursorUnits32;
      const restTokens = splitGapIntoDurationTokens(leftover);
      for (const token of restTokens) {
        result.push({
          kind: "rest",
          startUnits32InBar: cursorUnits32,
          durationToken: token,
          durationUnits32: token.units32,
        });
        cursorUnits32 += token.units32;
      }
    }

    // tail gap: keep previous behavior (omit by default)
    if (isLastEvent && !omitTailRests && cursorUnits32 < totalUnits32) {
      const tail = totalUnits32 - cursorUnits32;
      const restTokens = splitGapIntoDurationTokens(tail);
      for (const token of restTokens) {
        result.push({
          kind: "rest",
          startUnits32InBar: cursorUnits32,
          durationToken: token,
          durationUnits32: token.units32,
        });
        cursorUnits32 += token.units32;
      }
    }
  }

  return result;
}

