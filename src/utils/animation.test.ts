import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { smoothScrollTo } from "./animation";

describe("animation", () => {
  describe("smoothScrollTo", () => {
    let mockElement: {
      scrollLeft: number;
    };
    let rafCallbacks: FrameRequestCallback[];
    let originalRaf: typeof requestAnimationFrame;
    let originalPerformanceNow: typeof performance.now;

    beforeEach(() => {
      mockElement = { scrollLeft: 0 };
      rafCallbacks = [];

      // Mock requestAnimationFrame
      originalRaf = global.requestAnimationFrame;
      global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
        rafCallbacks.push(callback);
        return rafCallbacks.length;
      });

      // Mock performance.now
      originalPerformanceNow = performance.now;
    });

    afterEach(() => {
      global.requestAnimationFrame = originalRaf;
      performance.now = originalPerformanceNow;
    });

    it("应该调用 requestAnimationFrame", () => {
      smoothScrollTo(mockElement as HTMLElement, 100);

      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });

    it("动画完成后应该调用 onComplete 回调", () => {
      const onComplete = vi.fn();
      let currentTime = 0;
      performance.now = vi.fn(() => currentTime);

      smoothScrollTo(mockElement as HTMLElement, 100, 100, onComplete);

      // 模拟动画进行
      currentTime = 0;
      rafCallbacks[0](currentTime);

      // 模拟动画完成
      currentTime = 100;
      rafCallbacks[1](currentTime);

      expect(onComplete).toHaveBeenCalled();
    });

    it("应该将 scrollLeft 设置为目标值", () => {
      let currentTime = 0;
      performance.now = vi.fn(() => currentTime);

      smoothScrollTo(mockElement as HTMLElement, 200, 100);

      // 初始调用
      currentTime = 0;
      rafCallbacks[0](currentTime);

      // 动画完成
      currentTime = 100;
      rafCallbacks[1](currentTime);

      expect(mockElement.scrollLeft).toBe(200);
    });

    it("动画中途 scrollLeft 应该在起始值和目标值之间", () => {
      mockElement.scrollLeft = 0;
      let currentTime = 0;
      performance.now = vi.fn(() => currentTime);

      smoothScrollTo(mockElement as HTMLElement, 100, 100);

      // 初始调用
      currentTime = 0;
      rafCallbacks[0](currentTime);

      // 动画中途（50%）
      currentTime = 50;
      rafCallbacks[1](currentTime);

      // 由于缓动函数，中途值应该大于 50（easeOutCubic）
      expect(mockElement.scrollLeft).toBeGreaterThan(50);
      expect(mockElement.scrollLeft).toBeLessThan(100);
    });

    it("如果距离为 0 应该立即完成", () => {
      const onComplete = vi.fn();
      let currentTime = 0;
      performance.now = vi.fn(() => currentTime);

      mockElement.scrollLeft = 100;
      smoothScrollTo(mockElement as HTMLElement, 100, 100, onComplete);

      // 动画完成
      currentTime = 100;
      rafCallbacks[0](currentTime);

      expect(mockElement.scrollLeft).toBe(100);
    });
  });
});
