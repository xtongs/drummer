import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useExportMode } from "./useExportMode";

// Mock clipboard utilities
vi.mock("../utils/clipboard", () => ({
  copyToClipboard: vi.fn(),
  isClipboardWriteSupported: vi.fn(),
}));

// Mock storage utilities
vi.mock("../utils/storage", () => ({
  serializePatternToJSON: vi.fn((pattern) => JSON.stringify(pattern)),
}));

import { copyToClipboard, isClipboardWriteSupported } from "../utils/clipboard";

describe("useExportMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("初始状态应该是非导出模式", () => {
    const { result } = renderHook(() => useExportMode("test-content"));

    expect(result.current.isExportMode).toBe(false);
    expect(result.current.exportValue).toBe("");
  });

  it("enterExportMode 应该进入导出模式并设置值", () => {
    const { result } = renderHook(() => useExportMode("test-content"));

    act(() => {
      result.current.enterExportMode();
    });

    expect(result.current.isExportMode).toBe(true);
    expect(result.current.exportValue).toBe("test-content");
  });

  it("cancelExport 应该退出导出模式并清空值", () => {
    const { result } = renderHook(() => useExportMode("test-content"));

    // 先进入导出模式
    act(() => {
      result.current.enterExportMode();
    });

    // 然后取消
    act(() => {
      result.current.cancelExport();
    });

    expect(result.current.isExportMode).toBe(false);
    expect(result.current.exportValue).toBe("");
  });

  describe("tryExportToClipboard", () => {
    it("当剪贴板支持且复制成功时应该返回 true", async () => {
      vi.mocked(isClipboardWriteSupported).mockReturnValue(true);
      vi.mocked(copyToClipboard).mockResolvedValue(true);

      const { result } = renderHook(() => useExportMode("test-content"));

      let success: boolean;
      await act(async () => {
        success = await result.current.tryExportToClipboard();
      });

      expect(success!).toBe(true);
      expect(result.current.isExportMode).toBe(false); // 不进入导出模式
    });

    it("当剪贴板不支持时应该进入导出模式", async () => {
      vi.mocked(isClipboardWriteSupported).mockReturnValue(false);

      const { result } = renderHook(() => useExportMode("test-content"));

      let success: boolean;
      await act(async () => {
        success = await result.current.tryExportToClipboard();
      });

      expect(success!).toBe(false);
      expect(result.current.isExportMode).toBe(true);
      expect(result.current.exportValue).toBe("test-content");
    });

    it("当剪贴板复制失败时应该进入导出模式", async () => {
      vi.mocked(isClipboardWriteSupported).mockReturnValue(true);
      vi.mocked(copyToClipboard).mockResolvedValue(false);

      const { result } = renderHook(() => useExportMode("test-content"));

      let success: boolean;
      await act(async () => {
        success = await result.current.tryExportToClipboard();
      });

      expect(success!).toBe(false);
      expect(result.current.isExportMode).toBe(true);
    });

    it("当剪贴板抛出错误时应该进入导出模式", async () => {
      vi.mocked(isClipboardWriteSupported).mockReturnValue(true);
      vi.mocked(copyToClipboard).mockRejectedValue(new Error("Clipboard error"));

      const { result } = renderHook(() => useExportMode("test-content"));

      let success: boolean;
      await act(async () => {
        success = await result.current.tryExportToClipboard();
      });

      expect(success!).toBe(false);
      expect(result.current.isExportMode).toBe(true);
    });
  });

  it("exportInputRef 应该是一个有效的 ref 对象", () => {
    const { result } = renderHook(() => useExportMode("test-content"));

    expect(result.current.exportInputRef).toBeDefined();
    expect(result.current.exportInputRef.current).toBeNull();
  });
});
