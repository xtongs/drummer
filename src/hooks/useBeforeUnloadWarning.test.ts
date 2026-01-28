import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBeforeUnloadWarning } from "./useBeforeUnloadWarning";

describe("useBeforeUnloadWarning", () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  // 辅助函数：获取 beforeunload 事件处理程序
  const getBeforeUnloadHandler = (): EventListener => {
    const call = addEventListenerSpy.mock.calls.find(
      (c: unknown[]) => c[0] === "beforeunload",
    );
    return call?.[1] as EventListener;
  };

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, "addEventListener");
    removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it("应该在挂载时添加 beforeunload 事件监听器", () => {
    renderHook(() => useBeforeUnloadWarning(false, false));

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
  });

  it("应该在卸载时移除 beforeunload 事件监听器", () => {
    const { unmount } = renderHook(() => useBeforeUnloadWarning(false, false));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
  });

  describe("当播放状态变化时", () => {
    it("当节拍器正在播放时，beforeunload 事件应该阻止关闭", () => {
      renderHook(() => useBeforeUnloadWarning(true, false));

      const handler = getBeforeUnloadHandler();
      const event = {
        preventDefault: vi.fn(),
        returnValue: "",
      } as unknown as BeforeUnloadEvent;

      handler(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.returnValue).toBe("");
    });

    it("当节奏型正在播放时，beforeunload 事件应该阻止关闭", () => {
      renderHook(() => useBeforeUnloadWarning(false, true));

      const handler = getBeforeUnloadHandler();
      const event = {
        preventDefault: vi.fn(),
        returnValue: "",
      } as unknown as BeforeUnloadEvent;

      handler(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.returnValue).toBe("");
    });

    it("当没有任何播放时，beforeunload 事件不应该阻止关闭", () => {
      renderHook(() => useBeforeUnloadWarning(false, false));

      const handler = getBeforeUnloadHandler();
      const event = {
        preventDefault: vi.fn(),
        returnValue: "initial",
      } as unknown as BeforeUnloadEvent;

      handler(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      // returnValue 应该保持不变（未被设置为空字符串）
      expect(event.returnValue).toBe("initial");
    });

    it("当播放状态从播放变为停止时，应该正确响应", () => {
      const { rerender } = renderHook(
        ({ isMetronomePlaying, isPatternPlaying }) =>
          useBeforeUnloadWarning(isMetronomePlaying, isPatternPlaying),
        { initialProps: { isMetronomePlaying: true, isPatternPlaying: false } },
      );

      const handler = getBeforeUnloadHandler();

      // 先测试播放状态
      let event = {
        preventDefault: vi.fn(),
        returnValue: "",
      } as unknown as BeforeUnloadEvent;
      handler(event);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.returnValue).toBe("");

      // 更新为停止状态
      rerender({ isMetronomePlaying: false, isPatternPlaying: false });

      // 再次触发事件，应该不阻止
      event = {
        preventDefault: vi.fn(),
        returnValue: "initial",
      } as unknown as BeforeUnloadEvent;
      handler(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(event.returnValue).toBe("initial");
    });
  });
});
