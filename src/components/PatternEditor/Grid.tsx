import { useRef } from "react";
import { GridCell } from "./GridCell";
import type { Pattern } from "../../types";
import { SUBDIVISIONS_PER_BEAT } from "../../utils/constants";
import { useVisibleRange } from "../../hooks/useVisibleRange";
import "./Grid.css";

interface GridProps {
  pattern: Pattern;
  cellSize: number;
  onCellClick: (drumIndex: number, beatIndex: number) => void;
  onToggleGhost: (drumIndex: number, beatIndex: number) => void;
  onCellDoubleClick: (drumIndex: number, beatIndex: number) => void;
  currentBeat?: number;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

export function Grid({
  pattern,
  cellSize,
  onCellClick,
  onToggleGhost,
  onCellDoubleClick,
  currentBeat,
  scrollContainerRef: _scrollContainerRef,
}: GridProps) {
  const gridContentRef = useRef<HTMLDivElement>(null);

  const totalSubdivisions = pattern.grid[0]?.length || 0;
  const totalWidth = totalSubdivisions * cellSize;

  const BUFFER_SUBDIVISIONS = SUBDIVISIONS_PER_BEAT * 2;

  const { visibleSet } = useVisibleRange(_scrollContainerRef, gridContentRef, {
    itemSize: cellSize,
    totalItems: totalSubdivisions,
    bufferItems: BUFFER_SUBDIVISIONS,
  });

  return (
    <div className="grid-container">
      <div className="grid-wrapper">
        <div
          className="grid-content"
          ref={gridContentRef}
          style={{ width: `${totalWidth}px` }}
        >
          <div className="grid-rows">
            {pattern.grid.map((row, drumIndex) => {
              const drumType = pattern.drums[drumIndex];
              return (
                <div
                  key={drumIndex}
                  className="grid-row"
                  style={{ width: `${totalWidth}px` }}
                >
                  {row.map((cellState, subdivisionIndex) => {
                    if (!visibleSet.has(subdivisionIndex)) {
                      return null;
                    }

                    const isCurrentBeat =
                      currentBeat !== undefined &&
                      subdivisionIndex === currentBeat;

                    return (
                      <GridCell
                        key={subdivisionIndex}
                        cellState={cellState}
                        onClick={() => onCellClick(drumIndex, subdivisionIndex)}
                        onDoubleClick={() =>
                          onCellDoubleClick(drumIndex, subdivisionIndex)
                        }
                        onToggleGhost={() =>
                          onToggleGhost(drumIndex, subdivisionIndex)
                        }
                        isCurrentBeat={isCurrentBeat}
                        drumType={drumType}
                        subdivisionIndex={subdivisionIndex}
                        style={{ left: `${subdivisionIndex * cellSize}px` }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
