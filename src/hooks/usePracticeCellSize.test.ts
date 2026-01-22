import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePracticeCellSize } from "./usePracticeCellSize";
import { APP_MAX_WIDTH, SUBDIVISIONS_PER_BEAT } from "../utils/constants";

describe("usePracticeCellSize", () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 700,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it("应该在视口内展示指定小节数量", () => {
    const { result } = renderHook(() => usePracticeCellSize(4, 2));

    const containerWidth = Math.min(window.innerWidth, APP_MAX_WIDTH) - 24;
    const subdivisionsPerBar = 4 * SUBDIVISIONS_PER_BEAT;
    const expected = containerWidth / (subdivisionsPerBar * 2);

    expect(result.current).toBeCloseTo(expected, 5);
  });

  it("在窗口 resize 时应该更新", () => {
    const { result } = renderHook(() => usePracticeCellSize(4, 2));
    const initialSize = result.current;

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
});
