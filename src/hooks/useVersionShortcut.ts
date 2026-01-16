import { useEffect } from "react";

const CLICK_THRESHOLD = 300;
const REQUIRED_CLICKS = 5;

/**
 * 检测快速点击空白区域5次来显示版本号
 */
export function useVersionShortcut(): void {
  useEffect(() => {
    const clickCountRef = { count: 0 };
    const lastClickTimeRef = { time: 0 };

    const shouldIgnoreClick = (target: HTMLElement): boolean => {
      return !!(
        target.closest("button") ||
        target.closest("input") ||
        target.closest("select") ||
        target.closest("a") ||
        target.closest(".bottom-play-button-container")
      );
    };

    const handleInteraction = (e: PointerEvent) => {
      const target = e.target as HTMLElement;

      if (shouldIgnoreClick(target)) {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastClickTimeRef.time;

      if (timeDiff > CLICK_THRESHOLD) {
        clickCountRef.count = 0;
      }

      clickCountRef.count++;
      lastClickTimeRef.time = now;

      if (clickCountRef.count >= REQUIRED_CLICKS) {
        window.dispatchEvent(new CustomEvent("show-version"));
        clickCountRef.count = 0;
      }
    };

    document.body.addEventListener("pointerdown", handleInteraction, {
      passive: true,
    });

    return () => {
      document.body.removeEventListener("pointerdown", handleInteraction);
    };
  }, []);
}
