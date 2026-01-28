import { useEffect, useRef } from "react";

/**
 * 防误触退出：当有播放进行时阻止页面关闭
 * @param isMetronomePlaying - 节拍器是否正在播放
 * @param isPatternPlaying - 节奏型是否正在播放
 */
export function useBeforeUnloadWarning(
  isMetronomePlaying: boolean,
  isPatternPlaying: boolean,
): void {
  // 使用 ref 存储当前播放状态，避免闭包问题
  const isMetronomePlayingRef = useRef(isMetronomePlaying);
  const isPatternPlayingRef = useRef(isPatternPlaying);

  // 同步更新 ref 中的播放状态
  useEffect(() => {
    isMetronomePlayingRef.current = isMetronomePlaying;
  }, [isMetronomePlaying]);

  useEffect(() => {
    isPatternPlayingRef.current = isPatternPlaying;
  }, [isPatternPlaying]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isMetronomePlayingRef.current || isPatternPlayingRef.current) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
}
