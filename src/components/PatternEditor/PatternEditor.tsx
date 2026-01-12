import { useRef, useEffect, useCallback, useState } from "react";
import { DrumNotation } from "./DrumNotation";
import { Grid } from "./Grid";
import { BarControls } from "./BarControls";
import { LoopRangeSelector } from "./LoopRangeSelector";
import { PatternTabs } from "../PatternManager/PatternTabs";
import type { Pattern, CrossPatternLoop } from "../../types";
import { useGridCellSize } from "../../hooks/useGridCellSize";
import { useSingleLongPress } from "../../hooks/useSingleLongPress";
import { SUBDIVISIONS_PER_BEAT } from "../../utils/constants";
import {
  copyToClipboard,
  isClipboardWriteSupported,
} from "../../utils/clipboard";
import { serializePatternToJSON } from "../../utils/storage";
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
  onAddBar: (cursorPosition?: number) => void;
  onRemoveBar: (cursorPosition?: number) => void;
  onClearGrid: () => void;
  crossPatternLoop: CrossPatternLoop | undefined;
  onCrossPatternLoopChange: (loop: CrossPatternLoop | undefined) => void;
  onSave: () => void;
  onSaveCurrentPattern: () => void;
  onImportPattern?: (jsonString: string) => void;
  onLoadFromSlot: (pattern: Pattern) => void;
  onDeletePattern: (patternId: string) => void;
  onStopAllPlaying?: () => void;
  onSelectDraft: () => void;
  savedPatterns: Pattern[];
  currentBeat?: number;
  isPlaying?: boolean;
  onPlayToggle?: () => void;
  isDraftMode: boolean;
  onNotationDoubleClick?: (subdivision: number) => void;
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
  onImportPattern,
  onLoadFromSlot,
  onDeletePattern,
  onStopAllPlaying,
  onSelectDraft,
  savedPatterns,
  currentBeat,
  isPlaying = false,
  onPlayToggle: _onPlayToggle,
  isDraftMode,
  onNotationDoubleClick,
}: PatternEditorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false); // 防止滚动过程中重复触发
  const lastScrollTargetRef = useRef<number | null>(null); // 记录上次滚动目标
  const lastBarsRef = useRef(pattern.bars); // 跟踪上一次的小节数
  const isUserAddBarRef = useRef(false); // 标记是否是用户点击+按钮增加的小节数
  const addBarCursorBeatRef = useRef<number | undefined>(undefined); // 记录添加bar时的游标位置
  const cellSize = useGridCellSize(); // 动态计算单元格大小

  // 导出模式状态
  const [isExportMode, setIsExportMode] = useState(false);
  const [exportValue, setExportValue] = useState("");
  const exportInputRef = useRef<HTMLInputElement>(null);

  // 进入导出模式时自动聚焦并选中输入框内容
  useEffect(() => {
    if (isExportMode && exportInputRef.current) {
      exportInputRef.current.focus();
      exportInputRef.current.select();
    }
  }, [isExportMode]);

  // 长按保存按钮处理：先尝试自动写入剪贴板，失败则进入手动复制模式
  const handleLongPressSave = async () => {
    // 从 savedPatterns 中找到当前 pattern
    const currentPattern = savedPatterns.find((p) => p.id === pattern.id);
    if (!currentPattern) return;

    const jsonString = serializePatternToJSON(currentPattern);

    // 如果支持剪贴板写入，先尝试自动写入
    if (isClipboardWriteSupported()) {
      try {
        const success = await copyToClipboard(jsonString);
        if (success) {
          console.log("Pattern copied to clipboard");
          return;
        }
      } catch {
        // 写入失败，继续进入手动复制模式
      }
    }

    // 不支持或写入失败，进入手动复制模式
    setExportValue(jsonString);
    setIsExportMode(true);
  };

  // 取消导出模式
  const handleCancelExport = () => {
    setIsExportMode(false);
    setExportValue("");
  };

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

  // 包装添加小节的函数，设置用户点击标记
  const handleUserAddBar = useCallback(() => {
    isUserAddBarRef.current = true;
    addBarCursorBeatRef.current = currentBeat;
    onAddBar(currentBeat);
  }, [onAddBar, currentBeat]);

  // 保存按钮的长按事件处理
  const saveButtonLongPressProps = useSingleLongPress({
    delay: 500,
    onLongPress: handleLongPressSave,
    onClick: onSaveCurrentPattern,
  });

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

  // 当用户点击+按钮增加小节数量时，如果满足条件，自动滚动到最新添加的小节位置
  useEffect(() => {
    // 只有当是用户点击+按钮且小节数增加时才执行滚动逻辑
    if (!isUserAddBarRef.current || pattern.bars <= lastBarsRef.current) {
      // 重置标记和上一次的小节数
      isUserAddBarRef.current = false;
      lastBarsRef.current = pattern.bars;
      return;
    }

    if (!scrollContainerRef.current || !crossPatternLoop) {
      // 重置标记和上一次的小节数
      isUserAddBarRef.current = false;
      lastBarsRef.current = pattern.bars;
      return;
    }

    // 检查是否非播放状态
    if (isPlaying) {
      // 重置标记和上一次的小节数
      isUserAddBarRef.current = false;
      lastBarsRef.current = pattern.bars;
      return;
    }

    // 检查结束小节所属的节奏型是否是当前选中的节奏型
    const isCurrentPattern = isDraftMode
      ? crossPatternLoop.endPatternName === ""
      : crossPatternLoop.endPatternName === pattern.name;

    // 如果是当前节奏型，且有滚动容器，则自动滚动到最新添加的小节位置
    if (isCurrentPattern) {
      const container = scrollContainerRef.current;
      const [beatsPerBar] = pattern.timeSignature;
      const subdivisionsPerBar = beatsPerBar * SUBDIVISIONS_PER_BEAT;

      // 根据添加 bar 时的游标位置计算新添加的小节位置
      let newBarIndex: number;
      if (addBarCursorBeatRef.current !== undefined) {
        const cursorBarIndex = Math.floor(
          addBarCursorBeatRef.current / subdivisionsPerBar
        );
        const cursorPositionInBar =
          addBarCursorBeatRef.current % subdivisionsPerBar;
        const barMidpoint = subdivisionsPerBar / 2;

        if (cursorPositionInBar < barMidpoint) {
          // 在小节前半部分添加，新小节在该小节前
          newBarIndex = cursorBarIndex;
        } else {
          // 在小节后半部分添加，新小节在该小节后
          newBarIndex = cursorBarIndex + 1;
        }
      } else {
        // 没有游标位置，新小节是最后一个小节
        newBarIndex = pattern.bars - 1;
      }

      const newBarStartIndex = newBarIndex * subdivisionsPerBar;
      const targetLeft = newBarStartIndex * cellSize;

      // 滚动到新小节，让它在视图中可见
      doScroll(container, targetLeft);
    }

    // 重置标记和上一次的小节数
    isUserAddBarRef.current = false;
    lastBarsRef.current = pattern.bars;
  }, [
    pattern.bars,
    isPlaying,
    isDraftMode,
    pattern.name,
    pattern.timeSignature,
    cellSize,
    doScroll,
    crossPatternLoop,
  ]);

  return (
    <div className="pattern-editor">
      <div className="pattern-editor-controls">
        <BarControls
          bars={pattern.bars}
          onAddBar={handleUserAddBar}
          onRemoveBar={onRemoveBar}
          canRemove={pattern.bars > 1}
          currentBeat={currentBeat}
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
            onImportPattern={onImportPattern}
            isDraftMode={isDraftMode}
          />
        </div>
        <div className="pattern-editor-actions-right">
          {/* 保存按钮 / 导出输入框 - 仅在非草稿模式下显示 */}
          {!isDraftMode && savedPatterns.some((p) => p.id === pattern.id) && (
            isExportMode ? (
              <input
                ref={exportInputRef}
                type="text"
                className="export-input"
                value={exportValue}
                onChange={() => {
                  // 忽略变化，保持原值（替代 readOnly，因为 readOnly 在某些移动浏览器上阻止选择）
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    handleCancelExport();
                  }
                }}
                onBlur={() => {
                  // 延迟取消，以便用户有时间复制
                  setTimeout(handleCancelExport, 150);
                }}
                onFocus={(e) => {
                  // 聚焦时全选内容
                  e.target.select();
                }}
                onClick={(e) => {
                  // 点击时全选内容
                  (e.target as HTMLInputElement).select();
                }}
                onTouchEnd={(e) => {
                  // 触摸结束时全选内容（移动端）
                  (e.target as HTMLInputElement).select();
                }}
              />
            ) : (
              <button
                className="action-button save-current-button"
                {...saveButtonLongPressProps}
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
            )
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
                width="12"
                height="12"
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
              width="14"
              height="14"
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
          onDoubleClick={onNotationDoubleClick}
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
