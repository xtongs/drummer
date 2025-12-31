import { useRef, useCallback } from "react";
import "./GridCell.css";
import { playDrumSound } from "../../utils/audioEngine";
import type { DrumType, CellState } from "../../types";
import { CELL_OFF, CELL_NORMAL, CELL_GHOST, CELL_GRACE } from "../../types";

interface GridCellProps {
  cellState: CellState;
  onClick: () => void;
  onToggleGhost: () => void;
  isCurrentBeat?: boolean;
  drumType?: DrumType;
  subdivisionIndex?: number; // 用于计算交替背景色
}

const LONG_PRESS_DURATION = 300; // 长按阈值（毫秒）

export function GridCell({
  cellState,
  onClick,
  onToggleGhost,
  isCurrentBeat,
  drumType,
  subdivisionIndex = 0,
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
  const isGrace = cellState === CELL_GRACE;
  // 每4列为一组，奇数组使用交替背景色
  const isAlternateBeat = Math.floor(subdivisionIndex / 4) % 2 === 1;

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
        // 长按时切换音类型状态
        if (isActive) {
          onToggleGhost();
          // 播放声音预览
          if (drumType) {
            // 根据下一个状态播放预览：正常 -> 鬼音(0.3) -> 倚音(1) -> 正常(1)
            let nextState: typeof cellState;
            if (cellState === CELL_NORMAL) {
              nextState = CELL_GHOST;
            } else if (cellState === CELL_GHOST) {
              nextState = CELL_GRACE;
            } else {
              nextState = CELL_NORMAL;
            }
            const volume = nextState === CELL_GHOST ? 0.3 : 1;
            playDrumSound(drumType, volume);
          }
        }
      }, LONG_PRESS_DURATION);
    },
    [isActive, onToggleGhost, drumType, cellState]
  );

  const handlePointerUp = useCallback(() => {
    const wasLongPress = longPressTriggeredRef.current;
    
    // 清除长按定时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // 如果长按已触发，重置状态并阻止点击
    if (wasLongPress) {
      longPressTriggeredRef.current = false;
      return; // 阻止点击操作
    }

    // 检查按下时间，如果超过长按阈值，也不执行点击
    const pressDuration = Date.now() - pressStartTimeRef.current;
    if (pressDuration < LONG_PRESS_DURATION) {
      handleInteraction();
    }
  }, [handleInteraction]);

  const handlePointerLeave = useCallback(() => {
    // 指针离开时清除长按定时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    // 如果长按已触发，重置状态
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
    }
  }, []);

  return (
    <button
      className={`grid-cell ${isActive ? "active" : ""} ${
        isGhost ? "ghost" : ""
      } ${isGrace ? "grace" : ""} ${isCurrentBeat ? "current-beat" : ""} ${isAlternateBeat ? "alt-beat" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      type="button"
      aria-label={
        isGrace ? "Grace note" : isGhost ? "Ghost note" : isActive ? "Active" : "Inactive"
      }
    />
  );
}
