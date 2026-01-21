import { useState, useEffect } from "react";
import {
  preInitAudioContext,
  ensureSamplesLoaded,
  updateSampleCache,
  setSampleLoadProgressCallback,
  type SampleLoadProgressCallback,
} from "../utils/audioEngine";

interface LoadingProgress {
  loaded: number;
  total: number;
  currentName: string;
}

interface UseSampleLoaderReturn {
  /** 是否正在加载 */
  isLoading: boolean;
  /** 加载进度 */
  loadingProgress: LoadingProgress;
  /** 是否显示进度条（200ms 延迟后显示） */
  showProgress: boolean;
}

/**
 * 管理采样文件加载逻辑
 */
export function useSampleLoader(): UseSampleLoaderReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({
    loaded: 0,
    total: 11,
    currentName: "",
  });
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    const loadSamples = async () => {
      // 设置200ms后显示进度条
      const progressTimer = setTimeout(() => {
        setShowProgress(true);
      }, 200);

      try {
        // 设置进度回调
        const progressCallback: SampleLoadProgressCallback = (
          loaded,
          total,
          currentName
        ) => {
          setLoadingProgress({ loaded, total, currentName });
        };
        setSampleLoadProgressCallback(progressCallback);

        // 预先初始化 AudioContext
        preInitAudioContext();

        // 设置10秒超时
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error("Sample loading timeout")), 10000);
        });

        // 等待采样加载完成或超时
        await Promise.race([ensureSamplesLoaded(), timeoutPromise]);

        // 清除进度回调
        setSampleLoadProgressCallback(null);

        // 采样加载完成后，静默更新 IndexedDB 缓存
        // 不阻塞界面，在后台执行
        updateSampleCache().catch(() => {
          // 静默处理错误，不影响用户体验
        });
      } catch {
        // 采样加载失败或超时，使用合成音色作为后备
        // 静默处理，不打印日志
      } finally {
        // 清除进度条定时器
        clearTimeout(progressTimer);
        // 清除进度回调
        setSampleLoadProgressCallback(null);
        // 无论成功或失败，都显示界面
        setIsLoading(false);
      }
    };

    loadSamples();
  }, []);

  return {
    isLoading,
    loadingProgress,
    showProgress,
  };
}
