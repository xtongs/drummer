import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGridCellSize, getGridCellSize } from "./useGridCellSize";

describe("useGridCellSize", () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    // 重置 window.innerWidth
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 393, // 基准宽度
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  describe("useGridCellSize hook", () => {
    it("应该在基准宽度下返回基准单元格大小", () => {
      const { result } = renderHook(() => useGridCellSize());

      // 在 393px 宽度下，cellSize 应该接近 23px
      expect(result.current).toBeCloseTo(23, 0);
    });

    it("应该根据窗口大小动态计算", () => {
      // 设置更大的窗口宽度
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 500,
      });

      const { result } = renderHook(() => useGridCellSize());

      // 更大的窗口应该有更大的单元格
      expect(result.current).toBeGreaterThan(23);
    });

    it("应该在窗口 resize 时更新", () => {
      const { result } = renderHook(() => useGridCellSize());
      const initialSize = result.current;

      // 模拟窗口 resize
      act(() => {
        Object.defineProperty(window, "innerWidth", {
          writable: true,
          configurable: true,
          value: 600,
        });
        window.dispatchEvent(new Event("resize"));
      });

      expect(result.current).not.toBe(initialSize);
    });

    it("应该在达到最大宽度时停止增长", () => {
      // 设置超大窗口
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1200,
      });

      const { result } = renderHook(() => useGridCellSize());

      // 即使窗口很大，单元格大小也不应该无限增长
      // APP_MAX_WIDTH = 700，所以应该有上限
      expect(result.current).toBeLessThan(50);
    });
  });

  describe("getGridCellSize 函数", () => {
    it("应该返回基于当前窗口大小的单元格大小", () => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 393,
      });

      const size = getGridCellSize();
      expect(size).toBeCloseTo(23, 0);
    });

    it("应该与 hook 返回相同的值", () => {
      const { result } = renderHook(() => useGridCellSize());
      const functionResult = getGridCellSize();

      expect(result.current).toBeCloseTo(functionResult, 5);
    });
  });
});
