import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlaybackState } from "./usePlaybackState";

describe("usePlaybackState", () => {
  it("初始状态应该都是 false", () => {
    const { result } = renderHook(() => usePlaybackState());

    expect(result.current.isMetronomePlaying).toBe(false);
    expect(result.current.isPatternPlaying).toBe(false);
  });

  it("toggleMetronomePlay 应该切换节拍器播放状态", () => {
    const { result } = renderHook(() => usePlaybackState());

    act(() => {
      result.current.toggleMetronomePlay();
    });

    expect(result.current.isMetronomePlaying).toBe(true);

    act(() => {
      result.current.toggleMetronomePlay();
    });

    expect(result.current.isMetronomePlaying).toBe(false);
  });

  it("togglePatternPlay 应该切换节奏型播放状态", () => {
    const { result } = renderHook(() => usePlaybackState());

    act(() => {
      result.current.togglePatternPlay();
    });

    expect(result.current.isPatternPlaying).toBe(true);

    act(() => {
      result.current.togglePatternPlay();
    });

    expect(result.current.isPatternPlaying).toBe(false);
  });

  it("开始播放节拍器时应该停止节奏型播放", () => {
    const { result } = renderHook(() => usePlaybackState());

    // 先开始节奏型播放
    act(() => {
      result.current.togglePatternPlay();
    });
    expect(result.current.isPatternPlaying).toBe(true);

    // 开始节拍器播放
    act(() => {
      result.current.toggleMetronomePlay();
    });

    // 节拍器应该播放，节奏型应该停止
    expect(result.current.isMetronomePlaying).toBe(true);
    expect(result.current.isPatternPlaying).toBe(false);
  });

  it("开始播放节奏型时应该停止节拍器播放", () => {
    const { result } = renderHook(() => usePlaybackState());

    // 先开始节拍器播放
    act(() => {
      result.current.toggleMetronomePlay();
    });
    expect(result.current.isMetronomePlaying).toBe(true);

    // 开始节奏型播放
    act(() => {
      result.current.togglePatternPlay();
    });

    // 节奏型应该播放，节拍器应该停止
    expect(result.current.isPatternPlaying).toBe(true);
    expect(result.current.isMetronomePlaying).toBe(false);
  });

  it("stopAll 应该停止所有播放", () => {
    const { result } = renderHook(() => usePlaybackState());

    // 开始两种播放（虽然互斥，但测试 stopAll）
    act(() => {
      result.current.togglePatternPlay();
    });

    act(() => {
      result.current.stopAll();
    });

    expect(result.current.isMetronomePlaying).toBe(false);
    expect(result.current.isPatternPlaying).toBe(false);
  });

  it("setIsMetronomePlaying 应该直接设置状态", () => {
    const { result } = renderHook(() => usePlaybackState());

    act(() => {
      result.current.setIsMetronomePlaying(true);
    });

    expect(result.current.isMetronomePlaying).toBe(true);
  });

  it("setIsPatternPlaying 应该直接设置状态", () => {
    const { result } = renderHook(() => usePlaybackState());

    act(() => {
      result.current.setIsPatternPlaying(true);
    });

    expect(result.current.isPatternPlaying).toBe(true);
  });
});
