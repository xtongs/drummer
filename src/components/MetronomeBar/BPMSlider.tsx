import { useRef, useState, useCallback, useEffect } from "react";
import "./BPMSlider.css";

interface BPMSliderProps {
  bpm: number;
  onChange: (bpm: number) => void;
  min?: number;
  max?: number;
}

export function BPMSlider({
  bpm,
  onChange,
  min = 40,
  max = 200,
}: BPMSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 将BPM值转换为百分比
  const getPercentage = useCallback(
    (value: number) => {
      return ((value - min) / (max - min)) * 100;
    },
    [min, max]
  );

  // 将百分比转换为BPM值（5BPM步进）
  const getBPMFromPercentage = useCallback(
    (percentage: number) => {
      const rawValue = min + (percentage / 100) * (max - min);
      // 四舍五入到最近的5的倍数
      return Math.round(rawValue / 5) * 5;
    },
    [min, max]
  );

  // 处理鼠标/触摸事件
  const handlePointerMove = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const percentage = Math.max(
        0,
        Math.min(100, ((clientX - rect.left) / rect.width) * 100)
      );
      const newBPM = getBPMFromPercentage(percentage);
      const clampedBPM = Math.max(min, Math.min(max, newBPM));
      onChange(clampedBPM);
    },
    [getBPMFromPercentage, min, max, onChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      handlePointerMove(e.clientX);
      e.preventDefault();
    },
    [handlePointerMove]
  );

  const handlePointerMoveEvent = useCallback(
    (e: PointerEvent) => {
      if (isDragging) {
        handlePointerMove(e.clientX);
      }
    },
    [isDragging, handlePointerMove]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 添加全局事件监听
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("pointermove", handlePointerMoveEvent);
      window.addEventListener("pointerup", handlePointerUp);
      return () => {
        window.removeEventListener("pointermove", handlePointerMoveEvent);
        window.removeEventListener("pointerup", handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMoveEvent, handlePointerUp]);

  const percentage = getPercentage(bpm);
  // 限制滑块位置在 0% 到 100% 之间，考虑滑块的宽度
  const thumbPosition = Math.max(0, Math.min(100, percentage));

  return (
    <div className="bpm-slider-container">
      <div
        ref={sliderRef}
        className="bpm-slider-track"
        onPointerDown={handlePointerDown}
      >
        <div
          className="bpm-slider-fill"
          style={{ width: `${percentage}%` }}
        />
        <div
          className="bpm-slider-thumb"
          style={{ 
            left: `${thumbPosition}%`,
            '--thumb-position': `${thumbPosition}%`
          } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

