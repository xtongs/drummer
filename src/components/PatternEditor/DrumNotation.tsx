import { useRef, useEffect } from "react";
import type { Pattern } from "../../types";
import {
  CELL_GHOST,
  CELL_GRACE,
  CELL_DOUBLE_32,
  CELL_FIRST_32,
  CELL_SECOND_32,
} from "../../types";
import { getDrumNotation, getSymbolY } from "../../utils/drumNotation";
import { SUBDIVISIONS_PER_BEAT } from "../../utils/constants";
import { useGridCellSize } from "../../hooks/useGridCellSize";
import "./DrumNotation.css";

interface DrumNotationProps {
  pattern: Pattern;
  currentBeat?: number;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
  onDoubleClick?: (subdivision: number) => void;
}

const SYMBOL_SIZE = 7;
const X_RADIUS = SYMBOL_SIZE * 0.707;
const LINE_SPACING = 18;
const STAFF_TOP = LINE_SPACING;
const STAFF_HEIGHT = 5 * LINE_SPACING;

export function DrumNotation({
  pattern,
  currentBeat,
  scrollContainerRef: _scrollContainerRef,
  onDoubleClick,
}: DrumNotationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cellWidth = useGridCellSize();

  const handleDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onDoubleClick) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;

    const subdivision = Math.floor(x / cellWidth);
    onDoubleClick(subdivision);
  };

  const lastTouchRef = useRef<{ time: number; x: number } | null>(null);
  const DOUBLE_TAP_DELAY = 300;
  const DOUBLE_TAP_DISTANCE = 30;

  const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    if (!onDoubleClick) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const touch = event.touches[0];
    const currentTime = Date.now();
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;

    if (lastTouchRef.current) {
      const { time: lastTime, x: lastX } = lastTouchRef.current;
      const timeDiff = currentTime - lastTime;
      const distanceDiff = Math.abs(x - lastX);

      if (timeDiff < DOUBLE_TAP_DELAY && distanceDiff < DOUBLE_TAP_DISTANCE) {
        const subdivision = Math.floor(x / cellWidth);
        onDoubleClick(subdivision);
        lastTouchRef.current = null;
        return;
      }
    }

    lastTouchRef.current = { time: currentTime, x };
  };

  const [beatsPerBar] = pattern.timeSignature;
  const totalSubdivisions = pattern.bars * beatsPerBar * SUBDIVISIONS_PER_BEAT;
  const totalWidth = totalSubdivisions * cellWidth;
  const svgHeight = STAFF_HEIGHT + STAFF_TOP;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = totalWidth * dpr;
    canvas.height = svgHeight * dpr;
    canvas.style.width = `${totalWidth}px`;
    canvas.style.height = `${svgHeight}px`;
    ctx.scale(dpr, dpr);

    const getCSSVariable = (varName: string) => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue(varName)
        .trim();
    };

    const colorText = getCSSVariable("--color-text");
    const colorTextTertiary = getCSSVariable("--color-text-tertiary");
    const colorBeatLine = getCSSVariable("--color-beat-line");
    const colorWarning = getCSSVariable("--color-warning");

    ctx.clearRect(0, 0, totalWidth, svgHeight);

    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(totalWidth, 0);
    ctx.strokeStyle = colorText;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;
    ctx.stroke();

    for (let i = 0; i < 6; i++) {
      const y = STAFF_TOP + i * LINE_SPACING;
      const isFirstLine = i === 0;

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(totalWidth, y);
      ctx.strokeStyle = colorText;
      ctx.lineWidth = i === 5 ? 2 : 1;
      ctx.globalAlpha = 0.8;
      if (isFirstLine) {
        ctx.setLineDash([4, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const barLines = Array.from({ length: pattern.bars + 1 }, (_, i) => ({
      x: i * beatsPerBar * SUBDIVISIONS_PER_BEAT * cellWidth,
      isFirst: i === 0,
      isLast: i === pattern.bars,
    }));

    barLines.forEach((bar) => {
      ctx.beginPath();
      ctx.moveTo(bar.x, 0);
      ctx.lineTo(bar.x, STAFF_TOP + STAFF_HEIGHT);
      ctx.strokeStyle =
        bar.isFirst || bar.isLast ? colorText : colorTextTertiary;
      ctx.lineWidth = bar.isFirst || bar.isLast ? 3 : 2;
      ctx.globalAlpha = bar.isFirst || bar.isLast ? 1 : 0.6;
      if (bar.isFirst || bar.isLast) {
        ctx.setLineDash([]);
      } else {
        ctx.setLineDash([4, 4]);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);

    const beatLines = Array.from(
      { length: pattern.bars * beatsPerBar + 1 },
      (_, i) => ({
        x: i * SUBDIVISIONS_PER_BEAT * cellWidth,
      })
    );

    beatLines.forEach((beat, index) => {
      if (index % beatsPerBar === 0) return;

      ctx.beginPath();
      ctx.moveTo(beat.x, 0);
      ctx.lineTo(beat.x, STAFF_TOP + STAFF_HEIGHT);
      ctx.strokeStyle = colorBeatLine;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      ctx.stroke();
    });

    if (currentBeat !== undefined && currentBeat >= 0) {
      ctx.fillStyle = colorWarning;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(
        currentBeat * cellWidth,
        0,
        cellWidth,
        STAFF_TOP + STAFF_HEIGHT
      );
    }

    ctx.globalAlpha = 1;
    ctx.strokeStyle = colorText;
    ctx.fillStyle = colorText;

    const drawSymbol = (
      symbolX: number,
      symbolY: number,
      symbol: string,
      drum: string,
      isGhost: boolean,
      isGrace: boolean
    ) => {
      if (drum === "Crash 1" || drum === "Crash 2") {
        if (isGhost) {
          ctx.beginPath();
          ctx.arc(symbolX, symbolY, SYMBOL_SIZE - 1, 0, Math.PI * 2);
          ctx.strokeStyle = colorText;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (isGrace) {
          ctx.beginPath();
          ctx.arc(
            symbolX,
            symbolY,
            SYMBOL_SIZE,
            -Math.PI / 2,
            Math.PI / 2,
            false
          );
          ctx.fillStyle = colorText;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(
            symbolX,
            symbolY,
            SYMBOL_SIZE - 1,
            Math.PI / 2,
            -Math.PI / 2,
            false
          );
          ctx.strokeStyle = colorText;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(symbolX, symbolY, SYMBOL_SIZE, 0, Math.PI * 2);
          ctx.strokeStyle = colorText;
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(symbolX - X_RADIUS, symbolY - X_RADIUS);
          ctx.lineTo(symbolX + X_RADIUS, symbolY + X_RADIUS);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(symbolX + X_RADIUS, symbolY - X_RADIUS);
          ctx.lineTo(symbolX - X_RADIUS, symbolY + X_RADIUS);
          ctx.stroke();
        }
        return;
      }

      if (isGhost) {
        ctx.beginPath();
        ctx.arc(symbolX, symbolY, SYMBOL_SIZE - 1, 0, Math.PI * 2);
        ctx.strokeStyle = colorText;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (isGrace) {
        ctx.beginPath();
        ctx.arc(
          symbolX,
          symbolY,
          SYMBOL_SIZE,
          -Math.PI / 2,
          Math.PI / 2,
          false
        );
        ctx.fillStyle = colorText;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(
          symbolX,
          symbolY,
          SYMBOL_SIZE - 1,
          Math.PI / 2,
          -Math.PI / 2,
          false
        );
        ctx.strokeStyle = colorText;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        switch (symbol) {
          case "x":
            ctx.beginPath();
            ctx.moveTo(symbolX - X_RADIUS, symbolY - X_RADIUS);
            ctx.lineTo(symbolX + X_RADIUS, symbolY + X_RADIUS);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(symbolX + X_RADIUS, symbolY - X_RADIUS);
            ctx.lineTo(symbolX - X_RADIUS, symbolY + X_RADIUS);
            ctx.stroke();
            break;
          case "o":
            ctx.beginPath();
            ctx.arc(symbolX, symbolY, SYMBOL_SIZE - 1, 0, Math.PI * 2);
            ctx.strokeStyle = colorText;
            ctx.lineWidth = 2;
            ctx.stroke();
            break;
          case "●":
            ctx.beginPath();
            ctx.arc(symbolX, symbolY, SYMBOL_SIZE, 0, Math.PI * 2);
            ctx.fillStyle = colorText;
            ctx.fill();
            break;
          case "○":
            ctx.beginPath();
            ctx.arc(symbolX, symbolY, SYMBOL_SIZE, 0, Math.PI * 2);
            ctx.strokeStyle = colorText;
            ctx.lineWidth = 2;
            ctx.stroke();
            break;
          default:
            return;
        }
      }
    };

    pattern.grid.forEach((row, drumIndex) => {
      const drum = pattern.drums[drumIndex];
      const notation = getDrumNotation(drum);
      const symbolY = getSymbolY(
        notation.line,
        STAFF_HEIGHT,
        STAFF_TOP,
        LINE_SPACING
      );

      row.forEach((cellState, subdivisionIndex) => {
        if (!cellState) return;

        const baseX = subdivisionIndex * cellWidth + cellWidth / 2;
        const symbol = notation.symbol;
        const isGhost = cellState === CELL_GHOST;
        const isGrace = cellState === CELL_GRACE;
        const isDouble32 = cellState === CELL_DOUBLE_32;
        const isFirst32 = cellState === CELL_FIRST_32;
        const isSecond32 = cellState === CELL_SECOND_32;

        const xOffset = cellWidth * 0.22;
        const symbolXs =
          isDouble32 || isFirst32 || isSecond32
            ? [
                ...(isDouble32 || isFirst32 ? [baseX - xOffset] : []),
                ...(isDouble32 || isSecond32 ? [baseX + xOffset] : []),
              ]
            : [baseX];

        symbolXs.forEach((symbolX) => {
          drawSymbol(symbolX, symbolY, symbol, drum, isGhost, isGrace);
        });
      });
    });
  }, [pattern, currentBeat, cellWidth, totalWidth, svgHeight, beatsPerBar]);

  return (
    <div className="drum-notation-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="drum-notation-canvas"
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
      />
    </div>
  );
}
