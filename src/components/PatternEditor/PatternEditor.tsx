import { useRef, useEffect } from "react";
import { DrumNotation } from "./DrumNotation";
import { Grid } from "./Grid";
import { BarControls } from "./BarControls";
import { LoopRangeSelector } from "./LoopRangeSelector";
import { PatternTabs } from "../PatternManager/PatternTabs";
import type { Pattern } from "../../types";
import { GRID_CELL_SIZE } from "../../utils/constants";
import "./PatternEditor.css";

interface PatternEditorProps {
  pattern: Pattern;
  onCellClick: (drumIndex: number, beatIndex: number) => void;
  onAddBar: () => void;
  onRemoveBar: () => void;
  onClearGrid: () => void;
  onLoopRangeChange: (range: [number, number] | undefined) => void;
  onSave: () => void;
  onLoadFromSlot: (pattern: Pattern) => void;
  onDeletePattern: (patternId: string) => void;
  savedPatterns: Pattern[];
  currentBeat?: number;
  isPlaying?: boolean;
  onPlayToggle?: () => void;
}

export function PatternEditor({
  pattern,
  onCellClick,
  onAddBar,
  onRemoveBar,
  onClearGrid,
  onLoopRangeChange,
  onSave,
  onLoadFromSlot,
  onDeletePattern,
  savedPatterns,
  currentBeat,
  isPlaying = false,
  onPlayToggle,
}: PatternEditorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cellSize = GRID_CELL_SIZE; // 使用公共变量，确保第一小节在375px宽度下完整显示

  // 当播放时，自动滚动到当前游标位置（按页滚动）
  useEffect(() => {
    if (currentBeat === undefined || !scrollContainerRef.current) {
      return;
    }

    const container = scrollContainerRef.current;
    const cursorPosition = currentBeat * cellSize;
    const containerWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;
    const scrollRight = scrollLeft + containerWidth;

    // 检查游标是否在可视区域内
    // 如果游标超出可视区域，按页滚动
    if (cursorPosition < scrollLeft) {
      // 游标在可视区域左侧，向前滚动一页
      container.scrollTo({
        left: scrollLeft - containerWidth,
        behavior: "smooth",
      });
    } else if (cursorPosition + cellSize > scrollRight) {
      // 游标在可视区域右侧，向后滚动一页
      container.scrollTo({
        left: scrollLeft + containerWidth,
        behavior: "smooth",
      });
    }
  }, [currentBeat, cellSize]);

  return (
    <div className="pattern-editor">
      <div className="pattern-editor-controls">
        <BarControls
          bars={pattern.bars}
          onAddBar={onAddBar}
          onRemoveBar={onRemoveBar}
          canRemove={pattern.bars > 1}
        />
        <LoopRangeSelector
          bars={pattern.bars}
          loopRange={pattern.loopRange}
          onLoopRangeChange={onLoopRangeChange}
        />
      </div>
      <div className="pattern-editor-actions">
        <div className="pattern-editor-actions-left">
          <button
            className="action-button save-button"
            onClick={onSave}
            aria-label="Create New Pattern"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          {savedPatterns.length > 0 && (
            <PatternTabs
              patterns={savedPatterns}
              currentPatternId={pattern.id}
              onSelectPattern={onLoadFromSlot}
            />
          )}
        </div>
        <div className="pattern-editor-actions-right">
          {savedPatterns.some((p) => p.id === pattern.id) && (
            <button
              className="action-button delete-button"
              onClick={() => {
                if (window.confirm("Delete this pattern?")) {
                  onDeletePattern(pattern.id);
                }
              }}
              aria-label="Delete"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
          <button
            className="action-button clear-button"
            onClick={onClearGrid}
            aria-label="Clear"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      <div className="pattern-editor-scrollable" ref={scrollContainerRef}>
        <DrumNotation
          pattern={pattern}
          currentBeat={currentBeat}
          scrollContainerRef={scrollContainerRef}
        />
        <Grid
          pattern={pattern}
          onCellClick={onCellClick}
          currentBeat={currentBeat}
          scrollContainerRef={scrollContainerRef}
        />
      </div>
    </div>
  );
}
