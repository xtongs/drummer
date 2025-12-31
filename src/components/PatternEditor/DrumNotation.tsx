import { useRef } from "react";
import type { Pattern } from "../../types";
import { getDrumNotation, getSymbolY } from "../../utils/drumNotation";
import { SUBDIVISIONS_PER_BEAT } from "../../utils/constants";
import { useGridCellSize } from "../../hooks/useGridCellSize";
import "./DrumNotation.css";

interface DrumNotationProps {
  pattern: Pattern;
  currentBeat?: number;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

const SYMBOL_SIZE = 7;
const LINE_SPACING = 18; // 线间距，适配符号大小（符号直径14，稍微大一点）
const STAFF_TOP = LINE_SPACING; // 顶部留白，一个完整间距
const STAFF_HEIGHT = 5 * LINE_SPACING; // 六条线之间有5个间隔，让六条线平分高度

export function DrumNotation({
  pattern,
  currentBeat,
  scrollContainerRef: _scrollContainerRef,
}: DrumNotationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cellWidth = useGridCellSize(); // 动态计算单元格宽度

  // 获取 CSS 变量值
  const getCSSVariable = (varName: string) => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
  };

  const colorText = getCSSVariable("--color-text");
  const colorTextTertiary = getCSSVariable("--color-text-tertiary");
  const colorBeatLine = getCSSVariable("--color-beat-line");
  const colorWarning = getCSSVariable("--color-warning");

  const [beatsPerBar] = pattern.timeSignature;
  const totalSubdivisions = pattern.bars * beatsPerBar * SUBDIVISIONS_PER_BEAT;
  const totalWidth = totalSubdivisions * cellWidth;
  const svgHeight = STAFF_HEIGHT + STAFF_TOP; // 上方一个完整间距，下方无留白

  // 计算小节分隔线位置
  const barLines = Array.from({ length: pattern.bars + 1 }, (_, i) => ({
    x: i * beatsPerBar * SUBDIVISIONS_PER_BEAT * cellWidth,
    isFirst: i === 0,
    isLast: i === pattern.bars,
  }));

  // 计算节拍分隔线位置（每4个subdivision一条）
  const beatLines = Array.from(
    { length: pattern.bars * beatsPerBar + 1 },
    (_, i) => ({
      x: i * SUBDIVISIONS_PER_BEAT * cellWidth,
    })
  );

  return (
    <div className="drum-notation-container" ref={containerRef}>
      <svg
        ref={svgRef}
        className="drum-notation-svg"
        viewBox={`0 0 ${totalWidth} ${svgHeight}`}
        width={totalWidth}
        height={svgHeight}
        preserveAspectRatio="none"
      >
        {/* 上边界横线 */}
        <line
          x1={0}
          y1={0}
          x2={totalWidth}
          y2={0}
          stroke={colorText}
          strokeWidth={1}
          opacity={0.8}
        />

        {/* 六线谱背景 */}
        {Array.from({ length: 6 }, (_, i) => {
          const y = STAFF_TOP + i * LINE_SPACING;
          const isFirstLine = i === 0;
          return (
            <line
              key={`staff-line-${i}`}
              x1={0}
              y1={y}
              x2={totalWidth}
              y2={y}
              stroke={colorText}
              strokeWidth={1}
              opacity={0.8}
              strokeDasharray={isFirstLine ? "4,4" : "0"}
            />
          );
        })}

        {/* 小节分隔线 */}
        {barLines.map((bar, index) => (
          <line
            key={`bar-line-${index}`}
            x1={bar.x}
            y1={0}
            x2={bar.x}
            y2={STAFF_TOP + STAFF_HEIGHT}
            stroke={bar.isFirst || bar.isLast ? colorText : colorTextTertiary}
            strokeWidth={bar.isFirst || bar.isLast ? 3 : 2}
            strokeDasharray={bar.isFirst || bar.isLast ? "0" : "4,4"}
            opacity={bar.isFirst || bar.isLast ? 1 : 0.6}
          />
        ))}

        {/* 节拍分隔线（每4个subdivision一条） */}
        {beatLines.map((beat, index) => {
          // 跳过小节分隔线位置
          if (index % beatsPerBar === 0) return null;
          return (
            <line
              key={`beat-line-${index}`}
              x1={beat.x}
              y1={0}
              x2={beat.x}
              y2={STAFF_TOP + STAFF_HEIGHT}
              stroke={colorBeatLine}
              strokeWidth={1}
              opacity={0.4}
            />
          );
        })}

        {/* 当前播放位置高亮 */}
        {currentBeat !== undefined && currentBeat >= 0 && (
          <rect
            x={currentBeat * cellWidth}
            y={0}
            width={cellWidth}
            height={STAFF_TOP + STAFF_HEIGHT}
            fill={colorWarning}
            opacity={0.4}
          />
        )}

        {/* 鼓谱符号 */}
        {pattern.grid.map((row, drumIndex) => {
          const drum = pattern.drums[drumIndex];
          const notation = getDrumNotation(drum);
          const symbolY = getSymbolY(
            notation.line,
            STAFF_HEIGHT,
            STAFF_TOP,
            LINE_SPACING
          );

          return row.map((isActive, subdivisionIndex) => {
            if (!isActive) return null;

            // 计算符号位置：每个subdivision的中心
            const symbolX = subdivisionIndex * cellWidth + cellWidth / 2;
            const symbol = notation.symbol;
            const key = `symbol-${drumIndex}-${subdivisionIndex}`;

            // Crash1 和 Crash2 显示为 X 和 O 重叠
            if (drum === "Crash 1" || drum === "Crash 2") {
              return (
                <g key={key}>
                  {/* O 圆圈 */}
                  <circle
                    cx={symbolX}
                    cy={symbolY}
                    r={SYMBOL_SIZE}
                    fill="none"
                    stroke={colorText}
                    strokeWidth={2}
                  />
                  {/* X 交叉线 */}
                  <line
                    x1={symbolX - SYMBOL_SIZE}
                    y1={symbolY - SYMBOL_SIZE}
                    x2={symbolX + SYMBOL_SIZE}
                    y2={symbolY + SYMBOL_SIZE}
                    stroke={colorText}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                  <line
                    x1={symbolX + SYMBOL_SIZE}
                    y1={symbolY - SYMBOL_SIZE}
                    x2={symbolX - SYMBOL_SIZE}
                    y2={symbolY + SYMBOL_SIZE}
                    stroke={colorText}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </g>
              );
            }

            switch (symbol) {
              case "x":
                return (
                  <g key={key}>
                    <line
                      x1={symbolX - SYMBOL_SIZE}
                      y1={symbolY - SYMBOL_SIZE}
                      x2={symbolX + SYMBOL_SIZE}
                      y2={symbolY + SYMBOL_SIZE}
                      stroke={colorText}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                    <line
                      x1={symbolX + SYMBOL_SIZE}
                      y1={symbolY - SYMBOL_SIZE}
                      x2={symbolX - SYMBOL_SIZE}
                      y2={symbolY + SYMBOL_SIZE}
                      stroke={colorText}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </g>
                );
              case "o":
                return (
                  <circle
                    key={key}
                    cx={symbolX}
                    cy={symbolY}
                    r={SYMBOL_SIZE}
                    fill="none"
                    stroke={colorText}
                    strokeWidth={2}
                  />
                );
              case "●":
                return (
                  <circle
                    key={key}
                    cx={symbolX}
                    cy={symbolY}
                    r={SYMBOL_SIZE}
                    fill={colorText}
                  />
                );
              case "○":
                return (
                  <circle
                    key={key}
                    cx={symbolX}
                    cy={symbolY}
                    r={SYMBOL_SIZE}
                    fill="none"
                    stroke={colorText}
                    strokeWidth={2}
                  />
                );
              default:
                return null;
            }
          });
        })}
      </svg>
    </div>
  );
}
