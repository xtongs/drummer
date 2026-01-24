import { useRef } from "react";
import "./PlayButton.css";

interface PlayButtonProps {
  isPlaying: boolean;
  onClick: () => void;
  loopCount?: number;
  onResetCount?: () => void;
}

export function PlayButton({
  isPlaying,
  onClick,
  loopCount = 0,
  onResetCount,
}: PlayButtonProps) {
  const longPressTimerRef = useRef<number | null>(null);
  const hasLongPressedRef = useRef<boolean>(false);
  const touchStartTimeRef = useRef<number>(0);
  const LONG_PRESS_DURATION = 500; // 长按持续时间（毫秒）

  const handleMouseDown = () => {
    if (!onResetCount) return;
    hasLongPressedRef.current = false;

    longPressTimerRef.current = window.setTimeout(() => {
      onResetCount();
      hasLongPressedRef.current = true;
      longPressTimerRef.current = null;
    }, LONG_PRESS_DURATION);
  };

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchStart = () => {
    if (!onResetCount) return;
    touchStartTimeRef.current = Date.now();
    hasLongPressedRef.current = false;

    longPressTimerRef.current = window.setTimeout(() => {
      onResetCount();
      hasLongPressedRef.current = true;
      longPressTimerRef.current = null;
    }, LONG_PRESS_DURATION);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    // 如果发生了长按，阻止后续的 click 事件
    if (hasLongPressedRef.current) {
      e.preventDefault();
      // 延迟重置标志，确保阻止了 click
      setTimeout(() => {
        hasLongPressedRef.current = false;
      }, 100);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // 如果发生了长按，阻止点击事件
    if (hasLongPressedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      hasLongPressedRef.current = false;
      return;
    }
    onClick();
  };

  // 当计数大于0时，显示数字；否则显示图标
  const showCount = loopCount > 0;

  return (
    <button
      className={"play-button" + (isPlaying ? " playing" : " paused")}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label={isPlaying ? "Pause" : "Play"}
    >
      {showCount ? (
        <span className="play-button-count">{loopCount}</span>
      ) : isPlaying ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      ) : (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="play-icon"
        >
          <polygon points="6 3 18 12 6 21" />
        </svg>
      )}
    </button>
  );
}
