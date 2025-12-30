import { useRef, useCallback } from "react";
import "./GridCell.css";
import { playDrumSound } from "../../utils/audioEngine";
import type { DrumType } from "../../types";

interface GridCellProps {
  isActive: boolean;
  onClick: () => void;
  isCurrentBeat?: boolean;
  drumType?: DrumType;
}

export function GridCell({ isActive, onClick, isCurrentBeat, drumType }: GridCellProps) {
  // 防止重复触发（pointer 和 click 事件可能同时触发）
  const lastTriggerTimeRef = useRef<number>(0);
  const DEBOUNCE_TIME = 100; // 100ms 内只响应一次

  const handleInteraction = useCallback(() => {
    const now = Date.now();
    if (now - lastTriggerTimeRef.current < DEBOUNCE_TIME) {
      return; // 防抖：忽略快速重复触发
    }
    lastTriggerTimeRef.current = now;

    // 点击时播放对应的鼓件声音
    if (drumType) {
      playDrumSound(drumType);
    }
    onClick();
  }, [drumType, onClick]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // 只处理主按钮（鼠标左键或触摸）
      if (e.button !== 0 && e.pointerType === "mouse") {
        return;
      }
      handleInteraction();
    },
    [handleInteraction]
  );

  return (
    <button
      className={`grid-cell ${isActive ? "active" : ""} ${
        isCurrentBeat ? "current-beat" : ""
      }`}
      onPointerDown={handlePointerDown}
      type="button"
      aria-label={isActive ? "Active" : "Inactive"}
    />
  );
}

