import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useVisibleRange } from "./useVisibleRange";

const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
describe("useVisibleRange", () => {
  const scrollContainerRef = {
    current: {
      scrollLeft: 0,
      get clientWidth() {
        return 500;
      },
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    } as unknown as HTMLElement,
  };

  const contentRef = {
    current: {
      getBoundingClientRect: vi.fn(),
    } as unknown as HTMLElement,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("应该返回完整的可见范围当内容比视口小时", () => {
    // 模拟：scrollContainer 宽 500px，content 宽 300px（比视口小）
    Object.defineProperty(scrollContainerRef.current, "clientWidth", {
      value: 500,
      configurable: true,
    });

    const { result } = renderHook(() =>
      useVisibleRange(scrollContainerRef, contentRef, {
        itemSize: 50,
        totalItems: 6,
        bufferItems: 2,
      }),
    );

    expect(result.current.start).toBe(0);
    expect(result.current.end).toBe(6);
  });

  it("应该计算正确的可见范围（视口在起始位置）", () => {
    Object.defineProperty(scrollContainerRef.current, "clientWidth", {
      value: 500,
      configurable: true,
    });
    scrollContainerRef.current.scrollLeft = 0;

    const { result } = renderHook(() =>
      useVisibleRange(scrollContainerRef, contentRef, {
        itemSize: 50,
        totalItems: 40,
        bufferItems: 2,
      }),
    );

    // 视口 0-500px，itemSize=50
    // 可见 items: 0 到 10 (500/50=10)
    // 加上 buffer: start=0, end=12
    expect(result.current.start).toBe(0);
    expect(result.current.end).toBe(12);
  });

  it("应该返回正确的 visibleSet", () => {
    Object.defineProperty(scrollContainerRef.current, "clientWidth", {
      value: 500,
      configurable: true,
    });
    scrollContainerRef.current.scrollLeft = 500;

    const { result } = renderHook(() =>
      useVisibleRange(scrollContainerRef, contentRef, {
        itemSize: 50,
        totalItems: 40,
        bufferItems: 1,
      }),
    );

    // 视口 500-1000px
    // 可见 items: 10 到 20
    // 加上 buffer: 9 到 21
    expect(result.current.visibleSet.has(9)).toBe(true);
    expect(result.current.visibleSet.has(15)).toBe(true);
    expect(result.current.visibleSet.has(20)).toBe(true);
    expect(result.current.visibleSet.has(8)).toBe(false);
    expect(result.current.visibleSet.has(22)).toBe(false);
  });

  it("应该设置事件监听器", () => {
    renderHook(() =>
      useVisibleRange(scrollContainerRef, contentRef, {
        itemSize: 50,
        totalItems: 40,
      }),
    );

    expect(mockAddEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
      {
        passive: true,
      },
    );
  });
});
