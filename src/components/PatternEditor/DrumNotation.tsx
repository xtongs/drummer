import { useRef } from "react";
import type { Pattern } from "../../types";
import { CELL_GHOST, CELL_GRACE } from "../../types";
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
// X 标记的半径，使其刚好不超出圆的边界（对角线长度 = 直径）
const X_RADIUS = SYMBOL_SIZE * 0.707; // 约等于 SYMBOL_SIZE / sqrt(2)
const BRACKET_OFFSET = 0.8; // 括号与音符的距离
const BRACKET_RADIUS = 10; // 括号圆弧的半径
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
          strokeWidth={2}
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
              strokeWidth={i === 5 ? 2 : 1}
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

          return row.map((cellState, subdivisionIndex) => {
            if (!cellState) return null;

            // 计算符号位置：每个subdivision的中心
            const symbolX = subdivisionIndex * cellWidth + cellWidth / 2;
            const symbol = notation.symbol;
            const key = `symbol-${drumIndex}-${subdivisionIndex}`;
            const isGhost = cellState === CELL_GHOST;
            const isGrace = cellState === CELL_GRACE;

            // 渲染括号的辅助函数
            const renderBrackets = () => {
              const bracketElements: JSX.Element[] = [];
              const leftX = symbolX - SYMBOL_SIZE - BRACKET_OFFSET;
              const rightX = symbolX + SYMBOL_SIZE + BRACKET_OFFSET;

              // 使用半径为 BRACKET_RADIUS 的圆，按 X 形分成四份，取左右两端圆弧
              // 圆弧长度减半：从 symbolY ± BRACKET_RADIUS 改为 symbolY ± BRACKET_RADIUS/2
              // 左括号：一段圆弧，从 (leftX, symbolY - BRACKET_RADIUS/2) 到 (leftX, symbolY + BRACKET_RADIUS/2)，向左弯曲
              // 右括号：一段圆弧，从 (rightX, symbolY - BRACKET_RADIUS/2) 到 (rightX, symbolY + BRACKET_RADIUS/2)，向右弯曲
              const leftBracketTop = symbolY - BRACKET_RADIUS / 2;
              const leftBracketBottom = symbolY + BRACKET_RADIUS / 2;
              const rightBracketTop = symbolY - BRACKET_RADIUS / 2;
              const rightBracketBottom = symbolY + BRACKET_RADIUS / 2;

              if (isGhost) {
                // 鬼音：左右两个括号
                // 左括号：一段圆弧，从顶部到底部，向左弯曲
                bracketElements.push(
                  <path
                    key="left-bracket"
                    d={`M ${leftX} ${leftBracketTop}
                        A ${BRACKET_RADIUS} ${BRACKET_RADIUS} 0 0 0 ${leftX} ${leftBracketBottom}`}
                    fill="none"
                    stroke={colorText}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />
                );
                // 右括号：一段圆弧，从顶部到底部，向右弯曲
                bracketElements.push(
                  <path
                    key="right-bracket"
                    d={`M ${rightX} ${rightBracketTop}
                        A ${BRACKET_RADIUS} ${BRACKET_RADIUS} 0 0 1 ${rightX} ${rightBracketBottom}`}
                    fill="none"
                    stroke={colorText}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />
                );
              } else if (isGrace) {
                // 倚音：只加左侧一半括号，一段圆弧
                bracketElements.push(
                  <path
                    key="left-bracket"
                    d={`M ${leftX} ${leftBracketTop}
                        A ${BRACKET_RADIUS} ${BRACKET_RADIUS} 0 0 0 ${leftX} ${leftBracketBottom}`}
                    fill="none"
                    stroke={colorText}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />
                );
              }
              return bracketElements;
            };

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
                  {/* X 交叉线（缩小尺寸） */}
                  <line
                    x1={symbolX - X_RADIUS}
                    y1={symbolY - X_RADIUS}
                    x2={symbolX + X_RADIUS}
                    y2={symbolY + X_RADIUS}
                    stroke={colorText}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                  <line
                    x1={symbolX + X_RADIUS}
                    y1={symbolY - X_RADIUS}
                    x2={symbolX - X_RADIUS}
                    y2={symbolY + X_RADIUS}
                    stroke={colorText}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                  {/* 括号 */}
                  {renderBrackets()}
                </g>
              );
            }

            // 渲染基础符号
            let baseSymbol: JSX.Element | null = null;
            switch (symbol) {
              case "x":
                baseSymbol = (
                  <g>
                    <line
                      x1={symbolX - X_RADIUS}
                      y1={symbolY - X_RADIUS}
                      x2={symbolX + X_RADIUS}
                      y2={symbolY + X_RADIUS}
                      stroke={colorText}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                    <line
                      x1={symbolX + X_RADIUS}
                      y1={symbolY - X_RADIUS}
                      x2={symbolX - X_RADIUS}
                      y2={symbolY + X_RADIUS}
                      stroke={colorText}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  </g>
                );
                break;
              case "o":
                baseSymbol = (
                  <circle
                    cx={symbolX}
                    cy={symbolY}
                    r={SYMBOL_SIZE}
                    fill="none"
                    stroke={colorText}
                    strokeWidth={2}
                  />
                );
                break;
              case "●":
                baseSymbol = (
                  <circle
                    cx={symbolX}
                    cy={symbolY}
                    r={SYMBOL_SIZE}
                    fill={colorText}
                  />
                );
                break;
              case "○":
                baseSymbol = (
                  <circle
                    cx={symbolX}
                    cy={symbolY}
                    r={SYMBOL_SIZE}
                    fill="none"
                    stroke={colorText}
                    strokeWidth={2}
                  />
                );
                break;
              default:
                return null;
            }

            return (
              <g key={key}>
                {baseSymbol}
                {renderBrackets()}
              </g>
            );
          });
        })}
      </svg>
    </div>
  );
}
