import { useRef, useCallback, useState } from "react";
import "./GridCell.css";
import { playDrumSound } from "../../utils/audioEngine";
import type { DrumType, CellState } from "../../types";
import {
  CELL_OFF,
  CELL_NORMAL,
  CELL_GHOST,
  CELL_GRACE,
  CELL_DOUBLE_32,
  CELL_FIRST_32,
  CELL_SECOND_32,
} from "../../types";

interface GridCellProps {
  cellState: CellState;
  onClick: () => void;
  onToggleGhost: () => void;
  onDoubleClick?: () => void;
  isCurrentBeat?: boolean;
  drumType?: DrumType;
  subdivisionIndex?: number;
  style?: React.CSSProperties;
}

const LONG_PRESS_DURATION = 300; // 长按阈值（毫秒）
const DOUBLE_CLICK_INTERVAL = 200; // 缩短双击检测间隔以减少延迟
const VISUAL_FEEDBACK_DELAY = 30; // 视觉反馈延迟，确保能被用户感知

export function GridCell({
  cellState,
  onClick,
  onToggleGhost,
  onDoubleClick,
  isCurrentBeat,
  drumType,
  subdivisionIndex = 0,
  style,
}: GridCellProps) {
  // 防止重复触发
  const lastTriggerTimeRef = useRef<number>(0);
  const DEBOUNCE_TIME = 100;
  const lastClickTimeRef = useRef<number>(0);
  const singleClickTimerRef = useRef<number | null>(null);
  const visualFeedbackTimerRef = useRef<number | null>(null);
  const pendingClickRef = useRef<boolean>(false);

  // 长按检测
  const pressStartTimeRef = useRef<number>(0);
  const longPressTriggeredRef = useRef<boolean>(false);
  const longPressTimerRef = useRef<number | null>(null);

  // 视觉反馈状态
  const [isPressing, setIsPressing] = useState(false);

  const isActive = cellState !== CELL_OFF;
  const isGhost = cellState === CELL_GHOST;
  const isGrace = cellState === CELL_GRACE;
  const isDouble32 = cellState === CELL_DOUBLE_32;
  const isFirst32 = cellState === CELL_FIRST_32;
  const isSecond32 = cellState === CELL_SECOND_32;
  const isThirtySecond = isDouble32 || isFirst32 || isSecond32;
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
      pendingClickRef.current = true;

      // 立即提供视觉反馈
      setIsPressing(true);

      // 设置长按定时器
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTriggeredRef.current = true;
        pendingClickRef.current = false;

        // 长按时切换音类型状态
        if (isActive && !isThirtySecond) {
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

        // 长按后移除视觉反馈
        setIsPressing(false);
      }, LONG_PRESS_DURATION);
    },
    [isActive, onToggleGhost, drumType, cellState, isThirtySecond]
  );

  const handlePointerUp = useCallback(() => {
    const wasLongPress = longPressTriggeredRef.current;
    const wasPendingClick = pendingClickRef.current;

    // 清除长按定时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // 移除视觉反馈
    visualFeedbackTimerRef.current = window.setTimeout(() => {
      setIsPressing(false);
    }, VISUAL_FEEDBACK_DELAY);

    // 如果长按已触发，重置状态并阻止点击
    if (wasLongPress) {
      longPressTriggeredRef.current = false;
      return; // 阻止点击操作
    }

    // 检查按下时间，如果超过长按阈值，也不执行点击
    const pressDuration = Date.now() - pressStartTimeRef.current;
    if (pressDuration < LONG_PRESS_DURATION && wasPendingClick) {
      const now = Date.now();
      const timeSinceLastClick = now - lastClickTimeRef.current;

      // 双击：取消待执行的单击并执行双击处理
      if (timeSinceLastClick < DOUBLE_CLICK_INTERVAL) {
        lastClickTimeRef.current = 0;
        if (singleClickTimerRef.current) {
          clearTimeout(singleClickTimerRef.current);
          singleClickTimerRef.current = null;
        }
        if (onDoubleClick) {
          onDoubleClick();
        }
        return;
      }

      // 否则延迟执行单击，等待是否有第二次点击
      lastClickTimeRef.current = now;
      if (singleClickTimerRef.current) {
        clearTimeout(singleClickTimerRef.current);
      }
      singleClickTimerRef.current = window.setTimeout(() => {
        handleInteraction();
        singleClickTimerRef.current = null;
      }, DOUBLE_CLICK_INTERVAL);
    }
  }, [handleInteraction, onDoubleClick]);

  const handlePointerLeave = useCallback(() => {
    // 指针离开时清除长按定时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // 清除视觉反馈定时器
    if (visualFeedbackTimerRef.current) {
      clearTimeout(visualFeedbackTimerRef.current);
      visualFeedbackTimerRef.current = null;
    }

    // 移除视觉反馈
    setIsPressing(false);

    // 如果长按已触发，重置状态
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
    }

    pendingClickRef.current = false;
  }, []);

  return (
    <button
      className={`grid-cell ${isActive ? "active" : ""} ${isGhost ? "ghost" : ""
        } ${isGrace ? "grace" : ""
        } ${isThirtySecond ? "thirty-second" : ""
        } ${isDouble32 ? "double-32" : ""
        } ${isFirst32 ? "first-32" : ""
        } ${isSecond32 ? "second-32" : ""
        } ${isCurrentBeat ? "current-beat" : ""
        } ${isAlternateBeat ? "alt-beat" : ""
        } ${isPressing ? "pressing" : ""
        }`}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      type="button"
      aria-label={
        isGrace ? "Grace note" : isGhost ? "Ghost note" : isActive ? "Active" : "Inactive"
      }
    >
      {isThirtySecond && (
        <div
          className={`cell-32-dots ${isDouble32 ? "double" : isFirst32 ? "first" : "second"
            }`}
          aria-hidden="true"
        >
          {(isDouble32 || isFirst32) && <span className="dot left" />}
          {(isDouble32 || isSecond32) && <span className="dot right" />}
        </div>
      )}
    </button>
  );
}
