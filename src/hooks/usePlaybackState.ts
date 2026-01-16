import { useState, useCallback } from "react";

interface UsePlaybackStateReturn {
  /** 节拍器是否正在播放 */
  isMetronomePlaying: boolean;
  /** 节奏型是否正在播放 */
  isPatternPlaying: boolean;
  /** 切换节拍器播放（会停止节奏型播放） */
  toggleMetronomePlay: () => void;
  /** 切换节奏型播放（会停止节拍器播放） */
  togglePatternPlay: () => void;
  /** 停止所有播放 */
  stopAll: () => void;
  /** 直接设置节拍器播放状态 */
  setIsMetronomePlaying: React.Dispatch<React.SetStateAction<boolean>>;
  /** 直接设置节奏型播放状态 */
  setIsPatternPlaying: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * 管理节拍器和节奏型的播放状态
 * 两者互斥：开始播放一个会停止另一个
 */
export function usePlaybackState(): UsePlaybackStateReturn {
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);
  const [isPatternPlaying, setIsPatternPlaying] = useState(false);

  const toggleMetronomePlay = useCallback(() => {
    setIsMetronomePlaying((prev) => {
      const newValue = !prev;
      // 如果节拍器开始播放，停止节奏型播放
      if (newValue) {
        setIsPatternPlaying(false);
      }
      return newValue;
    });
  }, []);

  const togglePatternPlay = useCallback(() => {
    setIsPatternPlaying((prev) => {
      const newValue = !prev;
      // 如果节奏型开始播放，停止节拍器播放
      if (newValue) {
        setIsMetronomePlaying(false);
      }
      return newValue;
    });
  }, []);

  const stopAll = useCallback(() => {
    setIsMetronomePlaying(false);
    setIsPatternPlaying(false);
  }, []);

  return {
    isMetronomePlaying,
    isPatternPlaying,
    toggleMetronomePlay,
    togglePatternPlay,
    stopAll,
    setIsMetronomePlaying,
    setIsPatternPlaying,
  };
}
