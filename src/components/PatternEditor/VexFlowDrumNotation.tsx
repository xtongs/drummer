import { useRef, useEffect, useCallback } from "react";
import {
  Renderer,
  Stave,
  StaveNote,
  Voice,
  Formatter,
  Beam,
  Dot,
  GraceNote,
  GraceNoteGroup,
  TickContext,
  type StaveNoteStruct,
} from "vexflow";
import { SUBDIVISIONS_PER_BEAT } from "../../utils/constants";
import { useGridCellSize } from "../../hooks/useGridCellSize";
import type { DrumNotationProps } from "./LegacyDrumNotation";
import "./DrumNotation.css";
import {
  DRUM_TO_VEXFLOW,
  patternToVexflowNoteEvents,
  buildBarTimeline,
  type VexflowNoteEvent,
} from "../../utils/vexflowNotation";
import type { VexflowDurationToken } from "../../utils/vexflowDurations";

// 谱面常量
const SVG_HEIGHT = 130;
// VexFlow Stave 五线高度约 40px (5线 x 10px间距)
// 为了让五线谱顶线在 y = 34 的位置（居中）：STAFF_Y = 34 - 24.5 ≈ 10
const STAVE_HEIGHT = 40;
const STAVE_INTERNAL_OFFSET = 35; // VexFlow 内部偏移
const STAFF_Y = (SVG_HEIGHT - STAVE_HEIGHT) / 2 - STAVE_INTERNAL_OFFSET;

type NoteEvent = VexflowNoteEvent;

/**
 * 计算音符的固定 x 坐标（与 grid cell 对齐）
 * @param restDuration - 休止符时值（4/8/16），用于计算休止符的中心位置
 */
function getFixedX(
  subdivision: number,
  subPosition: 0 | 1,
  cellWidth: number,
  barStartSub: number,
  is32nd: boolean,
  restDuration?: 4 | 8 | 16,
): number {
  const localSub = subdivision - barStartSub;

  // 休止符需要根据时值放在正确的中心位置
  if (restDuration) {
    if (restDuration === 4) {
      // 四分休止符占 4 个 cell，放在中心 (localSub + 1.5)
      return (localSub + 1.5) * cellWidth + cellWidth / 2;
    } else if (restDuration === 8) {
      // 八分休止符占 2 个 cell，放在中心 (localSub + 0.5)
      return (localSub + 0.5) * cellWidth + cellWidth / 2;
    }
  }

  const baseX = localSub * cellWidth + cellWidth / 2;

  // 非 32 分音符居中
  if (!is32nd) {
    return baseX;
  }

  // 32 分音符在 cell 内偏移
  const offset = cellWidth * 0.22;
  if (subPosition === 0) {
    return baseX - offset;
  } else {
    return baseX + offset;
  }
}

function getExistingXShift(note: StaveNote): number {
  const anyNote = note as unknown as {
    getXShift?: () => number;
    x_shift?: number;
  };
  if (typeof anyNote.getXShift === "function") return anyNote.getXShift();
  if (typeof anyNote.x_shift === "number") return anyNote.x_shift;
  return 0;
}

function addDotToAllSafe(note: StaveNote) {
  // VexFlow v5：官方方式为 Dot.buildAndAttach
  // 这里用 safe wrapper 主要是避免未来版本 API 变更导致运行时崩溃
  const anyDot = Dot as unknown as {
    buildAndAttach?: (notes: unknown[], options?: { all?: boolean }) => void;
  };
  if (typeof anyDot.buildAndAttach === "function") {
    anyDot.buildAndAttach([note], { all: true });
  }
}

/**
 * 创建 VexFlow StaveNote
 */
function createStaveNote(
  event: NoteEvent,
  isLowerVoice: boolean,
  clef: string,
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
    clef: clef,
    stemDirection: isLowerVoice ? -1 : 1,
  };

  const note = new StaveNote(noteStruct);
  if (durationToken.dots === 1) addDotToAllSafe(note);

  // 鬼音标记：在 format 后、draw 前处理符头缩放
  if (event.kind === "ghost") {
    (note as unknown as { _isGhost: boolean })._isGhost = true;
  }

  if (hasXNoteHead && !isLowerVoice) {
    const stem = note.getStem();
    if (stem) {
      stem.setOptions({ stemUpYOffset: 4 });
    }
  }

  return note;
}

/**
 * 创建休止符
 * @param duration - 时值：4（四分）、8（八分）、16（十六分）、32（三十二分）
 */
function createRestNote(
  durationToken: VexflowDurationToken,
  isLowerVoice: boolean,
): StaveNote {
  const durationStr = `${durationToken.base}r`;
  // 休止符的 key 位置：上声部用 c/5，下声部用 f/4
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

interface NoteWithMeta {
  note: StaveNote;
  event: NoteEvent;
  isRest: boolean;
  /**
   * 休止符：以 32 分为单位的起点与长度，用于 x 对齐（取中心点）
   * 音符：用于对齐起点（取 event/subPosition）
   */
  startUnits32InBar?: number;
  durationUnits32?: number;
}

function buildBarTickables(
  events: NoteEvent[],
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
        note: createStaveNote(
          item.event,
          isLowerVoice,
          "percussion",
          item.durationToken,
        ),
        event: item.event,
        isRest: false,
        startUnits32InBar: item.startUnits32InBar,
        durationUnits32: item.durationUnits32,
      };
    }

    const startUnits32 = item.startUnits32InBar;
    const restEvent: NoteEvent = {
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

export function VexFlowDrumNotation({
  pattern,
  currentBeat,
  scrollContainerRef: _scrollContainerRef,
  onDoubleClick,
}: DrumNotationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cellWidth = useGridCellSize();
  const lastTouchRef = useRef<{ time: number; x: number } | null>(null);

  const DOUBLE_TAP_DELAY = 300;
  const DOUBLE_TAP_DISTANCE = 30;

  const [beatsPerBar] = pattern.timeSignature;
  const totalSubdivisions = pattern.bars * beatsPerBar * SUBDIVISIONS_PER_BEAT;
  const totalWidth = totalSubdivisions * cellWidth;

  // 每个小节的宽度 = beatsPerBar * SUBDIVISIONS_PER_BEAT * cellWidth
  const staveWidth = beatsPerBar * SUBDIVISIONS_PER_BEAT * cellWidth;

  const calculateSubdivision = useCallback(
    (clientX: number): number => {
      const container = containerRef.current;
      if (!container) return 0;
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      return Math.floor(x / cellWidth);
    },
    [cellWidth],
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!onDoubleClick) return;
      const subdivision = calculateSubdivision(event.clientX);
      onDoubleClick(subdivision);
    },
    [onDoubleClick, calculateSubdivision],
  );

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!onDoubleClick) return;

      const touch = event.touches[0];
      const currentTime = Date.now();
      const x = touch.clientX;

      if (lastTouchRef.current) {
        const { time: lastTime, x: lastX } = lastTouchRef.current;
        const timeDiff = currentTime - lastTime;
        const distanceDiff = Math.abs(x - lastX);

        if (timeDiff < DOUBLE_TAP_DELAY && distanceDiff < DOUBLE_TAP_DISTANCE) {
          const subdivision = calculateSubdivision(x);
          onDoubleClick(subdivision);
          lastTouchRef.current = null;
          return;
        }
      }

      lastTouchRef.current = { time: currentTime, x };
    },
    [onDoubleClick, calculateSubdivision],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    // 创建 VexFlow 渲染器（使用 VexFlow 默认样式，不设置自定义颜色）
    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(totalWidth, SVG_HEIGHT);
    const context = renderer.getContext();

    // 为每个小节创建谱表
    for (let bar = 0; bar < pattern.bars; bar++) {
      const staveX = bar * staveWidth;

      // 创建谱表
      const stave = new Stave(staveX, STAFF_Y, staveWidth);
      stave.setContext(context);
      stave.setDefaultLedgerLineStyle({ lineWidth: 1, strokeStyle: "#000000" });
      stave.draw();

      // 获取该小节的音符事件
      const { upperVoice, lowerVoice } = patternToVexflowNoteEvents(pattern);

      // 筛选出当前小节的事件
      const barStartSub = bar * beatsPerBar * SUBDIVISIONS_PER_BEAT;
      const barEndSub = (bar + 1) * beatsPerBar * SUBDIVISIONS_PER_BEAT;

      const barUpperEvents = upperVoice.filter(
        (e) => e.subdivision >= barStartSub && e.subdivision < barEndSub,
      );
      const barLowerEvents = lowerVoice.filter(
        (e) => e.subdivision >= barStartSub && e.subdivision < barEndSub,
      );

      // 当前小节的 subdivision 数量
      const barSubdivisions = beatsPerBar * SUBDIVISIONS_PER_BEAT;

      // 创建上声部音符（包含休止符）
      const upperNotesWithRests = buildBarTickables(
        barUpperEvents.map((e) => ({
          ...e,
          subdivision: e.subdivision - barStartSub, // 转为小节内相对位置
        })),
        barSubdivisions,
        false,
      ).map((item) => ({
        ...item,
        event: {
          ...item.event,
          subdivision: item.event.subdivision + barStartSub, // 转回全局位置
        },
      }));

      // 创建下声部音符（包含休止符）
      const lowerNotesWithRests = buildBarTickables(
        barLowerEvents.map((e) => ({
          ...e,
          subdivision: e.subdivision - barStartSub,
        })),
        barSubdivisions,
        true,
      ).map((item) => ({
        ...item,
        event: {
          ...item.event,
          subdivision: item.event.subdivision + barStartSub,
        },
      }));

      const upperNotes = upperNotesWithRests;
      const lowerNotes = lowerNotesWithRests;

      // 如果有音符，创建 Voice 并绘制
      if (upperNotes.length > 0 || lowerNotes.length > 0) {
        const voices: Voice[] = [];
        const allNoteObjs = [...upperNotes, ...lowerNotes];

        if (upperNotes.length > 0) {
          const upperVoiceObj = new Voice({
            numBeats: beatsPerBar,
            beatValue: 4,
          }).setStrict(false);
          upperVoiceObj.addTickables(upperNotes.map((n) => n.note));
          voices.push(upperVoiceObj);
        }

        if (lowerNotes.length > 0) {
          const lowerVoiceObj = new Voice({
            numBeats: beatsPerBar,
            beatValue: 4,
          }).setStrict(false);
          lowerVoiceObj.addTickables(lowerNotes.map((n) => n.note));
          voices.push(lowerVoiceObj);
        }

        // 先格式化（分配 TickContext）
        if (voices.length > 0) {
          new Formatter().joinVoices(voices).format(voices, staveWidth - 20);
        }

        // 格式化后手动设置每个音符的 x 坐标（与 grid cell 对齐）
        // targetX 是音符在小节内的相对位置（从 0 开始）
        // 目标绝对位置 = staveX + targetX
        // 注意：VexFlow 格式化后可能已带有基础 xShift/布局偏移（且会随屏宽变化）。
        // 这里必须在“已有 xShift”基础上叠加 delta，而不是直接覆盖为 delta，否则会导致不同屏宽下偏移不一致。
        const restBeatShiftX = (SUBDIVISIONS_PER_BEAT / 4) * cellWidth;
        for (const noteObj of allNoteObjs) {
          const { note, event, isRest, startUnits32InBar, durationUnits32 } =
            noteObj;

          let targetX: number;
          if (isRest && startUnits32InBar !== undefined && durationUnits32) {
            // 休止符使用自身跨度中心点定位（以 32 分单位换算成 16 分 cell）并整体左移一个 beat
            const centerUnits32 = startUnits32InBar + durationUnits32 / 2;
            const centerSub = centerUnits32 / 2;
            targetX = centerSub * cellWidth - (cellWidth / 4) * 1.2;
            restBeatShiftX;
          } else {
            targetX =
              getFixedX(
                event.subdivision,
                event.subPosition,
                cellWidth,
                barStartSub,
                event.is32nd,
              ) -
              cellWidth / 4;
          }

          // 确保绝对坐标计算基于当前 stave
          note.setStave(stave);

          const desiredAbsX = stave.getX() + targetX;
          const currentAbsX = note.getAbsoluteX();
          const delta = desiredAbsX - currentAbsX;
          note.setXShift(getExistingXShift(note) + delta);
        }

        // 创建前倚音（acciaccatura / grace notes）
        // 前倚音始终带斜线，固定显示在主音符前 5px 位置
        // TODO: 位置不对需调整
        const GRACE_NOTE_SPACING = 5; // 装饰音与主音符的固定距离
        for (const noteObj of allNoteObjs) {
          if (!noteObj.event.graceDrums || noteObj.event.graceDrums.length === 0)
            continue;

          const graceNotes = noteObj.event.graceDrums.map(({ drum }) => {
            const mapping = DRUM_TO_VEXFLOW[drum];
            const graceNote = new GraceNote({
              keys: mapping.keys,
              duration: "16",
              slash: true, // 前倚音带斜线
              stemDirection: mapping.isLowerVoice ? -1 : 1,
            });
            // GraceNote 需要 TickContext 才能正确绘制
            const tickContext = new TickContext();
            graceNote.setTickContext(tickContext);
            tickContext.preFormat();
            return graceNote;
          });

          const group = new GraceNoteGroup(graceNotes, false);
          // 设置装饰音组与主音符的固定间距
          // 负值使装饰音向左偏移，确保在主音符前固定 5px 位置
          group.setXShift(-GRACE_NOTE_SPACING);
          // 必须通过 addModifier 添加到父音符，这样 VexFlow 才会设置正确的 index
          noteObj.note.addModifier(group, 0);
        }

        // 格式化后再创建符杠（flatBeams 保持水平，包含休止符）
        // 只对可被 beam 的音符创建 beam（八分音符及更短的音符，包括休止符）
        const isBeamable = (note: StaveNote) => {
          const raw = note.getDuration(); // e.g. "8", "8r", "16", "16r"
          const numeric = Number.parseInt(raw.replace("r", ""), 10);
          if (!Number.isFinite(numeric)) return false;
          return numeric >= 8;
        };

        const groupByQuarterBar = (items: NoteWithMeta[]) => {
          const barUnits32 = barSubdivisions * 2;
          const quarterUnits32 = Math.max(1, Math.floor(barUnits32 / 4));
          const groups: StaveNote[][] = [[], [], [], []];

          for (const item of items) {
            if (!isBeamable(item.note)) continue;
            const startUnits32 =
              item.startUnits32InBar ??
              (item.event.subdivision - barStartSub) * 2 +
                item.event.subPosition;
            const idx = Math.min(
              3,
              Math.max(0, Math.floor(startUnits32 / quarterUnits32)),
            );
            groups[idx]!.push(item.note);
          }
          return groups.filter((g) => g.length > 0);
        };

        const allBeams: Beam[] = [];
        for (const group of groupByQuarterBar(upperNotes)) {
          const beams = Beam.generateBeams(group, {
            stemDirection: 1,
            flatBeams: true,
          });
          allBeams.push(...beams);
        }
        for (const group of groupByQuarterBar(lowerNotes)) {
          const beams = Beam.generateBeams(group, {
            stemDirection: -1,
            flatBeams: true,
          });
          allBeams.push(...beams);
        }

        // 绘制 Voice（GraceNoteGroup 通过 addModifier 添加，会自动绘制）
        voices.forEach((voice) => voice.draw(context, stave));

        // 绘制符杠
        allBeams.forEach((beam) => beam.setContext(context).draw());

        // 处理鬼音符头缩放（在 draw 之后通过 DOM 操作）
        for (const noteObj of allNoteObjs) {
          const note = noteObj.note as unknown as {
            _isGhost?: boolean;
            noteHeads?: Array<{
              el?: SVGElement;
              getSVGElement?: () => SVGElement;
            }>;
          };
          if (note._isGhost && note.noteHeads) {
            for (const head of note.noteHeads) {
              // 获取符头的 SVG 元素
              const svgEl = head.getSVGElement?.() ?? head.el;
              if (svgEl) {
                // 获取符头的 bounding box 中心点作为 transform-origin
                const bbox = (svgEl as SVGGraphicsElement).getBBox?.();
                if (bbox) {
                  const cx = bbox.x + bbox.width / 2;
                  const cy = bbox.y + bbox.height / 2;
                  svgEl.setAttribute(
                    "transform",
                    `translate(${cx}, ${cy}) scale(0.75) translate(${-cx + (noteObj.event.drums[0].drum === "Kick" ? -2 : 2)}, ${-cy})`,
                  );
                }
              }
            }
          }
        }

      }
    }

    // 绘制当前播放位置高亮（使用半透明黄色）
    if (currentBeat !== undefined && currentBeat >= 0) {
      const svg = container.querySelector("svg");
      if (svg) {
        const rect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect",
        );
        rect.setAttribute("x", String(currentBeat * cellWidth));
        rect.setAttribute("y", "0");
        rect.setAttribute("width", String(cellWidth));
        rect.setAttribute("height", String(SVG_HEIGHT));
        rect.setAttribute("fill", "#fbbf24");
        rect.setAttribute("opacity", "0.3");
        rect.setAttribute("stroke", "transparent");
        svg.insertBefore(rect, svg.firstChild);
      }
    }
  }, [
    pattern,
    currentBeat,
    cellWidth,
    totalWidth,
    beatsPerBar,
    totalSubdivisions,
    staveWidth,
  ]);

  return (
    <>
      <div
        className="drum-notation-container vexflow-renderer"
        ref={containerRef}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        style={{
          width: totalWidth,
          height: SVG_HEIGHT,
          backgroundColor: "#ffffff",
        }}
      />
    </>
  );
}
