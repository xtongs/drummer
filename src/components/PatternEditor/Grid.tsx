import { useRef, useLayoutEffect, useCallback, useState, useMemo } from "react";
import { GridCell } from "./GridCell";
import type { Pattern } from "../../types";
import { SUBDIVISIONS_PER_BEAT } from "../../utils/constants";
import { useGridCellSize } from "../../hooks/useGridCellSize";
import "./Grid.css";

interface GridProps {
  pattern: Pattern;
  onCellClick: (drumIndex: number, beatIndex: number) => void;
  onToggleGhost: (drumIndex: number, beatIndex: number) => void;
  onCellDoubleClick: (drumIndex: number, beatIndex: number) => void;
  currentBeat?: number;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

export function Grid({
  pattern,
  onCellClick,
  onToggleGhost,
  onCellDoubleClick,
  currentBeat,
  scrollContainerRef: _scrollContainerRef,
}: GridProps) {
  const [beatsPerBar] = pattern.timeSignature;
  const cellSize = useGridCellSize();
  const gridContentRef = useRef<HTMLDivElement>(null);

  const totalSubdivisions = pattern.grid[0]?.length || 0;
  const totalWidth = totalSubdivisions * cellSize;

  const [visibleSubdivisions, setVisibleSubdivisions] = useState<{
    start: number;
    end: number;
  }>({ start: 0, end: totalSubdivisions });

  const BUFFER_SUBDIVISIONS = SUBDIVISIONS_PER_BEAT * 2;

  const calculateVisibleSubdivisions = useCallback(() => {
    if (!_scrollContainerRef?.current) {
      setVisibleSubdivisions({ start: 0, end: totalSubdivisions });
      return;
    }

    if (!gridContentRef.current) {
      setVisibleSubdivisions({ start: 0, end: totalSubdivisions });
      return;
    }

    const scrollContainer = _scrollContainerRef.current;
    const gridContent = gridContentRef.current;

    const scrollRect = scrollContainer.getBoundingClientRect();
    const contentRect = gridContent.getBoundingClientRect();

    const visibleLeft = scrollRect.left - contentRect.left;
    const visibleRight = visibleLeft + scrollRect.width;

    const startSubdivision = Math.max(
      0,
      Math.floor(visibleLeft / cellSize) - BUFFER_SUBDIVISIONS,
    );
    const endSubdivision = Math.min(
      pattern.grid[0]?.length || 0,
      Math.ceil(visibleRight / cellSize) + BUFFER_SUBDIVISIONS,
    );

    setVisibleSubdivisions({ start: startSubdivision, end: endSubdivision });
  }, [_scrollContainerRef, cellSize, pattern.grid, totalWidth]);

  useLayoutEffect(() => {
    calculateVisibleSubdivisions();

    const scrollContainer = _scrollContainerRef?.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      requestAnimationFrame(calculateVisibleSubdivisions);
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", calculateVisibleSubdivisions);

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", calculateVisibleSubdivisions);
    };
  }, [_scrollContainerRef, calculateVisibleSubdivisions]);

  const visibleSubdivisionsSet = useMemo(
    () =>
      new Set(
        Array.from(
          { length: visibleSubdivisions.end - visibleSubdivisions.start },
          (_, i) => visibleSubdivisions.start + i,
        ),
      ),
    [visibleSubdivisions],
  );

  return (
    <div className="grid-container">
      <div className="grid-wrapper">
        <div
          className="grid-content"
          ref={gridContentRef}
          style={{ width: `${totalWidth}px` }}
        >
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
                        {barIndex + 1}.{beatIndex + 1}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
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
                    if (!visibleSubdivisionsSet.has(subdivisionIndex)) {
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
