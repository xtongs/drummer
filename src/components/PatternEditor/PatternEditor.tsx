import { useRef, useEffect } from "react";
import { DrumNotation } from "./DrumNotation";
import { Grid } from "./Grid";
import { BarControls } from "./BarControls";
import { LoopRangeSelector } from "./LoopRangeSelector";
import { PatternTabs } from "../PatternManager/PatternTabs";
import type { Pattern } from "../../types";
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
}: PatternEditorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cellSize = 27; // 与 Grid 组件中的 cellSize 保持一致

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
            aria-label="Save"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
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
