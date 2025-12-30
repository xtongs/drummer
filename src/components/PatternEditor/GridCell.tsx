import { useRef, useCallback } from "react";
import "./GridCell.css";
import { playDrumSound } from "../../utils/audioEngine";
import type { DrumType, CellState } from "../../types";
import { CELL_OFF, CELL_NORMAL, CELL_GHOST } from "../../types";

interface GridCellProps {
  cellState: CellState;
  onClick: () => void;
  onToggleGhost: () => void;
  isCurrentBeat?: boolean;
  drumType?: DrumType;
}

const LONG_PRESS_DURATION = 300; // 长按阈值（毫秒）

export function GridCell({
  cellState,
  onClick,
  onToggleGhost,
  isCurrentBeat,
  drumType,
}: GridCellProps) {
  // 防止重复触发
  const lastTriggerTimeRef = useRef<number>(0);
  const DEBOUNCE_TIME = 100;

  // 长按检测
  const pressStartTimeRef = useRef<number>(0);
  const longPressTriggeredRef = useRef<boolean>(false);
  const longPressTimerRef = useRef<number | null>(null);

  const isActive = cellState !== CELL_OFF;
  const isGhost = cellState === CELL_GHOST;

  const handleInteraction = useCallback(() => {
    const now = Date.now();
    if (now - lastTriggerTimeRef.current < DEBOUNCE_TIME) {
      return;
    }
    lastTriggerTimeRef.current = now;

    // 只有在选中时（从未激活变为激活）才播放声音
    if (drumType && !isActive) {
      playDrumSound(drumType);
    }
    onClick();
  }, [drumType, isActive, onClick]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") {
        return;
      }

      pressStartTimeRef.current = Date.now();
      longPressTriggeredRef.current = false;

      // 设置长按定时器
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTriggeredRef.current = true;
        // 长按时切换鬼音状态
        if (isActive) {
          onToggleGhost();
          // 播放鬼音声音预览
          if (drumType) {
            playDrumSound(drumType, cellState === CELL_NORMAL ? 0.3 : 1);
          }
        }
      }, LONG_PRESS_DURATION);
    },
    [isActive, onToggleGhost, drumType, cellState]
  );

  const handlePointerUp = useCallback(() => {
    // 清除长按定时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // 如果不是长按，执行普通点击
    if (!longPressTriggeredRef.current) {
      handleInteraction();
    }
  }, [handleInteraction]);

  const handlePointerLeave = useCallback(() => {
    // 指针离开时清除长按定时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  return (
    <button
      className={`grid-cell ${isActive ? "active" : ""} ${
        isGhost ? "ghost" : ""
      } ${isCurrentBeat ? "current-beat" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      type="button"
      aria-label={
        isGhost ? "Ghost note" : isActive ? "Active" : "Inactive"
      }
    />
  );
}
