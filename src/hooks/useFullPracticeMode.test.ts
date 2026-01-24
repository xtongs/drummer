import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFullPracticeMode } from "./useFullPracticeMode";
import {
  setFullPracticeMode,
  toggleFullPracticeMode,
} from "../utils/fullPracticeMode";

describe("useFullPracticeMode", () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => {
      setFullPracticeMode(false);
    });
  });

  afterEach(() => {
    act(() => {
      setFullPracticeMode(false);
    });
    localStorage.clear();
  });

  it("默认不启用练习模式", () => {
    const { result } = renderHook(() => useFullPracticeMode());
    expect(result.current).toBe(false);
  });

  it("手动设置后应更新状态", () => {
    const { result } = renderHook(() => useFullPracticeMode());

    act(() => {
      setFullPracticeMode(true);
    });

    expect(result.current).toBe(true);
  });

  it("切换开关应更新状态", () => {
    const { result } = renderHook(() => useFullPracticeMode());

    act(() => {
      toggleFullPracticeMode();
    });

    expect(result.current).toBe(true);

    act(() => {
      toggleFullPracticeMode();
    });

    expect(result.current).toBe(false);
  });
});
