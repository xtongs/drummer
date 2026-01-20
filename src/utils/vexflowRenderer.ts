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
 * 添加倚音标注
 */
export function addGraceNoteAnnotation(
  note: StaveNote,
  graceDrums?: Array<{ drum: DrumType }>,
): void {
  if (!graceDrums || graceDrums.length === 0) {
    return;
  }

  const annotation = new Annotation("♪");
  annotation.setVerticalJustification(Annotation.VerticalJustify.TOP);
  annotation.setJustification(Annotation.HorizontalJustify.CENTER_STEM);
  annotation.setFont("", 15, "normal");
  annotation.setXShift(10);
  annotation.setYShift(43);
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

  if (event.kind === "ghost") {
    (note as unknown as { _isGhost: boolean })._isGhost = true;
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
