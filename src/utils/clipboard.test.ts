import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  copyToClipboard,
  readFromClipboard,
  isClipboardReadSupported,
  isClipboardWriteSupported,
} from "./clipboard";

describe("Clipboard 工具函数", () => {
  let originalClipboard: Clipboard;
  let originalExecCommand: typeof document.execCommand;

  beforeEach(() => {
    // 保存原始值
    originalClipboard = navigator.clipboard;
    originalExecCommand = document.execCommand;
  });

  afterEach(() => {
    // 恢复原始值
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
    document.execCommand = originalExecCommand;
    vi.clearAllMocks();
  });

  describe("copyToClipboard", () => {
    it("应该使用 navigator.clipboard.writeText 复制文本", async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      });

      const result = await copyToClipboard("test text");

      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith("test text");
    });

    it("当 navigator.clipboard 不可用时应该使用 execCommand 降级", async () => {
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const mockExecCommand = vi.fn().mockReturnValue(true);
      document.execCommand = mockExecCommand;

      const result = await copyToClipboard("test text");

      expect(result).toBe(true);
      expect(mockExecCommand).toHaveBeenCalledWith("copy");
    });

    it("当所有方法都失败时应该返回 false", async () => {
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const mockExecCommand = vi.fn().mockReturnValue(false);
      document.execCommand = mockExecCommand;

      const result = await copyToClipboard("test text");

      expect(result).toBe(false);
    });
  });

  describe("readFromClipboard", () => {
    it("应该使用 navigator.clipboard.readText 读取文本", async () => {
      const mockReadText = vi.fn().mockResolvedValue("clipboard content");
      Object.defineProperty(navigator, "clipboard", {
        value: { readText: mockReadText },
        writable: true,
        configurable: true,
      });

      const result = await readFromClipboard();

      expect(result).toBe("clipboard content");
      expect(mockReadText).toHaveBeenCalled();
    });

    it("当 navigator.clipboard 不可用时应该返回 null", async () => {
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const mockExecCommand = vi.fn().mockReturnValue(false);
      document.execCommand = mockExecCommand;

      const result = await readFromClipboard();

      expect(result).toBeNull();
    });
  });

  describe("isClipboardReadSupported", () => {
    it("当在安全上下文且有 clipboard API 时应该返回 true", () => {
      Object.defineProperty(window, "isSecureContext", {
        value: true,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, "clipboard", {
        value: { readText: vi.fn() },
        writable: true,
        configurable: true,
      });

      expect(isClipboardReadSupported()).toBe(true);
    });

    it("当不在安全上下文时应该返回 false", () => {
      Object.defineProperty(window, "isSecureContext", {
        value: false,
        writable: true,
        configurable: true,
      });

      expect(isClipboardReadSupported()).toBe(false);
    });

    it("当没有 clipboard API 时应该返回 false", () => {
      Object.defineProperty(window, "isSecureContext", {
        value: true,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(isClipboardReadSupported()).toBe(false);
    });
  });

  describe("isClipboardWriteSupported", () => {
    it("当在安全上下文且有 clipboard API 时应该返回 true", () => {
      Object.defineProperty(window, "isSecureContext", {
        value: true,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: vi.fn() },
        writable: true,
        configurable: true,
      });

      expect(isClipboardWriteSupported()).toBe(true);
    });

    it("当 execCommand copy 支持时应该返回 true", () => {
      Object.defineProperty(window, "isSecureContext", {
        value: false,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      document.queryCommandSupported = vi.fn().mockReturnValue(true);

      expect(isClipboardWriteSupported()).toBe(true);
    });
  });
});
