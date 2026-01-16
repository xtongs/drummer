import { useEffect, useRef } from "react";
import { resumeAudioContext } from "../utils/audioEngine";

interface UseVisibilityHandlerOptions {
  isMetronomePlaying: boolean;
  isPatternPlaying: boolean;
  setIsMetronomePlaying: (playing: boolean) => void;
  setIsPatternPlaying: (playing: boolean) => void;
}

/**
 * 页面可见性变化时暂停/恢复播放（切换应用、标签页、弹窗等）
 */
export function useVisibilityHandler({
  isMetronomePlaying,
  isPatternPlaying,
  setIsMetronomePlaying,
  setIsPatternPlaying,
}: UseVisibilityHandlerOptions): void {
  // 使用 ref 记住隐藏前的播放状态
  const wasMetronomePlayingRef = useRef(false);
  const wasPatternPlayingRef = useRef(false);

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
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // 页面被隐藏时，记住当前播放状态并暂停所有播放
        wasMetronomePlayingRef.current = isMetronomePlayingRef.current;
        wasPatternPlayingRef.current = isPatternPlayingRef.current;
        setIsMetronomePlaying(false);
        setIsPatternPlaying(false);
      } else {
        // 页面重新可见时，恢复 AudioContext 并恢复之前的播放状态
        try {
          await resumeAudioContext();
          // 恢复之前的播放状态
          if (wasMetronomePlayingRef.current) {
            setIsMetronomePlaying(true);
          }
          if (wasPatternPlayingRef.current) {
            setIsPatternPlaying(true);
          }
        } catch (error) {
          // 如果恢复失败，忽略错误
          console.error("Failed to resume audio context:", error);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [setIsMetronomePlaying, setIsPatternPlaying]);
}
