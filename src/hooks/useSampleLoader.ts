import { useState, useEffect, useRef } from "react";
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
  /** 是否正在淡出 */
  isFadingOut: boolean;
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
  const [isFadingOut, setIsFadingOut] = useState(false);
  const progressActuallyShownRef = useRef(false);
  const loadingCompleteRef = useRef(false);
  const currentProgressRef = useRef({ loaded: 0, total: 11 });

  useEffect(() => {
    const loadSamples = async () => {
      // 设置200ms后显示进度条
      const progressTimer = setTimeout(() => {
        setShowProgress(true);
        progressActuallyShownRef.current = true;
      }, 200);

      let fadeOutTimer: NodeJS.Timeout | null = null;

      // 启动淡出的函数
      const startFadeOut = () => {
        // 清除进度回调
        setSampleLoadProgressCallback(null);
        // 等待 300ms 让进度条动画完成
        setTimeout(() => {
          setIsFadingOut(true);
          // 淡出动画完成后再隐藏界面
          setTimeout(() => {
            setIsLoading(false);
          }, 300);
        }, 300);
      };

      try {
        // 设置进度回调
        const progressCallback: SampleLoadProgressCallback = (
          loaded,
          total,
          currentName,
        ) => {
          // 更新 state（用于渲染）
          setLoadingProgress({ loaded, total, currentName });
          // 更新 ref（用于 finally 逻辑）
          currentProgressRef.current = { loaded, total };

          // 当进度到达 100% 时，开始准备淡出
          if (
            loaded === total &&
            progressActuallyShownRef.current &&
            !fadeOutTimer
          ) {
            fadeOutTimer = setTimeout(startFadeOut, 0);
          }
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

        // 标记加载完成
        loadingCompleteRef.current = true;

        // 如果进度条没有显示（加载很快），直接淡出
        if (!progressActuallyShownRef.current) {
          // 清除进度回调
          setSampleLoadProgressCallback(null);
          // 直接淡出，不等待
          setIsFadingOut(true);
          setTimeout(() => {
            setIsLoading(false);
          }, 300);
        } else if (!fadeOutTimer) {
          // 如果进度条显示了，但还没有开始淡出倒计时
          //（可能最后一次进度回调还没触发，或 loaded < total）
          const { loaded, total } = currentProgressRef.current;

          if (loaded === total) {
            // 进度已经到 100%，开始淡出
            startFadeOut();
          } else {
            // 进度没到 100%，强制更新到 100% 然后淡出
            setLoadingProgress((prev) => ({ ...prev, loaded: prev.total }));
            setTimeout(startFadeOut, 300);
          }
        }
        // 如果 fadeOutTimer 已经设置，淡出逻辑会在进度回调中处理
      }
    };

    loadSamples();
  }, []);

  return {
    isLoading,
    loadingProgress,
    showProgress,
    isFadingOut,
  };
}
