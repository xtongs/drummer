import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock navigator.wakeLock
const mockRelease = vi.fn();
const mockWakeLockSentinel = {
  release: mockRelease,
};

const mockWakeLock = {
  request: vi.fn(),
};

const mockNavigator = {
  wakeLock: mockWakeLock,
};

Object.defineProperty(global, "navigator", {
  value: mockNavigator,
  writable: true,
});

describe("wakeLock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRelease.mockReset();
    mockWakeLock.request.mockReset();
  });

  describe("requestWakeLock", () => {
    it("应该在支持 WakeLock 时请求屏幕唤醒", async () => {
      mockWakeLock.request.mockResolvedValue(mockWakeLockSentinel);

      const { requestWakeLock } = await import("./wakeLock");

      await requestWakeLock();

      expect(mockWakeLock.request).toHaveBeenCalledWith("screen");
    });

    it("应该在请求失败时不抛出错误", async () => {
      mockWakeLock.request.mockRejectedValue(
        new Error("WakeLock not supported"),
      );

      const { requestWakeLock } = await import("./wakeLock");

      // Should not throw
      await expect(requestWakeLock()).resolves.toBeUndefined();
    });

    it("应该在不支持 WakeLock 时不执行任何操作", async () => {
      // Remove wakeLock from navigator
      delete (navigator as any).wakeLock;

      const { requestWakeLock } = await import("./wakeLock");

      await expect(requestWakeLock()).resolves.toBeUndefined();

      // Restore wakeLock
      (navigator as any).wakeLock = mockWakeLock;
    });
  });

  describe("releaseWakeLock", () => {
    it("应该在 WakeLock 存在时释放它", async () => {
      mockRelease.mockResolvedValue(undefined);
      mockWakeLock.request.mockResolvedValue(mockWakeLockSentinel);

      const { requestWakeLock, releaseWakeLock } = await import("./wakeLock");

      // First request a wake lock
      await requestWakeLock();

      // Then release it
      await releaseWakeLock();

      expect(mockRelease).toHaveBeenCalled();
    });

    it("应该在 WakeLock 不存在时不执行任何操作", async () => {
      const { releaseWakeLock } = await import("./wakeLock");

      await expect(releaseWakeLock()).resolves.toBeUndefined();
      expect(mockRelease).not.toHaveBeenCalled();
    });

    it("应该在释放失败时不抛出错误", async () => {
      mockRelease.mockRejectedValue(new Error("Release failed"));
      mockWakeLock.request.mockResolvedValue(mockWakeLockSentinel);

      const { requestWakeLock, releaseWakeLock } = await import("./wakeLock");

      // First request a wake lock
      await requestWakeLock();

      // Then try to release it (should not throw)
      await expect(releaseWakeLock()).resolves.toBeUndefined();
    });
  });

  describe("完整流程", () => {
    it("应该支持请求和释放的完整流程", async () => {
      mockRelease.mockResolvedValue(undefined);
      mockWakeLock.request.mockResolvedValue(mockWakeLockSentinel);

      const { requestWakeLock, releaseWakeLock } = await import("./wakeLock");

      // Request
      await requestWakeLock();
      expect(mockWakeLock.request).toHaveBeenCalledTimes(1);

      // Release
      await releaseWakeLock();
      expect(mockRelease).toHaveBeenCalledTimes(1);

      // Request again
      await requestWakeLock();
      expect(mockWakeLock.request).toHaveBeenCalledTimes(2);
    });
  });
});
