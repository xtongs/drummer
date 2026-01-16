import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLongPress } from "./useLongPress";

describe("useLongPress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("短按行为", () => {
    it("应该在短按时立即触发回调", () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useLongPress(callback));

      // 模拟短按
      act(() => {
        result.current.onMouseDown();
      });

      // 短暂延迟后抬起
      act(() => {
        vi.advanceTimersByTime(100);
        result.current.onMouseUp();
        result.current.onClick();
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("长按行为", () => {
    it("应该在长按后触发回调", () => {
      const callback = vi.fn();
      const { result } = renderHook(() =>
        useLongPress(callback, { delay: 500 })
      );

      act(() => {
        result.current.onMouseDown();
      });

      // 在 delay 之前不应该触发
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(callback).not.toHaveBeenCalled();

      // 在 delay 之后应该触发
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("应该以指定间隔重复触发回调", () => {
      const callback = vi.fn();
      const { result } = renderHook(() =>
        useLongPress(callback, { delay: 500, interval: 100 })
      );

      act(() => {
        result.current.onMouseDown();
      });

      // 等待初始 delay
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(callback).toHaveBeenCalledTimes(1);

      // 继续按住，应该每 100ms 触发一次
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(callback).toHaveBeenCalledTimes(2);

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it("应该在鼠标离开时停止", () => {
      const callback = vi.fn();
      const { result } = renderHook(() =>
        useLongPress(callback, { delay: 500, interval: 100 })
      );

      act(() => {
        result.current.onMouseDown();
      });

      act(() => {
        vi.advanceTimersByTime(600);
      });
      const countAfterFirstTrigger = callback.mock.calls.length;

      // 鼠标离开
      act(() => {
        result.current.onMouseLeave();
      });

      // 继续等待，不应该再触发
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(callback).toHaveBeenCalledTimes(countAfterFirstTrigger);
    });
  });

  describe("shouldStop 选项", () => {
    it("当 shouldStop 返回 true 时应该停止", () => {
      const callback = vi.fn();
      let stopCounter = 0;
      const shouldStop = () => {
        stopCounter++;
        return stopCounter > 2;
      };

      const { result } = renderHook(() =>
        useLongPress(callback, { delay: 100, interval: 50, shouldStop })
      );

      act(() => {
        result.current.onMouseDown();
      });

      // 触发几次后应该停止
      act(() => {
        vi.advanceTimersByTime(300);
      });

      const finalCount = callback.mock.calls.length;

      // 继续等待，不应该再触发
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(callback).toHaveBeenCalledTimes(finalCount);
    });
  });

  describe("触摸事件", () => {
    it("应该支持触摸开始和结束", () => {
      const callback = vi.fn();
      const { result } = renderHook(() =>
        useLongPress(callback, { delay: 500 })
      );

      const touchEvent = {} as React.TouchEvent;

      act(() => {
        result.current.onTouchStart(touchEvent);
      });

      act(() => {
        vi.advanceTimersByTime(600);
      });

      expect(callback).toHaveBeenCalled();

      act(() => {
        result.current.onTouchEnd(touchEvent);
      });
    });

    it("应该支持触摸取消", () => {
      const callback = vi.fn();
      const { result } = renderHook(() =>
        useLongPress(callback, { delay: 500 })
      );

      const touchEvent = {} as React.TouchEvent;

      act(() => {
        result.current.onTouchStart(touchEvent);
      });

      // 在触发前取消
      act(() => {
        vi.advanceTimersByTime(200);
        result.current.onTouchCancel(touchEvent);
      });

      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe("上下文菜单", () => {
    it("应该阻止上下文菜单默认行为", () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useLongPress(callback));

      const preventDefault = vi.fn();
      const event = { preventDefault } as unknown as React.MouseEvent;

      result.current.onContextMenu(event);

      expect(preventDefault).toHaveBeenCalled();
    });
  });

  describe("返回的事件处理器", () => {
    it("应该返回所有必要的事件处理器", () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useLongPress(callback));

      expect(result.current).toHaveProperty("onClick");
      expect(result.current).toHaveProperty("onMouseDown");
      expect(result.current).toHaveProperty("onMouseUp");
      expect(result.current).toHaveProperty("onMouseLeave");
      expect(result.current).toHaveProperty("onTouchStart");
      expect(result.current).toHaveProperty("onTouchEnd");
      expect(result.current).toHaveProperty("onTouchCancel");
      expect(result.current).toHaveProperty("onContextMenu");
    });
  });
});
