import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSampleLoader } from "./useSampleLoader";

// Mock audioEngine
vi.mock("../utils/audioEngine", () => ({
  preInitAudioContext: vi.fn(),
  ensureSamplesLoaded: vi.fn(() => Promise.resolve()),
  setSampleLoadProgressCallback: vi.fn(),
}));

import {
  preInitAudioContext,
  ensureSamplesLoaded,
  setSampleLoadProgressCallback,
} from "../utils/audioEngine";

describe("useSampleLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("初始状态应该是 isLoading=true", () => {
    const { result } = renderHook(() => useSampleLoader());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.showProgress).toBe(false);
  });

  it("应该调用 preInitAudioContext 和 ensureSamplesLoaded", async () => {
    renderHook(() => useSampleLoader());

    // 等待 useEffect 执行
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(preInitAudioContext).toHaveBeenCalled();
    expect(ensureSamplesLoaded).toHaveBeenCalled();
  });

  it("加载完成后 isLoading 应该变为 false", async () => {
    const { result } = renderHook(() => useSampleLoader());

    // 先让 ensureSamplesLoaded resolve
    await act(async () => {
      // 跳过进度条延迟
      vi.advanceTimersByTime(200);
      // 让 promises resolve
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("应该设置进度回调", async () => {
    renderHook(() => useSampleLoader());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(setSampleLoadProgressCallback).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });

  it("200ms 后应该显示进度条", async () => {
    const { result } = renderHook(() => useSampleLoader());

    expect(result.current.showProgress).toBe(false);

    // 前进 200ms
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.showProgress).toBe(true);
  });

  it("加载完成后应该清除进度回调", async () => {
    renderHook(() => useSampleLoader());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // 最后一次调用应该是 null
    expect(setSampleLoadProgressCallback).toHaveBeenLastCalledWith(null);
  });

  it("加载失败时 isLoading 仍应该变为 false", async () => {
    vi.mocked(ensureSamplesLoaded).mockRejectedValueOnce(
      new Error("Load failed"),
    );

    const { result } = renderHook(() => useSampleLoader());

    // 让 promises reject 并处理
    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("loadingProgress 初始值应该正确", () => {
    const { result } = renderHook(() => useSampleLoader());

    expect(result.current.loadingProgress).toEqual({
      loaded: 0,
      total: 11,
      currentName: "",
    });
  });
});
