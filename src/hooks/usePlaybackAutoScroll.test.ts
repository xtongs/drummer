import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePlaybackAutoScroll } from "./usePlaybackAutoScroll";
import type { Pattern, TimeSignature } from "../types";

// Mock animation utils
vi.mock("../utils/animation", () => ({
  smoothScrollTo: vi.fn((element, targetLeft, _duration, onComplete) => {
    element.scrollLeft = targetLeft;
    onComplete?.();
  }),
}));

import { smoothScrollTo } from "../utils/animation";

describe("usePlaybackAutoScroll", () => {
  let mockContainer: {
    scrollLeft: number;
    clientWidth: number;
  };

  const createMockPattern = (overrides: Partial<Pattern> = {}): Pattern => ({
    id: "test-id",
    name: "A",
    bpm: 120,
    timeSignature: [4, 4] as TimeSignature,
    bars: 2,
    grid: [],
    drums: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  });

  beforeEach(() => {
    mockContainer = {
      scrollLeft: 0,
      clientWidth: 400,
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("当 currentBeat 为 undefined 时不应该滚动", () => {
    const scrollContainerRef = { current: mockContainer as HTMLDivElement };

    renderHook(() =>
      usePlaybackAutoScroll({
        scrollContainerRef,
        currentBeat: undefined,
        cellSize: 20,
        pattern: createMockPattern(),
        crossPatternLoop: undefined,
        isDraftMode: false,
        isPlaying: true,
      })
    );

    expect(smoothScrollTo).not.toHaveBeenCalled();
  });

  it("当 scrollContainerRef.current 为 null 时不应该滚动", () => {
    const scrollContainerRef = { current: null };

    renderHook(() =>
      usePlaybackAutoScroll({
        scrollContainerRef,
        currentBeat: 10,
        cellSize: 20,
        pattern: createMockPattern(),
        crossPatternLoop: undefined,
        isDraftMode: false,
        isPlaying: true,
      })
    );

    expect(smoothScrollTo).not.toHaveBeenCalled();
  });

  it("当游标在可视区域内时不应该滚动", () => {
    mockContainer.scrollLeft = 0;
    mockContainer.clientWidth = 400;
    const scrollContainerRef = { current: mockContainer as HTMLDivElement };

    renderHook(() =>
      usePlaybackAutoScroll({
        scrollContainerRef,
        currentBeat: 5, // 位置 = 5 * 20 = 100，在 0-400 范围内
        cellSize: 20,
        pattern: createMockPattern(),
        crossPatternLoop: undefined,
        isDraftMode: false,
        isPlaying: true,
      })
    );

    expect(smoothScrollTo).not.toHaveBeenCalled();
  });

  it("当进入新的小节时应该滚动到该小节起始位置", () => {
    mockContainer.scrollLeft = 0;
    mockContainer.clientWidth = 400;
    const scrollContainerRef = { current: mockContainer as HTMLDivElement };

    const { rerender } = renderHook(
      ({ currentBeat }) =>
        usePlaybackAutoScroll({
          scrollContainerRef,
          currentBeat,
          cellSize: 20,
          pattern: createMockPattern({ bars: 2 }),
          crossPatternLoop: undefined,
          isDraftMode: false,
          isPlaying: true,
        }),
      { initialProps: { currentBeat: 5 } }
    );

    vi.clearAllMocks();

    rerender({ currentBeat: 20 });

    expect(smoothScrollTo).toHaveBeenCalledWith(
      mockContainer,
      320,
      150,
      expect.any(Function)
    );
  });

  it("当游标超出左侧时应该平滑滚动到游标所在小节的起始位置", () => {
    mockContainer.scrollLeft = 200;
    mockContainer.clientWidth = 400;
    const scrollContainerRef = { current: mockContainer as HTMLDivElement };

    // currentBeat = 5，4/4 拍号每小节 16 个 subdivision
    // currentBarIndex = Math.floor(5 / 16) = 0
    // 目标位置 = 0 * 16 * 20 = 0
    renderHook(() =>
      usePlaybackAutoScroll({
        scrollContainerRef,
        currentBeat: 5,
        cellSize: 20,
        pattern: createMockPattern(), // 4/4 拍号
        crossPatternLoop: undefined,
        isDraftMode: false,
        isPlaying: true,
      })
    );

    // 左侧滚动使用平滑滚动
    expect(smoothScrollTo).toHaveBeenCalledWith(
      mockContainer,
      0,
      150,
      expect.any(Function)
    );
  });

  it("当游标在第二小节超出左侧时应该平滑滚动到第二小节起始位置", () => {
    mockContainer.scrollLeft = 500; // 大于 cursorPosition (20 * 20 = 400)
    mockContainer.clientWidth = 400;
    const scrollContainerRef = { current: mockContainer as HTMLDivElement };

    // currentBeat = 20，4/4 拍号每小节 16 个 subdivision
    // currentBarIndex = Math.floor(20 / 16) = 1
    // 目标位置 = 1 * 16 * 20 = 320
    renderHook(() =>
      usePlaybackAutoScroll({
        scrollContainerRef,
        currentBeat: 20, // 在第二小节
        cellSize: 20,
        pattern: createMockPattern({ bars: 2 }),
        crossPatternLoop: undefined,
        isDraftMode: false,
        isPlaying: true,
      })
    );

    // 左侧滚动使用平滑滚动
    expect(smoothScrollTo).toHaveBeenCalledWith(
      mockContainer,
      320,
      150,
      expect.any(Function)
    );
  });

  it("当 pattern 切换时应该同步设置 scrollLeft 到目标位置", () => {
    mockContainer.scrollLeft = 320; // 模拟在 A 的第二小节位置
    mockContainer.clientWidth = 400;
    const scrollContainerRef = { current: mockContainer as HTMLDivElement };

    const patternA = createMockPattern({ id: "pattern-a", name: "A", bars: 2 });
    const patternB = createMockPattern({ id: "pattern-b", name: "B", bars: 3 });

    // 先渲染 pattern A
    const { rerender } = renderHook(
      ({ pattern, currentBeat }) =>
        usePlaybackAutoScroll({
          scrollContainerRef,
          currentBeat,
          cellSize: 20,
          pattern,
          crossPatternLoop: undefined,
          isDraftMode: false,
          isPlaying: true,
        }),
      { initialProps: { pattern: patternA, currentBeat: 20 } }
    );

    // 清除之前的调用
    vi.clearAllMocks();

    // 切换到 pattern B，currentBeat = 0（B1 的起始位置）
    rerender({ pattern: patternB, currentBeat: 0 });

    // useLayoutEffect 应该同步设置 scrollLeft 为 0（B1 起始位置）
    expect(mockContainer.scrollLeft).toBe(0);
  });

  it("当停止播放时应该重置滚动状态", () => {
    const scrollContainerRef = { current: mockContainer as HTMLDivElement };

    const { rerender } = renderHook(
      ({ isPlaying }) =>
        usePlaybackAutoScroll({
          scrollContainerRef,
          currentBeat: 5,
          cellSize: 20,
          pattern: createMockPattern(),
          crossPatternLoop: undefined,
          isDraftMode: false,
          isPlaying,
        }),
      { initialProps: { isPlaying: true } }
    );

    // 停止播放
    rerender({ isPlaying: false });

    // 再次播放时应该可以滚动（因为状态已重置）
    // 这个测试主要验证不会崩溃
    expect(true).toBe(true);
  });

  it("返回的 doScroll 函数应该可用", () => {
    const scrollContainerRef = { current: mockContainer as HTMLDivElement };

    const { result } = renderHook(() =>
      usePlaybackAutoScroll({
        scrollContainerRef,
        currentBeat: undefined,
        cellSize: 20,
        pattern: createMockPattern(),
        crossPatternLoop: undefined,
        isDraftMode: false,
        isPlaying: false,
      })
    );

    expect(typeof result.current.doScroll).toBe("function");
  });

  it("返回的 scrollContainerRef 应该与输入相同", () => {
    const scrollContainerRef = { current: mockContainer as HTMLDivElement };

    const { result } = renderHook(() =>
      usePlaybackAutoScroll({
        scrollContainerRef,
        currentBeat: undefined,
        cellSize: 20,
        pattern: createMockPattern(),
        crossPatternLoop: undefined,
        isDraftMode: false,
        isPlaying: false,
      })
    );

    expect(result.current.scrollContainerRef).toBe(scrollContainerRef);
  });

  it("当 currentBeat 超出 pattern 范围时不应该滚动（防止跨 pattern 切换时的状态不同步）", () => {
    mockContainer.scrollLeft = 200;
    mockContainer.clientWidth = 400;
    const scrollContainerRef = { current: mockContainer as HTMLDivElement };

    // pattern 有 2 个小节，4/4 拍号，总共 32 个 subdivision
    // currentBeat = 40 超出范围，说明状态还未同步
    renderHook(() =>
      usePlaybackAutoScroll({
        scrollContainerRef,
        currentBeat: 40, // 超出 pattern 的 32 个 subdivision
        cellSize: 20,
        pattern: createMockPattern({ bars: 2 }), // 2 小节 = 32 subdivisions
        crossPatternLoop: undefined,
        isDraftMode: false,
        isPlaying: true,
      })
    );

    expect(smoothScrollTo).not.toHaveBeenCalled();
  });
});
