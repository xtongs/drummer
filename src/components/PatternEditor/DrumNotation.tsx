import { useRef } from "react";
import type { Pattern } from "../../types";
import { getDrumNotation, getSymbolY } from "../../utils/drumNotation";
import { SUBDIVISIONS_PER_BEAT, GRID_CELL_SIZE } from "../../utils/constants";
import "./DrumNotation.css";

interface DrumNotationProps {
  pattern: Pattern;
  currentBeat?: number;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

const STAFF_TOP = 26; // 顶部和底部留白
const LINE_SPACING = 34; // 线间距，增大以让符号不挤在一起
const STAFF_HEIGHT = 4 * LINE_SPACING; // 五条线之间有4个间隔，让五条线平分高度
const CELL_WIDTH = GRID_CELL_SIZE; // 使用公共变量，确保第一小节在375px宽度下完整显示
const SYMBOL_SIZE = 7;

export function DrumNotation({
  pattern,
  currentBeat,
  scrollContainerRef: _scrollContainerRef,
}: DrumNotationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
  const totalWidth = totalSubdivisions * CELL_WIDTH;
  const svgHeight = STAFF_HEIGHT + STAFF_TOP * 2;

  // 计算小节分隔线位置
  const barLines = Array.from({ length: pattern.bars + 1 }, (_, i) => ({
    x: i * beatsPerBar * SUBDIVISIONS_PER_BEAT * CELL_WIDTH,
    isFirst: i === 0,
    isLast: i === pattern.bars,
  }));

  // 计算节拍分隔线位置（每4个subdivision一条）
  const beatLines = Array.from(
    { length: pattern.bars * beatsPerBar + 1 },
    (_, i) => ({
      x: i * SUBDIVISIONS_PER_BEAT * CELL_WIDTH,
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
        {/* 五线谱背景 */}
        {Array.from({ length: 5 }, (_, i) => {
          const y = STAFF_TOP + i * LINE_SPACING;
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
            />
          );
        })}

        {/* 小节分隔线 */}
        {barLines.map((bar, index) => (
          <line
            key={`bar-line-${index}`}
            x1={bar.x}
            y1={STAFF_TOP - 10}
            x2={bar.x}
            y2={STAFF_TOP + STAFF_HEIGHT + 10}
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
              y1={STAFF_TOP - 5}
              x2={beat.x}
              y2={STAFF_TOP + STAFF_HEIGHT + 5}
              stroke={colorBeatLine}
              strokeWidth={1}
              opacity={0.4}
            />
          );
        })}

        {/* 当前播放位置高亮 */}
        {currentBeat !== undefined && currentBeat >= 0 && (
          <rect
            x={currentBeat * CELL_WIDTH}
            y={STAFF_TOP - 10}
            width={CELL_WIDTH}
            height={STAFF_HEIGHT + 20}
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
            const symbolX = subdivisionIndex * CELL_WIDTH + CELL_WIDTH / 2;
            const symbol = notation.symbol;
            const key = `symbol-${drumIndex}-${subdivisionIndex}`;

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
