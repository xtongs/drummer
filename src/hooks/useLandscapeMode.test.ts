import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLandscapeMode } from "./useLandscapeMode";

describe("useLandscapeMode", () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;
  const originalMaxTouchPoints = navigator.maxTouchPoints;

  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 390,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 844,
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      value: 1,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      value: originalMaxTouchPoints,
    });
  });

  it("手机横屏时应该进入横屏布局模式", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 700,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 360,
    });

    const { result } = renderHook(() => useLandscapeMode());
    expect(result.current).toBe(true);
  });

  it("手机竖屏时不应进入横屏布局模式", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 360,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 740,
    });

    const { result } = renderHook(() => useLandscapeMode());
    expect(result.current).toBe(false);
  });

  it("横屏但超过手机宽度时不应进入横屏布局模式", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1200,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 500,
    });

    const { result } = renderHook(() => useLandscapeMode());
    expect(result.current).toBe(false);
  });

  it("尺寸变化时应该更新横屏布局模式状态", () => {
    const { result } = renderHook(() => useLandscapeMode());

    act(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 700,
      });
      Object.defineProperty(window, "innerHeight", {
        writable: true,
        configurable: true,
        value: 360,
      });
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toBe(true);
  });
});
