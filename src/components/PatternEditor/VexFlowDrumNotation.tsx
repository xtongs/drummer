import { useRef, useEffect, useCallback } from "react";
import {
  Renderer,
  Stave,
  StaveNote,
  Voice,
  Formatter,
  Beam,
  type StaveNoteStruct,
} from "vexflow";
import type { Pattern, DrumType, CellState } from "../../types";
import {
  CELL_OFF,
  CELL_DOUBLE_32,
  CELL_FIRST_32,
  CELL_SECOND_32,
} from "../../types";
import { SUBDIVISIONS_PER_BEAT } from "../../utils/constants";
import { useGridCellSize } from "../../hooks/useGridCellSize";
import type { DrumNotationProps } from "./LegacyDrumNotation";
import "./DrumNotation.css";

// VexFlow 标准鼓谱 key 映射
const DRUM_TO_VEXFLOW: Record<
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

// 谱面常量
const SVG_HEIGHT = 108;
// VexFlow Stave 五线高度约 40px (5线 x 10px间距)
// 为了让五线谱顶线在 y = 34 的位置（居中）：STAFF_Y = 34 - 24.5 ≈ 10
const STAVE_HEIGHT = 40;
const STAVE_INTERNAL_OFFSET = 40; // VexFlow 内部偏移
const STAFF_Y = (SVG_HEIGHT - STAVE_HEIGHT) / 2 - STAVE_INTERNAL_OFFSET;

interface NoteEvent {
  subdivision: number;
  subPosition: 0 | 1;
  drums: {
    drum: DrumType;
    cellState: CellState;
  }[];
  is32nd: boolean;
}

/**
 * 将 Pattern grid 转换为音符事件列表
 */
function patternToNoteEvents(pattern: Pattern): {
  upperVoice: NoteEvent[];
  lowerVoice: NoteEvent[];
} {
  const upperEvents: NoteEvent[] = [];
  const lowerEvents: NoteEvent[] = [];

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

/**
 * 按 beat 分组事件
 */
function groupEventsByBeat(events: NoteEvent[]): NoteEvent[][] {
  const groups: Map<number, NoteEvent[]> = new Map();

  for (const event of events) {
    const beatIndex = Math.floor(event.subdivision / SUBDIVISIONS_PER_BEAT);
    if (!groups.has(beatIndex)) {
      groups.set(beatIndex, []);
    }
    groups.get(beatIndex)!.push(event);
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, evts]) =>
      evts.sort((a, b) => {
        if (a.subdivision !== b.subdivision)
          return a.subdivision - b.subdivision;
        return a.subPosition - b.subPosition;
      })
    );
}

/**
 * 计算音符的固定 x 坐标（与 grid cell 对齐）
 */
function getFixedX(
  subdivision: number,
  subPosition: 0 | 1,
  cellWidth: number,
  barStartSub: number,
  is32nd: boolean
): number {
  const localSub = subdivision - barStartSub;
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

/**
 * 创建 VexFlow StaveNote
 */
function createStaveNote(
  event: NoteEvent,
  isLowerVoice: boolean,
  clef: string
): StaveNote {
  const allKeys: string[] = [];

  for (const { drum } of event.drums) {
    const mapping = DRUM_TO_VEXFLOW[drum];
    allKeys.push(...mapping.keys);
  }

  const duration = event.is32nd ? "32" : "16";

  const noteStruct: StaveNoteStruct = {
    keys: allKeys,
    duration: duration,
    clef: clef,
    stemDirection: isLowerVoice ? -1 : 1,
  };

  return new StaveNote(noteStruct);
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
    [cellWidth]
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!onDoubleClick) return;
      const subdivision = calculateSubdivision(event.clientX);
      onDoubleClick(subdivision);
    },
    [onDoubleClick, calculateSubdivision]
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
    [onDoubleClick, calculateSubdivision]
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

      // 创建谱表（不显示谱号）
      const stave = new Stave(staveX, STAFF_Y, staveWidth);
      stave.setContext(context);
      stave.draw();

      // 获取该小节的音符事件
      const { upperVoice, lowerVoice } = patternToNoteEvents(pattern);

      // 筛选出当前小节的事件
      const barStartSub = bar * beatsPerBar * SUBDIVISIONS_PER_BEAT;
      const barEndSub = (bar + 1) * beatsPerBar * SUBDIVISIONS_PER_BEAT;

      const barUpperEvents = upperVoice.filter(
        (e) => e.subdivision >= barStartSub && e.subdivision < barEndSub
      );
      const barLowerEvents = lowerVoice.filter(
        (e) => e.subdivision >= barStartSub && e.subdivision < barEndSub
      );

      // 创建上声部音符（记录事件信息用于后续设置 x 坐标）
      const upperNotes: { note: StaveNote; event: NoteEvent }[] = [];
      const upperBeatGroups = groupEventsByBeat(barUpperEvents);

      for (const beatEvents of upperBeatGroups) {
        for (const event of beatEvents) {
          const note = createStaveNote(event, false, "percussion");
          upperNotes.push({ note, event });
        }
      }

      // 创建下声部音符
      const lowerNotes: { note: StaveNote; event: NoteEvent }[] = [];
      const lowerBeatGroups = groupEventsByBeat(barLowerEvents);

      for (const beatEvents of lowerBeatGroups) {
        for (const event of beatEvents) {
          const note = createStaveNote(event, true, "percussion");
          lowerNotes.push({ note, event });
        }
      }

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
        for (const { note, event } of allNoteObjs) {
          const targetX = getFixedX(
            event.subdivision,
            event.subPosition,
            cellWidth,
            barStartSub,
            event.is32nd
          );
          // 获取 VexFlow 计算的 x 坐标，计算需要的偏移
          const currentX = note.getAbsoluteX();
          const xShift = targetX + staveX - currentX;
          note.setXShift(xShift);
        }

        // 格式化后再创建符杠
        const allBeams: Beam[] = [];
        if (upperNotes.length > 0) {
          const beams = Beam.generateBeams(
            upperNotes.map((n) => n.note),
            { stemDirection: 1 }
          );
          allBeams.push(...beams);
        }
        if (lowerNotes.length > 0) {
          const beams = Beam.generateBeams(
            lowerNotes.map((n) => n.note),
            { stemDirection: -1 }
          );
          allBeams.push(...beams);
        }

        // 绘制 Voice
        voices.forEach((voice) => voice.draw(context, stave));

        // 绘制符杠
        allBeams.forEach((beam) => beam.setContext(context).draw());
      }
    }

    // 绘制当前播放位置高亮（使用半透明黄色）
    if (currentBeat !== undefined && currentBeat >= 0) {
      const svg = container.querySelector("svg");
      if (svg) {
        const rect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        rect.setAttribute("x", String(currentBeat * cellWidth));
        rect.setAttribute("y", "0");
        rect.setAttribute("width", String(cellWidth));
        rect.setAttribute("height", String(SVG_HEIGHT));
        rect.setAttribute("fill", "#fbbf24");
        rect.setAttribute("opacity", "0.3");
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
  );
}
