import { useRef } from "react";
import "./BottomPlayButton.css";

// 速率选项：1 → 0.9 → 0.8 → 0.7 → 0.6 → 0.5 → 循环
const RATE_OPTIONS = [1, 0.9, 0.8, 0.7, 0.6, 0.5];

interface BottomPlayButtonProps {
  isPlaying: boolean;
  onClick: () => void;
  bpmRate: number;
  onBpmRateChange: (rate: number) => void;
}

export function BottomPlayButton({
  isPlaying,
  onClick,
  bpmRate,
  onBpmRateChange,
}: BottomPlayButtonProps) {
  const longPressTimerRef = useRef<number | null>(null);
  const hasLongPressedRef = useRef<boolean>(false);
  const LONG_PRESS_DURATION = 500; // 长按持续时间（毫秒）

  const handleRateToggle = () => {
    const currentIndex = RATE_OPTIONS.indexOf(bpmRate);
    const nextIndex = (currentIndex + 1) % RATE_OPTIONS.length;
    onBpmRateChange(RATE_OPTIONS[nextIndex]);
  };

  const handleMouseDown = () => {
    hasLongPressedRef.current = false;

    longPressTimerRef.current = window.setTimeout(() => {
      handleRateToggle();
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

  // 当 rate 不为 1 时，使用特殊色
  const hasRateApplied = bpmRate !== 1;

  // 格式化显示速率
  const formatRate = (rate: number) => {
    if (rate === 1) return "1";
    return `${rate}`;
  };

  return (
    <div className="bottom-play-button-container">
      <button
        className={`bottom-play-button ${hasRateApplied ? "rate-applied" : ""}`}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        aria-label={isPlaying ? "Pause Metronome" : "Play Metronome"}
      >
        {hasRateApplied ? (
          <span className="bottom-play-button-rate">{formatRate(bpmRate)}</span>
        ) : isPlaying ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg
            width="28"
            height="28"
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
