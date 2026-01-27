import { useRef } from "react";
import "./BottomPlayButton.css";

interface BottomPlayButtonProps {
  isPlaying: boolean;
  onClick: () => void;
  onLongPress?: () => void;
  variant?: "floating" | "inline";
  fullPracticeMode?: boolean; // 是否为完整练习模式
  isCountInEnabled?: boolean; // 是否启用预备拍功能
}

export function BottomPlayButton({
  isPlaying,
  onClick,
  onLongPress,
  variant = "floating",
  fullPracticeMode = false,
  isCountInEnabled = false,
}: BottomPlayButtonProps) {
  const longPressTimerRef = useRef<number | null>(null);
  const hasLongPressedRef = useRef<boolean>(false);
  const LONG_PRESS_DURATION = 500;

  const handleMouseDown = () => {
    if (isPlaying) return;
    if (!onLongPress) return;
    hasLongPressedRef.current = false;

    longPressTimerRef.current = window.setTimeout(() => {
      onLongPress();
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
    if (isPlaying) return;
    if (!onLongPress) return;
    hasLongPressedRef.current = false;

    longPressTimerRef.current = window.setTimeout(() => {
      onLongPress();
      hasLongPressedRef.current = true;
      longPressTimerRef.current = null;
    }, LONG_PRESS_DURATION);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (hasLongPressedRef.current) {
      e.preventDefault();
      setTimeout(() => {
        hasLongPressedRef.current = false;
      }, 100);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (hasLongPressedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      hasLongPressedRef.current = false;
      return;
    }
    // 如果有 BGM 播放或者有countin开启，则点击变成停止行为，先触发长按行为
    if ((fullPracticeMode || isCountInEnabled) && isPlaying && onLongPress) {
      onClick();
      setTimeout(() => {
        hasLongPressedRef.current = false;
        onLongPress();
      }, 300);
      return;
    } else {
      onClick();
    }
  };

  return (
    <div
      className={`bottom-play-button-container${variant === "inline" ? " inline" : ""}`}
    >
      <button
        className={`bottom-play-button${variant === "inline" ? " inline" : ""}${isPlaying ? " playing" : " paused"}`}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-label={isPlaying ? "Pause Pattern" : "Play Pattern"}
      >
        {isPlaying ? (
          <>
            {fullPracticeMode || isCountInEnabled ? (
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="6" y="6" width="12" height="12" />
              </svg>
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            )}
          </>
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
    </div>
  );
}
