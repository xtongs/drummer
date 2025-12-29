import { useRef, useEffect } from "react";
import { GridCell } from "./GridCell";
import type { Pattern } from "../../types";
import { SUBDIVISIONS_PER_BEAT } from "../../utils/constants";
import "./Grid.css";

interface GridProps {
  pattern: Pattern;
  onCellClick: (drumIndex: number, beatIndex: number) => void;
  currentBeat?: number;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

export function Grid({
  pattern,
  onCellClick,
  currentBeat,
  scrollContainerRef,
}: GridProps) {

  const [beatsPerBar] = pattern.timeSignature;
  const cellSize = 32; // 与CSS变量一致

  return (
    <div className="grid-container">
      <div className="grid-wrapper">
        <div className="grid-content">
          <div className="grid-beat-labels">
            {Array.from({ length: pattern.bars }, (_, barIndex) => {
              const subdivisionsPerBar = beatsPerBar * SUBDIVISIONS_PER_BEAT;
              return (
                <div
                  key={barIndex}
                  className="grid-beat-label-group"
                  style={{ width: `${subdivisionsPerBar * cellSize}px` }}
                >
                  {Array.from({ length: beatsPerBar }, (_, beatIndex) => {
                    const beatStart = beatIndex * SUBDIVISIONS_PER_BEAT;
                    return (
                      <div
                        key={beatIndex}
                        className="grid-beat-label"
                        style={{
                          width: `${SUBDIVISIONS_PER_BEAT * cellSize}px`,
                          left: `${beatStart * cellSize}px`,
                        }}
                      >
                        {beatIndex + 1}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div className="grid-rows">
            {pattern.grid.map((row, drumIndex) => (
              <div key={drumIndex} className="grid-row">
                {row.map((isActive, subdivisionIndex) => {
                  // currentBeat现在是subdivision index
                  const isCurrentBeat =
                    currentBeat !== undefined &&
                    subdivisionIndex === currentBeat;

                  return (
                    <GridCell
                      key={subdivisionIndex}
                      isActive={isActive}
                      onClick={() => onCellClick(drumIndex, subdivisionIndex)}
                      isCurrentBeat={isCurrentBeat}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
