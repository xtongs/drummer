import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSingleLongPress } from "./useSingleLongPress";

describe("useSingleLongPress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("长按行为", () => {
    it("长按应该触发 onLongPress 而不是 onClick", () => {
      const onLongPress = vi.fn();
      const onClick = vi.fn();

      const { result } = renderHook(() =>
        useSingleLongPress({ delay: 500, onLongPress, onClick })
      );

      // 开始按下
      act(() => {
        result.current.onMouseDown({
          preventDefault: vi.fn(),
        } as unknown as React.MouseEvent);
      });

      // 等待超过 delay
      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(onLongPress).toHaveBeenCalledTimes(1);

      // 抬起
      act(() => {
        result.current.onMouseUp();
      });

      // onClick 不应该被触发
      expect(onClick).not.toHaveBeenCalled();
    });

    it("长按应该只触发一次 onLongPress", () => {
      const onLongPress = vi.fn();

      const { result } = renderHook(() =>
        useSingleLongPress({ delay: 500, onLongPress })
      );

      act(() => {
        result.current.onMouseDown({
          preventDefault: vi.fn(),
        } as unknown as React.MouseEvent);
      });

      // 等待很长时间
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // 只触发一次
      expect(onLongPress).toHaveBeenCalledTimes(1);
    });
  });

  describe("短按行为", () => {
    it("短按应该触发 onClick 而不是 onLongPress", () => {
      const onLongPress = vi.fn();
      const onClick = vi.fn();

      const { result } = renderHook(() =>
        useSingleLongPress({ delay: 500, onLongPress, onClick })
      );

      // 开始按下
      act(() => {
        result.current.onMouseDown({
          preventDefault: vi.fn(),
        } as unknown as React.MouseEvent);
      });

      // 短暂等待后抬起
      act(() => {
        vi.advanceTimersByTime(100);
        result.current.onMouseUp();
      });

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onLongPress).not.toHaveBeenCalled();
    });

    it("没有 onClick 时短按不应该报错", () => {
      const onLongPress = vi.fn();

      const { result } = renderHook(() =>
        useSingleLongPress({ delay: 500, onLongPress })
      );

      act(() => {
        result.current.onMouseDown({
          preventDefault: vi.fn(),
        } as unknown as React.MouseEvent);
      });

      act(() => {
        vi.advanceTimersByTime(100);
        result.current.onMouseUp();
      });

      expect(onLongPress).not.toHaveBeenCalled();
    });
  });

  describe("鼠标离开", () => {
    it("鼠标离开应该取消长按", () => {
      const onLongPress = vi.fn();
      const onClick = vi.fn();

      const { result } = renderHook(() =>
        useSingleLongPress({ delay: 500, onLongPress, onClick })
      );

      act(() => {
        result.current.onMouseDown({
          preventDefault: vi.fn(),
        } as unknown as React.MouseEvent);
      });

      // 在 delay 之前离开
      act(() => {
        vi.advanceTimersByTime(200);
        result.current.onMouseLeave();
      });

      // 继续等待
      act(() => {
        vi.advanceTimersByTime(400);
      });

      // 长按和点击都不应该触发
      expect(onLongPress).not.toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("返回值", () => {
    it("应该返回 ref 回调和事件处理器", () => {
      const onLongPress = vi.fn();

      const { result } = renderHook(() =>
        useSingleLongPress({ onLongPress })
      );

      expect(result.current).toHaveProperty("ref");
      expect(result.current).toHaveProperty("onMouseDown");
      expect(result.current).toHaveProperty("onMouseUp");
      expect(result.current).toHaveProperty("onMouseLeave");
      expect(typeof result.current.ref).toBe("function");
    });

    it("ref 回调应该是稳定的", () => {
      const onLongPress = vi.fn();

      const { result, rerender } = renderHook(() =>
        useSingleLongPress({ onLongPress })
      );

      const firstRef = result.current.ref;
      rerender();
      const secondRef = result.current.ref;

      expect(firstRef).toBe(secondRef);
    });
  });

  describe("自定义 delay", () => {
    it("应该使用自定义的 delay 值", () => {
      const onLongPress = vi.fn();

      const { result } = renderHook(() =>
        useSingleLongPress({ delay: 1000, onLongPress })
      );

      act(() => {
        result.current.onMouseDown({
          preventDefault: vi.fn(),
        } as unknown as React.MouseEvent);
      });

      // 500ms 后不应该触发
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(onLongPress).not.toHaveBeenCalled();

      // 1000ms 后应该触发
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(onLongPress).toHaveBeenCalledTimes(1);
    });
  });
});
