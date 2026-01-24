import {
  useRef,
  useEffect,
  useCallback /* 临时注释: useState, NotationRenderer */,
} from "react";
import {
  DrumNotation /* 临时注释: RENDERER_CHANGE_EVENT */,
} from "./DrumNotation";
import { Grid } from "./Grid";
import { GridLabels } from "./GridLabels";
import { BarControls } from "./BarControls";
import { LoopRangeSelector } from "./LoopRangeSelector";
import { PatternTabs } from "../PatternManager/PatternTabs";
import { BackgroundMusicControls } from "./BackgroundMusicControls";
import type { Pattern, CrossPatternLoop } from "../../types";
import { useGridCellSize } from "../../hooks/useGridCellSize";
import { usePracticeCellSize } from "../../hooks/usePracticeCellSize";
import { useFullPracticeMode } from "../../hooks/useFullPracticeMode";
import { useLandscapeMode } from "../../hooks/useLandscapeMode";
import { useSingleLongPress } from "../../hooks/useSingleLongPress";
import { useExportMode } from "../../hooks/useExportMode";
import { usePlaybackAutoScroll } from "../../hooks/usePlaybackAutoScroll";
import { SUBDIVISIONS_PER_BEAT } from "../../utils/constants";
import { toggleFullPracticeMode } from "../../utils/fullPracticeMode";
import {
  serializePatternToJSON,
  /* 临时注释: getNotationRenderer, setNotationRenderer, type NotationRenderer, */
} from "../../utils/storage";
import type { BgmConfig } from "../../utils/bgmStorage";
import "./PatternEditor.css";

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
  bgmConfig: BgmConfig;
  bgmIsLoading: boolean;
  bgmIsLoaded: boolean;
  bgmError: string | null;
  onBgmUpload: (file: File) => void;
  onBgmOffsetChange: (offsetMs: number) => void;
  onBgmVolumeChange: (volumePct: number) => void;
  onBgmDelete: () => void;
  masterVolume: number;
  onMasterVolumeChange: (volumePct: number) => void;
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
  bgmConfig,
  bgmIsLoading,
  bgmIsLoaded,
  bgmError,
  onBgmUpload,
  onBgmOffsetChange,
  onBgmVolumeChange,
  onBgmDelete,
  masterVolume,
  onMasterVolumeChange,
}: PatternEditorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastBarsRef = useRef(pattern.bars); // 跟踪上一次的小节数
  const isUserAddBarRef = useRef(false); // 标记是否是用户点击+按钮增加的小节数
  const addBarCursorBeatRef = useRef<number | undefined>(undefined); // 记录添加bar时的游标位置
  const isFullPracticeMode = useFullPracticeMode();
  const isLandscapeMode = useLandscapeMode();
  const defaultCellSize = useGridCellSize(); // 动态计算单元格大小
  const [beatsPerBar] = pattern.timeSignature;
  const practiceCellSize = usePracticeCellSize(beatsPerBar, 2);
  const cellSize = isLandscapeMode ? practiceCellSize : defaultCellSize;

  // 渲染器切换状态
  // 临时注释: 固定为 vexflow，不再读取 localstorage，不再使用 useState
  // const [notationRenderer, setNotationRendererState] = useState<NotationRenderer>(() =>
  //   getNotationRenderer()
  // );
  // const [notationRenderer] = useState<NotationRenderer>("vexflow");
  // notationRenderer 用于将来恢复切换功能时使用
  // const handleToggleRenderer = useCallback(() => {
  //   const newRenderer: NotationRenderer =
  //     notationRenderer === "legacy" ? "vexflow" : "legacy";
  //   setNotationRendererState(newRenderer);
  //   setNotationRendererState(newRenderer);
  //   // 派发事件通知 DrumNotation 组件
  //   window.dispatchEvent(new CustomEvent(RENDERER_CHANGE_EVENT));
  // }, [notationRenderer]);

  // 播放时自动滚动
  const { doScroll } = usePlaybackAutoScroll({
    scrollContainerRef,
    currentBeat,
    cellSize,
    pattern,
    crossPatternLoop,
    isDraftMode,
    isPlaying,
  });

  // 导出模式：获取当前 pattern 的 JSON 内容
  const currentPatternForExport = savedPatterns.find(
    (p) => p.id === pattern.id,
  );
  const exportContent = currentPatternForExport
    ? serializePatternToJSON(currentPatternForExport)
    : "";
  const {
    isExportMode,
    exportValue,
    exportInputRef,
    cancelExport: handleCancelExport,
    tryExportToClipboard,
  } = useExportMode(exportContent);

  // 长按保存按钮处理：先尝试自动写入剪贴板，失败则进入手动复制模式
  const handleLongPressSave = async () => {
    if (!currentPatternForExport) return;
    const success = await tryExportToClipboard();
    if (success) {
      console.log("Pattern copied to clipboard");
    }
  };

  // 包装添加小节的函数，设置用户点击标记
  const handleUserAddBar = useCallback(() => {
    isUserAddBarRef.current = true;
    addBarCursorBeatRef.current = currentBeat;
    onAddBar(currentBeat);
  }, [onAddBar, currentBeat]);

  const handlePracticeModeToggle = useCallback(() => {
    toggleFullPracticeMode();
  }, []);

  // 保存按钮的长按事件处理
  const saveButtonLongPressProps = useSingleLongPress({
    delay: 500,
    onLongPress: handleLongPressSave,
    onClick: onSaveCurrentPattern,
  });

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
          addBarCursorBeatRef.current / subdivisionsPerBar,
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
    <div
      className={`pattern-editor${isLandscapeMode ? " landscape-mode" : ""}`}
    >
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
          <button
            type="button"
            className={`action-button practice-toggle-button${
              isFullPracticeMode ? " active" : ""
            }`}
            onClick={handlePracticeModeToggle}
            aria-label="Toggle practice mode"
            title="Toggle practice mode"
            aria-pressed={isFullPracticeMode}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </button>
          {/* 临时注释: 隐藏渲染器切换按钮，固定使用 vexflow */}
          {/* <button
            className={`action-button renderer-toggle-button ${
              notationRenderer === "vexflow" ? "active" : ""
            }`}
            onClick={handleToggleRenderer}
            aria-label={
              notationRenderer === "vexflow"
                ? "Switch to Legacy Renderer"
                : "Switch to VexFlow Renderer"
            }
            title={
              notationRenderer === "vexflow"
                ? "Using VexFlow (click to switch to Legacy)"
                : "Using Legacy (click to switch to VexFlow)"
            }
          >
            音符图标
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </button>
          {/* 保存按钮 / 导出输入框 - 仅在非草稿模式下显示 */}
          {!isDraftMode &&
            savedPatterns.some((p) => p.id === pattern.id) &&
            (isExportMode ? (
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
            ))}
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
          cellSize={cellSize}
          currentBeat={currentBeat}
          scrollContainerRef={scrollContainerRef}
          onDoubleClick={onNotationDoubleClick}
        />
        <GridLabels pattern={pattern} cellSize={cellSize} />
        {!isLandscapeMode && (
          <Grid
            pattern={pattern}
            cellSize={cellSize}
            onCellClick={onCellClick}
            onToggleGhost={onToggleGhost}
            onCellDoubleClick={onCycleThirtySecond}
            currentBeat={currentBeat}
            scrollContainerRef={scrollContainerRef}
          />
        )}
        {!isLandscapeMode && isFullPracticeMode && (
          <BackgroundMusicControls
            config={bgmConfig}
            isLoading={bgmIsLoading}
            isLoaded={bgmIsLoaded}
            error={bgmError}
            onUpload={onBgmUpload}
            onOffsetChange={onBgmOffsetChange}
            onVolumeChange={onBgmVolumeChange}
            masterVolume={masterVolume}
            onMasterVolumeChange={onMasterVolumeChange}
            onDelete={onBgmDelete}
            isPlaying={isPlaying}
          />
        )}
      </div>

      {isLandscapeMode && isFullPracticeMode && (
        <BackgroundMusicControls
          config={bgmConfig}
          isLoading={bgmIsLoading}
          isLoaded={bgmIsLoaded}
          error={bgmError}
          onUpload={onBgmUpload}
          onOffsetChange={onBgmOffsetChange}
          onVolumeChange={onBgmVolumeChange}
          masterVolume={masterVolume}
          onMasterVolumeChange={onMasterVolumeChange}
          onDelete={onBgmDelete}
          isPlaying={isPlaying}
        />
      )}
    </div>
  );
}
