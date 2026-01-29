import { StaveNote, Dot, Annotation, type StaveNoteStruct } from "vexflow";
import {
  DRUM_TO_VEXFLOW,
  type VexflowNoteEvent,
  buildBarTimeline,
} from "./vexflowNotation";
import type { VexflowDurationToken } from "./vexflowDurations";
import type { DrumType } from "../types";

/**
 * 音符/休止符元信息
 */
export interface NoteWithMeta {
  note: StaveNote;
  event: VexflowNoteEvent;
  isRest: boolean;
  startUnits32InBar?: number;
  durationUnits32?: number;
}

/**
 * 获取 VexFlow StaveNote 的现有 x 偏移
 */
export function getExistingXShift(note: StaveNote): number {
  const anyNote = note as unknown as {
    getXShift?: () => number | undefined;
    x_shift?: number;
  };
  const xShift = anyNote.getXShift?.();
  if (typeof xShift === "number") return xShift;
  if (typeof anyNote.x_shift === "number") return anyNote.x_shift;
  return 0;
}

/**
 * 安全地为音符添加附点
 */
export function addDotToAllSafe(note: StaveNote): void {
  const anyDot = Dot as unknown as {
    buildAndAttach?: (notes: unknown[], options?: { all?: boolean }) => void;
  };
  if (typeof anyDot.buildAndAttach === "function") {
    anyDot.buildAndAttach([note], { all: true });
  }
}

/**
 * 计算音符的固定 x 坐标（与 grid cell 对齐）
 */
export function getFixedX(
  subdivision: number,
  subPosition: 0 | 1,
  cellWidth: number,
  barStartSub: number,
  is32nd: boolean,
  restDuration?: 4 | 8 | 16,
): number {
  const localSub = subdivision - barStartSub;

  if (restDuration) {
    if (restDuration === 4) {
      return (localSub + 1.5) * cellWidth + cellWidth / 2;
    } else if (restDuration === 8) {
      return (localSub + 0.5) * cellWidth + cellWidth / 2;
    }
  }

  const baseX = localSub * cellWidth + cellWidth / 2;

  if (!is32nd) {
    return baseX;
  }

  const offset = cellWidth * 0.22;
  return subPosition === 0 ? baseX - offset : baseX + offset;
}

/**
 * 添加 Hi-Hat Open 标注
 */
export function addHiHatOpenAnnotation(
  note: StaveNote,
  drums: DrumType[],
): void {
  if (!drums.includes("Hi-Hat Open")) {
    return;
  }

  const annotation = new Annotation("○");
  annotation.setVerticalJustification(Annotation.VerticalJustify.TOP);
  annotation.setJustification(Annotation.HorizontalJustify.CENTER_STEM);
  annotation.setFont("", 5, 900);
  annotation.setXShift(-11);
  annotation.setYShift(36);
  note.addModifier(annotation, 0);
}

/**
 * 根据鼓件类型计算倚音标注的垂直偏移
 * 不同鼓件在五线谱上的位置不同，需要对应调整倚音位置
 */
function getGraceNoteYShift(drum: DrumType): number {
  // 基准位置（军鼓 c/5）
  const baseShift = -55;
  // 半音符行高
  const lineHeight = 5;

  // 根据鼓件在五线谱上的音高位置调整偏移
  // 音高越高，偏移越大（向下移动）
  const yOffsets: Record<DrumType, number> = {
    "Crash 1": baseShift - lineHeight * 6, // b/5 - 最高
    "Crash 2": baseShift - lineHeight * 5, // a/5
    "Hi-Hat Open": baseShift - lineHeight * 4, // g/5
    "Hi-Hat Closed": baseShift - lineHeight * 4, // g/5
    Ride: baseShift - lineHeight * 3, // f/5
    "Tom 1": baseShift - lineHeight * 2, // e/5
    "Tom 2": baseShift - lineHeight * 1, // d/5
    Snare: baseShift, // c/5 - 基准
    "Tom 3": baseShift + lineHeight * 2, // a/4
    Kick: baseShift, // f/4 - 最低
  };

  return yOffsets[drum] ?? baseShift;
}

/**
 * 添加倚音标注
 */
export function addGraceNoteAnnotation(
  note: StaveNote,
  graceDrums?: Array<{ drum: DrumType }>,
): void {
  if (!graceDrums || graceDrums.length === 0) {
    return;
  }

  // 使用第一个倚音鼓件的位置（通常只有一个倚音）
  const drum = graceDrums[0]!.drum;
  const yShift = getGraceNoteYShift(drum);

  const annotation = new Annotation("♪");
  annotation.setVerticalJustification(Annotation.VerticalJustify.BOTTOM);
  annotation.setJustification(Annotation.HorizontalJustify.CENTER_STEM);
  annotation.setFont("", 15, "normal");
  annotation.setXShift(drum === "Kick" ? 0 : 10);
  annotation.setYShift(yShift);
  note.addModifier(annotation, 0);
}

/**
 * 创建 VexFlow StaveNote
 */
export function createStaveNote(
  event: VexflowNoteEvent,
  isLowerVoice: boolean,
  durationToken: VexflowDurationToken,
): StaveNote {
  const allKeys: string[] = [];
  let hasXNoteHead: boolean | undefined;

  for (const { drum } of event.drums) {
    const mapping = DRUM_TO_VEXFLOW[drum];
    allKeys.push(...mapping.keys);
    hasXNoteHead = mapping.keys.some((key) => key.includes("x"));
  }

  const noteStruct: StaveNoteStruct = {
    keys: allKeys,
    duration: String(durationToken.base),
    clef: "percussion",
    stemDirection: isLowerVoice ? -1 : 1,
  };

  const note = new StaveNote(noteStruct);
  if (durationToken.dots === 1) addDotToAllSafe(note);

  // 标记每个鼓的 ghost 状态（按索引顺序对应 allKeys）
  const ghostDrums = event.drums
    .filter((d) => d.kind === "ghost")
    .map((d) => d.drum);
  if (ghostDrums.length > 0) {
    (note as unknown as { _ghostDrums: DrumType[] })._ghostDrums = ghostDrums;
  }

  if (hasXNoteHead && !isLowerVoice) {
    const stem = note.getStem();
    if (stem) {
      stem.setOptions({ stemUpYOffset: 4 });
    }
  }

  addHiHatOpenAnnotation(
    note,
    event.drums.map((d) => d.drum),
  );
  addGraceNoteAnnotation(note, event.graceDrums);

  return note;
}

/**
 * 创建休止符
 */
export function createRestNote(
  durationToken: VexflowDurationToken,
  isLowerVoice: boolean,
): StaveNote {
  const durationStr = `${durationToken.base}r`;
  const keys = isLowerVoice ? ["f/4"] : ["c/5"];

  const note = new StaveNote({
    keys,
    duration: durationStr,
    clef: "percussion",
    stemDirection: isLowerVoice ? -1 : 1,
  });
  if (durationToken.dots === 1) addDotToAllSafe(note);
  return note;
}

/**
 * 构建小节内的音符和休止符列表
 */
export function buildBarTickables(
  events: VexflowNoteEvent[],
  totalSubdivisionsInBar: number,
  isLowerVoice: boolean,
): NoteWithMeta[] {
  const timeline = buildBarTimeline(events, totalSubdivisionsInBar, {
    includeFullBarRestWhenEmpty: true,
    omitTailRests: false,
    maxSpanBarFraction: 0.25,
  });

  // 如果所有项目都是休止符，返回空数组（不显示）
  const hasNote = timeline.some((item) => item.kind === "note");
  if (!hasNote) {
    return [];
  }

  return timeline.map((item) => {
    if (item.kind === "note") {
      return {
        note: createStaveNote(item.event, isLowerVoice, item.durationToken),
        event: item.event,
        isRest: false,
        startUnits32InBar: item.startUnits32InBar,
        durationUnits32: item.durationUnits32,
      };
    }

    const startUnits32 = item.startUnits32InBar;
    const restEvent: VexflowNoteEvent = {
      subdivision: Math.floor(startUnits32 / 2),
      subPosition: (startUnits32 % 2) as 0 | 1,
      drums: [],
      is32nd: startUnits32 % 2 === 1,
      kind: "normal",
    };
    return {
      note: createRestNote(item.durationToken, isLowerVoice),
      event: restEvent,
      isRest: true,
      startUnits32InBar: item.startUnits32InBar,
      durationUnits32: item.durationUnits32,
    };
  });
}

/**
 * 判断音符是否可以用符杠连接（八分音符及更短）
 */
export function isBeamable(note: StaveNote): boolean {
  const raw = note.getDuration();
  const numeric = Number.parseInt(raw.replace("r", ""), 10);
  return Number.isFinite(numeric) && numeric >= 8;
}

/**
 * 按 1/4 小节分组音符（用于符杠连接）
 */
export function groupByQuarterBar(
  items: NoteWithMeta[],
  barStartSub: number,
  barSubdivisions: number,
): StaveNote[][] {
  const barUnits32 = barSubdivisions * 2;
  const quarterUnits32 = Math.max(1, Math.floor(barUnits32 / 4));
  const groups: StaveNote[][] = [[], [], [], []];

  for (const item of items) {
    if (!isBeamable(item.note)) continue;
    const startUnits32 =
      item.startUnits32InBar ??
      (item.event.subdivision - barStartSub) * 2 + item.event.subPosition;
    const idx = Math.min(
      3,
      Math.max(0, Math.floor(startUnits32 / quarterUnits32)),
    );
    groups[idx]!.push(item.note);
  }
  return groups.filter((g) => g.length > 0);
}

/**
 * 检查音符列表中是否包含十六分音符或更短的音符
 */
export function hasSixteenthOrShorter(items: NoteWithMeta[]): boolean {
  for (const item of items) {
    if (item.isRest) continue;
    const duration = item.note.getDuration();
    const numeric = Number.parseInt(duration.replace(/[rd]/g, ""), 10);
    // 16 表示十六分音符，更大的数字表示更短的音符
    if (numeric >= 16) {
      return true;
    }
  }
  return false;
}

/**
 * 按半小节检查是否有十六分音符
 * @param items 音符列表
 * @param barSubdivisions 小节内的细分数量（16 = 4/4拍）
 * @returns [前半小节是否有十六分, 后半小节是否有十六分]
 */
export function hasSixteenthByHalfBar(
  items: NoteWithMeta[],
  barSubdivisions: number,
): [boolean, boolean] {
  const barUnits32 = barSubdivisions * 2;
  const halfUnits32 = Math.floor(barUnits32 / 2);

  let firstHalfHasSixteenth = false;
  let secondHalfHasSixteenth = false;

  for (const item of items) {
    if (item.isRest) continue;

    const duration = item.note.getDuration();
    const numeric = Number.parseInt(duration.replace(/[rd]/g, ""), 10);

    if (numeric >= 16) {
      const startUnits32 =
        item.startUnits32InBar ??
        item.event.subdivision * 2 + item.event.subPosition;

      if (startUnits32 < halfUnits32) {
        firstHalfHasSixteenth = true;
      } else {
        secondHalfHasSixteenth = true;
      }
    }
  }

  return [firstHalfHasSixteenth, secondHalfHasSixteenth];
}

/**
 * 将音符按半小节分组
 */
export function splitNotesByHalfBar(
  items: NoteWithMeta[],
  barSubdivisions: number,
): [NoteWithMeta[], NoteWithMeta[]] {
  const barUnits32 = barSubdivisions * 2;
  const halfUnits32 = Math.floor(barUnits32 / 2);

  const firstHalf: NoteWithMeta[] = [];
  const secondHalf: NoteWithMeta[] = [];

  for (const item of items) {
    const startUnits32 =
      item.startUnits32InBar ??
      item.event.subdivision * 2 + item.event.subPosition;

    if (startUnits32 < halfUnits32) {
      firstHalf.push(item);
    } else {
      secondHalf.push(item);
    }
  }

  return [firstHalf, secondHalf];
}

/**
 * 计算休止符的目标 X 坐标
 */
export function getRestTargetX(
  startUnits32InBar: number,
  durationUnits32: number,
  cellWidth: number,
): number {
  const centerUnits32 = startUnits32InBar + durationUnits32 / 2;
  const centerSub = centerUnits32 / 2;
  return centerSub * cellWidth - (cellWidth / 4) * 1.2;
}

/**
 * 将音符按拍子分组（防止跨拍符杠连接）
 * @param items 音符列表
 * @param barSubdivisions 小节内的细分数量（16 = 4/4拍）
 * @param beatsPerBar 每小节的拍数（4 = 4/4拍）
 * @returns 按拍子分组的音符数组，每个元素代表一拍的音符
 */
export function splitNotesByBeat(
  items: NoteWithMeta[],
  barSubdivisions: number,
  beatsPerBar: number,
): NoteWithMeta[][] {
  const barUnits32 = barSubdivisions * 2;
  const beatUnits32 = Math.floor(barUnits32 / beatsPerBar);

  const result: NoteWithMeta[][] = Array.from(
    { length: beatsPerBar },
    () => [],
  );

  for (const item of items) {
    const startUnits32 =
      item.startUnits32InBar ??
      item.event.subdivision * 2 + item.event.subPosition;

    // 计算音符所属的拍子索引
    const beatIndex = Math.floor(startUnits32 / beatUnits32);

    // 确保索引在有效范围内
    if (beatIndex >= 0 && beatIndex < beatsPerBar) {
      result[beatIndex]!.push(item);
    }
  }

  // 过滤掉空拍
  return result.filter((beatNotes) => beatNotes.length > 0);
}
