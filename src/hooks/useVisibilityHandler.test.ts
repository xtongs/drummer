import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVisibilityHandler } from "./useVisibilityHandler";

// Mock resumeAudioContext
vi.mock("../utils/audioEngine", () => ({
  resumeAudioContext: vi.fn().mockResolvedValue(undefined),
}));

describe("useVisibilityHandler", () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let visibilityHandler: ((event: Event) => void) | undefined;

  // 辅助函数：获取 visibilitychange 事件处理程序
  const getVisibilityHandler = (): ((event: Event) => void) => {
    const call = addEventListenerSpy.mock.calls.find(
      (c: unknown[]) => c[0] === "visibilitychange",
    );
    return call?.[1] as (event: Event) => void;
  };

  // 辅助函数：模拟页面隐藏
  const simulateHidden = async () => {
    Object.defineProperty(document, "hidden", {
      value: true,
      writable: true,
      configurable: true,
    });
    await act(async () => {
      visibilityHandler?.(new Event("visibilitychange"));
    });
  };

  // 辅助函数：模拟页面可见
  const simulateVisible = async () => {
    Object.defineProperty(document, "hidden", {
      value: false,
      writable: true,
      configurable: true,
    });
    await act(async () => {
      visibilityHandler?.(new Event("visibilitychange"));
    });
  };

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(document, "addEventListener");
    removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
    // 默认页面可见
    Object.defineProperty(document, "hidden", {
      value: false,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("应该在挂载时添加 visibilitychange 事件监听器", () => {
    const setIsMetronomePlaying = vi.fn();
    const setIsPatternPlaying = vi.fn();

    renderHook(() =>
      useVisibilityHandler({
        isMetronomePlaying: false,
        isPatternPlaying: false,
        setIsMetronomePlaying,
        setIsPatternPlaying,
      }),
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
  });

  it("应该在卸载时移除 visibilitychange 事件监听器", () => {
    const setIsMetronomePlaying = vi.fn();
    const setIsPatternPlaying = vi.fn();

    const { unmount } = renderHook(() =>
      useVisibilityHandler({
        isMetronomePlaying: false,
        isPatternPlaying: false,
        setIsMetronomePlaying,
        setIsPatternPlaying,
      }),
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
  });

  describe("当页面隐藏时", () => {
    it("应该暂停节拍器播放", async () => {
      const setIsMetronomePlaying = vi.fn();
      const setIsPatternPlaying = vi.fn();

      renderHook(() =>
        useVisibilityHandler({
          isMetronomePlaying: true,
          isPatternPlaying: false,
          setIsMetronomePlaying,
          setIsPatternPlaying,
        }),
      );

      visibilityHandler = getVisibilityHandler();
      await simulateHidden();

      expect(setIsMetronomePlaying).toHaveBeenCalledWith(false);
    });

    it("应该暂停节奏型播放", async () => {
      const setIsMetronomePlaying = vi.fn();
      const setIsPatternPlaying = vi.fn();

      renderHook(() =>
        useVisibilityHandler({
          isMetronomePlaying: false,
          isPatternPlaying: true,
          setIsMetronomePlaying,
          setIsPatternPlaying,
        }),
      );

      visibilityHandler = getVisibilityHandler();
      await simulateHidden();

      expect(setIsPatternPlaying).toHaveBeenCalledWith(false);
    });

    it("应该暂停所有播放", async () => {
      const setIsMetronomePlaying = vi.fn();
      const setIsPatternPlaying = vi.fn();

      renderHook(() =>
        useVisibilityHandler({
          isMetronomePlaying: true,
          isPatternPlaying: true,
          setIsMetronomePlaying,
          setIsPatternPlaying,
        }),
      );

      visibilityHandler = getVisibilityHandler();
      await simulateHidden();

      expect(setIsMetronomePlaying).toHaveBeenCalledWith(false);
      expect(setIsPatternPlaying).toHaveBeenCalledWith(false);
    });
  });

  describe("当页面重新可见时", () => {
    it("应该恢复之前正在播放的节拍器", async () => {
      const setIsMetronomePlaying = vi.fn();
      const setIsPatternPlaying = vi.fn();

      renderHook(() =>
        useVisibilityHandler({
          isMetronomePlaying: true,
          isPatternPlaying: false,
          setIsMetronomePlaying,
          setIsPatternPlaying,
        }),
      );

      visibilityHandler = getVisibilityHandler();

      // 先隐藏
      await simulateHidden();
      setIsMetronomePlaying.mockClear();

      // 再显示
      await simulateVisible();

      expect(setIsMetronomePlaying).toHaveBeenCalledWith(true);
    });

    it("应该恢复之前正在播放的节奏型", async () => {
      const setIsMetronomePlaying = vi.fn();
      const setIsPatternPlaying = vi.fn();

      renderHook(() =>
        useVisibilityHandler({
          isMetronomePlaying: false,
          isPatternPlaying: true,
          setIsMetronomePlaying,
          setIsPatternPlaying,
        }),
      );

      visibilityHandler = getVisibilityHandler();

      // 先隐藏
      await simulateHidden();
      setIsPatternPlaying.mockClear();

      // 再显示
      await simulateVisible();

      expect(setIsPatternPlaying).toHaveBeenCalledWith(true);
    });

    it("如果之前没有播放，不应该开始播放", async () => {
      const setIsMetronomePlaying = vi.fn();
      const setIsPatternPlaying = vi.fn();

      renderHook(() =>
        useVisibilityHandler({
          isMetronomePlaying: false,
          isPatternPlaying: false,
          setIsMetronomePlaying,
          setIsPatternPlaying,
        }),
      );

      visibilityHandler = getVisibilityHandler();

      // 先隐藏
      await simulateHidden();
      setIsMetronomePlaying.mockClear();
      setIsPatternPlaying.mockClear();

      // 再显示
      await simulateVisible();

      // 不应该调用 setIsMetronomePlaying(true) 或 setIsPatternPlaying(true)
      expect(setIsMetronomePlaying).not.toHaveBeenCalledWith(true);
      expect(setIsPatternPlaying).not.toHaveBeenCalledWith(true);
    });
  });
});
