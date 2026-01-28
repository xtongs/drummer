import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import {
  Renderer,
  Stave,
  Voice,
  Formatter,
  Beam,
  Barline,
  Fraction,
} from "vexflow";
import { SUBDIVISIONS_PER_BEAT } from "../../utils/constants";
import type { DrumNotationProps } from "./LegacyDrumNotation";
import type { DrumType } from "../../types";
import "./DrumNotation.css";
import { patternToVexflowNoteEvents } from "../../utils/vexflowNotation";
import {
  getFixedX,
  getExistingXShift,
  buildBarTickables,
  hasSixteenthByHalfBar,
  splitNotesByHalfBar,
  splitNotesByBeat,
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
  cellSize,
  currentBeat,
  scrollContainerRef: _scrollContainerRef,
  onDoubleClick,
}: DrumNotationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cellWidth = cellSize;
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
    if (
      !_scrollContainerRef ||
      !_scrollContainerRef.current ||
      !containerRef.current
    )
      return;

    const scrollContainer = _scrollContainerRef.current;
    const container = containerRef.current;

    const scrollRect = scrollContainer.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const visibleLeft = scrollRect.left - containerRect.left;
    const visibleRight = visibleLeft + scrollRect.width;

    const startBar = Math.max(0, Math.floor(visibleLeft / staveWidth));
    const endBar = Math.min(
      pattern.bars - 1,
      Math.ceil(visibleRight / staveWidth),
    );

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
      // 最后一个小节使用 END 类型的结束竖线（双竖线加粗）
      if (bar === pattern.bars - 1) {
        stave.setEndBarType(Barline.type.END);
      }
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
          const { note, event, isRest, startUnits32InBar, durationUnits32 } =
            noteObj;

          let targetX: number;
          if (isRest && startUnits32InBar !== undefined && durationUnits32) {
            targetX = getRestTargetX(
              startUnits32InBar,
              durationUnits32,
              cellWidth,
            );
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

        // 为每个声部生成符杠
        const beamGroups = [
          { notes: upperNotes, stemDirection: 1 },
          { notes: lowerNotes, stemDirection: -1 },
        ];

        for (const { notes, stemDirection } of beamGroups) {
          // 提取可符杠连接的音符
          const beamableNotes = notes.filter((item) => {
            const duration = item.note.getDuration();
            const numeric = Number.parseInt(duration.replace(/[rd]/g, ""), 10);
            return Number.isFinite(numeric) && numeric >= 8;
          });

          if (beamableNotes.length === 0) continue;

          // 按半小节检查是否有十六分音符
          const [firstHalfHasSixteenth, secondHalfHasSixteenth] =
            hasSixteenthByHalfBar(beamableNotes, barSubdivisions);

          // 按半小节分组音符
          const [firstHalfNotes, secondHalfNotes] = splitNotesByHalfBar(
            beamableNotes,
            barSubdivisions,
          );

          // 为每半小节分别生成符杠
          const halfBarGroups = [
            {
              notes: firstHalfNotes,
              hasSixteenth: firstHalfHasSixteenth,
            },
            {
              notes: secondHalfNotes,
              hasSixteenth: secondHalfHasSixteenth,
            },
          ];

          for (const { notes: halfNotes, hasSixteenth } of halfBarGroups) {
            if (halfNotes.length === 0) continue;

            if (hasSixteenth) {
              // 有十六分音符：将半小节内的音符按拍子进一步分组，防止跨拍符杠连接
              // 例如：4/4 拍时，半小节有 2 拍，需要分成 2 组
              const beatGroups = splitNotesByBeat(
                halfNotes,
                barSubdivisions,
                beatsPerBar,
              );

              // 为每拍生成符杠
              for (const beatNotes of beatGroups) {
                if (beatNotes.length === 0) continue;

                const beams = Beam.generateBeams(
                  beatNotes.map((n) => n.note),
                  {
                    stemDirection,
                    flatBeams: true,
                    groups: [new Fraction(1, 4)], // 每拍分组
                  },
                );
                allBeams.push(...beams);
              }
            } else {
              // 无十六分音符：整个半小节一个符杠
              const beams = Beam.generateBeams(
                halfNotes.map((n) => n.note),
                {
                  stemDirection,
                  flatBeams: true,
                  groups: [new Fraction(1, 2)], // 半小节内每两拍分组（即整个半小节1个符杠）
                },
              );
              allBeams.push(...beams);
            }
          }
        }

        // 绘制 Voice
        voices.forEach((voice) => voice.draw(context, stave));

        // 绘制符杠
        allBeams.forEach((beam) => beam.setContext(context).draw());

        // 处理鬼音符头缩放
        for (const noteObj of allNoteObjs) {
          const note = noteObj.note as unknown as {
            _ghostDrums?: DrumType[];
            noteHeads?: Array<{
              el?: SVGElement;
              getSVGElement?: () => SVGElement;
            }>;
          };
          if (
            note._ghostDrums &&
            note._ghostDrums.length > 0 &&
            note.noteHeads
          ) {
            // noteHeads 的索引顺序对应 allKeys 的顺序
            // allKeys 是按 event.drums 的顺序生成的
            const ghostDrumsSet = new Set(note._ghostDrums);
            const drumTypes = noteObj.event.drums.map((d) => d.drum);

            for (let i = 0; i < note.noteHeads.length; i++) {
              const head = note.noteHeads[i];
              if (!head) continue;

              // 检查对应的鼓是否是 ghost
              const drumType = drumTypes[i];
              if (!drumType || !ghostDrumsSet.has(drumType)) continue;

              const svgEl = head.getSVGElement?.() ?? head.el;
              if (svgEl) {
                const bbox = (svgEl as SVGGraphicsElement).getBBox?.();
                if (bbox) {
                  const cx = bbox.x + bbox.width / 2;
                  const cy = bbox.y + bbox.height / 2;
                  svgEl.setAttribute(
                    "transform",
                    `translate(${cx}, ${cy}) scale(0.75) translate(${-cx + (drumType === "Kick" ? -2 : 2)}, ${-cy})`,
                  );
                }
              }
            }
          }
        }
      }
    }

    // 修改所有小节的五条横线和竖线为灰色
    const svg = container.querySelector("svg");
    if (svg) {
      const staveGroups = svg.querySelectorAll(".vf-stave");
      staveGroups.forEach((staveGroup) => {
        staveGroup.setAttribute("stroke", "#aaa");
      });
      // 修改竖线颜色
      const staveBarlines = svg.querySelectorAll(".vf-stavebarline");
      staveBarlines.forEach((barline) => {
        const rects = barline.querySelectorAll("rect");
        rects.forEach((rect) => {
          rect.setAttribute("stroke", "transparent");
          rect.setAttribute("fill", "#333");
        });
      });
    }

    // 绘制当前播放位置高亮
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
