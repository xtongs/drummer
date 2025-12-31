import { useRef, useEffect, useCallback } from "react";
import { DrumNotation } from "./DrumNotation";
import { Grid } from "./Grid";
import { BarControls } from "./BarControls";
import { LoopRangeSelector } from "./LoopRangeSelector";
import { PatternTabs } from "../PatternManager/PatternTabs";
import type { Pattern, CrossPatternLoop } from "../../types";
import { useGridCellSize } from "../../hooks/useGridCellSize";
import "./PatternEditor.css";

// 自定义快速动画滚动函数
function smoothScrollTo(
  element: HTMLElement,
  targetLeft: number,
  duration: number = 150, // 150ms 快速动画
  onComplete?: () => void
) {
  const startLeft = element.scrollLeft;
  const distance = targetLeft - startLeft;
  const startTime = performance.now();

  function animate(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // 使用 easeOutCubic 缓动函数
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    element.scrollLeft = startLeft + distance * easeProgress;

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      onComplete?.();
    }
  }

  requestAnimationFrame(animate);
}

interface PatternEditorProps {
  pattern: Pattern;
  onCellClick: (drumIndex: number, beatIndex: number) => void;
  onToggleGhost: (drumIndex: number, beatIndex: number) => void;
  onCycleThirtySecond: (drumIndex: number, beatIndex: number) => void;
  onAddBar: () => void;
  onRemoveBar: () => void;
  onClearGrid: () => void;
  crossPatternLoop: CrossPatternLoop | undefined;
  onCrossPatternLoopChange: (loop: CrossPatternLoop | undefined) => void;
  onSave: () => void;
  onSaveCurrentPattern: () => void;
  onLoadFromSlot: (pattern: Pattern) => void;
  onDeletePattern: (patternId: string) => void;
  onStopAllPlaying?: () => void;
  onSelectDraft: () => void;
  savedPatterns: Pattern[];
  currentBeat?: number;
  isPlaying?: boolean;
  onPlayToggle?: () => void;
  isDraftMode: boolean;
}

export function PatternEditor({
  pattern,
  onCellClick,
  onToggleGhost,
  onCycleThirtySecond,
  onAddBar,
  onRemoveBar,
  onClearGrid,
  crossPatternLoop,
  onCrossPatternLoopChange,
  onSave,
  onSaveCurrentPattern,
  onLoadFromSlot,
  onDeletePattern,
  onStopAllPlaying,
  onSelectDraft,
  savedPatterns,
  currentBeat,
  isPlaying = false,
  onPlayToggle: _onPlayToggle,
  isDraftMode,
}: PatternEditorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false); // 防止滚动过程中重复触发
  const lastScrollTargetRef = useRef<number | null>(null); // 记录上次滚动目标
  const cellSize = useGridCellSize(); // 动态计算单元格大小

  // 执行滚动的函数
  const doScroll = useCallback((container: HTMLElement, targetLeft: number) => {
    // 如果目标位置与上次相同，不重复滚动
    if (lastScrollTargetRef.current === targetLeft) {
      return;
    }

    // 如果正在滚动中，不触发新的滚动
    if (isScrollingRef.current) {
      return;
    }

    isScrollingRef.current = true;
    lastScrollTargetRef.current = targetLeft;

    smoothScrollTo(container, targetLeft, 150, () => {
      isScrollingRef.current = false;
    });
  }, []);

  // 当播放时，自动滚动到当前游标位置（按页滚动，带提前量）
  useEffect(() => {
    if (currentBeat === undefined || !scrollContainerRef.current) {
      return;
    }

    const container = scrollContainerRef.current;
    const cursorPosition = currentBeat * cellSize;
    const containerWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;
    const scrollRight = scrollLeft + containerWidth;

    // 提前量：在游标距离右边界还有 20% 容器宽度时就开始滚动
    const rightLeadAmount = containerWidth * 0.2;
    // 左边界提前量稍小
    const leftLeadAmount = containerWidth * 0.1;

    // 检查游标是否接近可视区域边界
    if (cursorPosition < scrollLeft + leftLeadAmount) {
      // 游标接近可视区域左侧，向前滚动
      // 滚动到让游标在视图中间偏右的位置
      const targetLeft = Math.max(0, cursorPosition - containerWidth * 0.3);
      doScroll(container, targetLeft);
    } else if (cursorPosition + cellSize > scrollRight - rightLeadAmount) {
      // 游标接近可视区域右侧，向后滚动
      // 滚动到让游标在视图左侧 1/4 处，给后面留出更多空间
      const targetLeft = cursorPosition - containerWidth * 0.25;
      doScroll(container, targetLeft);
    }
  }, [currentBeat, cellSize, doScroll]);

  // 当停止播放或切换 pattern 时，重置滚动状态
  useEffect(() => {
    if (!isPlaying) {
      lastScrollTargetRef.current = null;
    }
  }, [isPlaying, pattern.id]);

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
          currentPattern={pattern}
          savedPatterns={savedPatterns}
          crossPatternLoop={crossPatternLoop}
          onCrossPatternLoopChange={onCrossPatternLoopChange}
          isDraftMode={isDraftMode}
        />
      </div>
      <div className="pattern-editor-actions">
        <div className="pattern-editor-actions-left">
          <PatternTabs
            patterns={savedPatterns}
            currentPatternId={pattern.id}
            onSelectPattern={onLoadFromSlot}
            onSelectDraft={onSelectDraft}
            onAddPattern={onSave}
            isDraftMode={isDraftMode}
          />
        </div>
        <div className="pattern-editor-actions-right">
          {/* 保存按钮 - 仅在非草稿模式下显示 */}
          {!isDraftMode && savedPatterns.some((p) => p.id === pattern.id) && (
            <button
              className="action-button save-current-button"
              onClick={onSaveCurrentPattern}
              aria-label="Save Pattern"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </button>
          )}
          {savedPatterns.some((p) => p.id === pattern.id) && (
            <button
              className="action-button delete-button"
              onClick={() => {
                // 先暂停所有播放，避免 confirm 弹窗时继续播放
                if (onStopAllPlaying) {
                  onStopAllPlaying();
                }
                // 使用 setTimeout 让 React 先更新 UI，再显示 confirm
                setTimeout(() => {
                  if (window.confirm("Delete this pattern?")) {
                    onDeletePattern(pattern.id);
                  }
                }, 0);
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
          onToggleGhost={onToggleGhost}
          onCellDoubleClick={onCycleThirtySecond}
          currentBeat={currentBeat}
          scrollContainerRef={scrollContainerRef}
        />
      </div>
    </div>
  );
}
