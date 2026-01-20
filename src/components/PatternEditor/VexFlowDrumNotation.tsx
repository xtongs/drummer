import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import {
  Renderer,
  Stave,
  Voice,
  Formatter,
  Beam,
} from "vexflow";
import { SUBDIVISIONS_PER_BEAT } from "../../utils/constants";
import { useGridCellSize } from "../../hooks/useGridCellSize";
import type { DrumNotationProps } from "./LegacyDrumNotation";
import "./DrumNotation.css";
import {
  patternToVexflowNoteEvents,
} from "../../utils/vexflowNotation";
import {
  getFixedX,
  getExistingXShift,
  buildBarTickables,
  groupByQuarterBar,
  getRestTargetX,
  type NoteWithMeta,
} from "../../utils/vexflowRenderer";

// 谱面常量
const SVG_HEIGHT = 130;
const STAVE_HEIGHT = 40;
const STAVE_INTERNAL_OFFSET = 35;
const STAFF_Y = (SVG_HEIGHT - STAVE_HEIGHT) / 2 - STAVE_INTERNAL_OFFSET;

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

  const staveWidth = beatsPerBar * SUBDIVISIONS_PER_BEAT * cellWidth;

  const [visibleBars, setVisibleBars] = useState<number[]>([]);
  const BUFFER_BARS = 1;

  const calculateVisibleBars = useCallback(() => {
    if (!_scrollContainerRef || !_scrollContainerRef.current || !containerRef.current) return;

    const scrollContainer = _scrollContainerRef.current;
    const container = containerRef.current;

    const scrollRect = scrollContainer.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const visibleLeft = scrollRect.left - containerRect.left;
    const visibleRight = visibleLeft + scrollRect.width;

    const startBar = Math.max(0, Math.floor(visibleLeft / staveWidth));
    const endBar = Math.min(pattern.bars - 1, Math.ceil(visibleRight / staveWidth));

    const barsToRender: number[] = [];
    const bufferStart = Math.max(0, startBar - BUFFER_BARS);
    const bufferEnd = Math.min(pattern.bars - 1, endBar + BUFFER_BARS);

    for (let i = bufferStart; i <= bufferEnd; i++) {
      barsToRender.push(i);
    }

    setVisibleBars(barsToRender);
  }, [_scrollContainerRef, staveWidth, pattern.bars]);

  useEffect(() => {
    calculateVisibleBars();

    const scrollContainer = _scrollContainerRef?.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      requestAnimationFrame(calculateVisibleBars);
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", calculateVisibleBars);

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", calculateVisibleBars);
    };
  }, [_scrollContainerRef, calculateVisibleBars]);

  const visibleBarsSet = useMemo(() => new Set(visibleBars), [visibleBars]);

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

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(totalWidth, SVG_HEIGHT);
    const context = renderer.getContext();

    for (let bar = 0; bar < pattern.bars; bar++) {
      if (!visibleBarsSet.has(bar)) continue;

      const staveX = bar * staveWidth;

      const stave = new Stave(staveX, STAFF_Y, staveWidth);
      stave.setContext(context);
      stave.setDefaultLedgerLineStyle({ lineWidth: 1, strokeStyle: "#000000" });
      stave.draw();

      // 修改五线谱五条横线为灰色
      const svg = container.querySelector("svg");
      if (svg) {
        const lines = svg.querySelectorAll(".vf-stave line");
        lines.forEach((line) => {
          line.setAttribute("stroke", "#9ca3af");
        });
      }

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
          subdivision: e.subdivision - barStartSub,
        })),
        barSubdivisions,
        false,
      ).map((item) => ({
        ...item,
        event: {
          ...item.event,
          subdivision: item.event.subdivision + barStartSub,
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
        const allNoteObjs: NoteWithMeta[] = [...upperNotes, ...lowerNotes];

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

        // 格式化后手动设置每个音符的 x 坐标
        for (const noteObj of allNoteObjs) {
          const { note, event, isRest, startUnits32InBar, durationUnits32 } = noteObj;

          let targetX: number;
          if (isRest && startUnits32InBar !== undefined && durationUnits32) {
            targetX = getRestTargetX(startUnits32InBar, durationUnits32, cellWidth);
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

        // 创建符杠
        const allBeams: Beam[] = [];
        for (const group of groupByQuarterBar(upperNotes, barStartSub, barSubdivisions)) {
          const beams = Beam.generateBeams(group, {
            stemDirection: 1,
            flatBeams: true,
          });
          allBeams.push(...beams);
        }
        for (const group of groupByQuarterBar(lowerNotes, barStartSub, barSubdivisions)) {
          const beams = Beam.generateBeams(group, {
            stemDirection: -1,
            flatBeams: true,
          });
          allBeams.push(...beams);
        }

        // 绘制 Voice
        voices.forEach((voice) => voice.draw(context, stave));

        // 绘制符杠
        allBeams.forEach((beam) => beam.setContext(context).draw());

        // 处理鬼音符头缩放
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
              const svgEl = head.getSVGElement?.() ?? head.el;
              if (svgEl) {
                const bbox = (svgEl as SVGGraphicsElement).getBBox?.();
                if (bbox) {
                  const cx = bbox.x + bbox.width / 2;
                  const cy = bbox.y + bbox.height / 2;
                  svgEl.setAttribute(
                    "transform",
                    `translate(${cx}, ${cy}) scale(0.75) translate(${-cx + (noteObj.event.drums[0]?.drum === "Kick" ? -2 : 2)}, ${-cy})`,
                  );
                }
              }
            }
          }
        }
      }
    }

    // 绘制当前播放位置高亮
    if (currentBeat !== undefined && currentBeat >= 0) {
      const svg = container.querySelector("svg");
      if (svg) {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
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
    visibleBarsSet,
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
