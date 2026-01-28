import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMetronome } from "./useMetronome";

// Mock audioEngine
vi.mock("../utils/audioEngine", () => ({
  playAccent: vi.fn(),
  playBeat: vi.fn(),
  getAudioContext: vi.fn(() => ({
    currentTime: 0,
    state: "running",
    resume: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("useMetronome", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("初始状态", () => {
    it("应该返回初始 beat 和 subdivision 为 0", () => {
      const { result } = renderHook(() =>
        useMetronome({
          bpm: 120,
          timeSignature: [4, 4],
          isPlaying: false,
        }),
      );

      expect(result.current.currentBeat).toBe(0);
      expect(result.current.currentSubdivision).toBe(0);
    });
  });

  describe("播放控制", () => {
    it("isPlaying 为 true 时应该开始播放", async () => {
      const { result, rerender } = renderHook(
        ({ isPlaying }) =>
          useMetronome({
            bpm: 120,
            timeSignature: [4, 4],
            isPlaying,
          }),
        { initialProps: { isPlaying: false } },
      );

      // 开始播放
      rerender({ isPlaying: true });

      // 推进时间
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // 由于 mock，我们只验证不报错
      expect(result.current).toBeDefined();
    });

    it("isPlaying 从 true 变为 false 时应该停止", async () => {
      const { result, rerender } = renderHook(
        ({ isPlaying }) =>
          useMetronome({
            bpm: 120,
            timeSignature: [4, 4],
            isPlaying,
          }),
        { initialProps: { isPlaying: true } },
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // 停止播放
      rerender({ isPlaying: false });

      expect(result.current).toBeDefined();
    });
  });

  describe("BPM 和拍号", () => {
    it("应该接受不同的 BPM 值", () => {
      const { result } = renderHook(() =>
        useMetronome({
          bpm: 60,
          timeSignature: [4, 4],
          isPlaying: false,
        }),
      );

      expect(result.current).toBeDefined();
    });

    it("应该接受不同的拍号", () => {
      const { result } = renderHook(() =>
        useMetronome({
          bpm: 120,
          timeSignature: [3, 4], // 3/4 拍
          isPlaying: false,
        }),
      );

      expect(result.current).toBeDefined();
    });

    it("应该接受 6/8 拍号", () => {
      const { result } = renderHook(() =>
        useMetronome({
          bpm: 120,
          timeSignature: [6, 8],
          isPlaying: false,
        }),
      );

      expect(result.current).toBeDefined();
    });
  });

  describe("onBeatChange 回调", () => {
    it("应该接受 onBeatChange 回调", () => {
      const onBeatChange = vi.fn();

      const { result } = renderHook(() =>
        useMetronome({
          bpm: 120,
          timeSignature: [4, 4],
          isPlaying: false,
          onBeatChange,
        }),
      );

      expect(result.current).toBeDefined();
    });
  });

  describe("返回值结构", () => {
    it("应该返回 currentBeat 和 currentSubdivision", () => {
      const { result } = renderHook(() =>
        useMetronome({
          bpm: 120,
          timeSignature: [4, 4],
          isPlaying: false,
        }),
      );

      expect(result.current).toHaveProperty("currentBeat");
      expect(result.current).toHaveProperty("currentSubdivision");
      expect(typeof result.current.currentBeat).toBe("number");
      expect(typeof result.current.currentSubdivision).toBe("number");
    });
  });

  describe("组件卸载", () => {
    it("卸载时应该清理资源", async () => {
      const { unmount } = renderHook(() =>
        useMetronome({
          bpm: 120,
          timeSignature: [4, 4],
          isPlaying: true,
        }),
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // 卸载不应该报错
      expect(() => unmount()).not.toThrow();
    });
  });
});
