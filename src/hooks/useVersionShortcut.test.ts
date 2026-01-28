import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useVersionShortcut } from "./useVersionShortcut";

describe("useVersionShortcut", () => {
  let dispatchEventSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
  });

  afterEach(() => {
    vi.useRealTimers();
    dispatchEventSpy.mockRestore();
  });

  it("应该添加 pointerdown 事件监听器", () => {
    const addEventListenerSpy = vi.spyOn(document.body, "addEventListener");

    renderHook(() => useVersionShortcut());

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "pointerdown",
      expect.any(Function),
      {
        passive: true,
      },
    );

    addEventListenerSpy.mockRestore();
  });

  it("卸载时应该移除事件监听器", () => {
    const removeEventListenerSpy = vi.spyOn(
      document.body,
      "removeEventListener",
    );

    const { unmount } = renderHook(() => useVersionShortcut());
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "pointerdown",
      expect.any(Function),
    );

    removeEventListenerSpy.mockRestore();
  });

  it("快速点击5次应该触发 show-version 事件", () => {
    renderHook(() => useVersionShortcut());

    // 模拟5次快速点击（使用 MouseEvent 因为 jsdom 不支持 PointerEvent）
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(100); // 每次点击间隔100ms
      const event = new MouseEvent("pointerdown", {
        bubbles: true,
      });
      document.body.dispatchEvent(event);
    }

    // 检查是否触发了 show-version 事件
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "show-version",
      }),
    );
  });

  it("点击间隔超过300ms应该重置计数", () => {
    renderHook(() => useVersionShortcut());

    // 点击3次
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(100);
      const event = new MouseEvent("pointerdown", {
        bubbles: true,
      });
      document.body.dispatchEvent(event);
    }

    // 等待超过阈值
    vi.advanceTimersByTime(400);

    // 再点击2次（总共不够5次，因为之前的已重置）
    for (let i = 0; i < 2; i++) {
      vi.advanceTimersByTime(100);
      const event = new MouseEvent("pointerdown", {
        bubbles: true,
      });
      document.body.dispatchEvent(event);
    }

    // 不应该触发 show-version（只有 show-version 事件类型）
    const showVersionCalls = dispatchEventSpy.mock.calls.filter(
      (call: [Event]) => call[0].type === "show-version",
    );
    expect(showVersionCalls.length).toBe(0);
  });

  it("点击按钮时不应该计数", () => {
    renderHook(() => useVersionShortcut());

    // 创建一个按钮并添加到 body
    const button = document.createElement("button");
    document.body.appendChild(button);

    // 模拟5次点击按钮
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(100);
      const event = new MouseEvent("pointerdown", {
        bubbles: true,
      });
      Object.defineProperty(event, "target", { value: button });
      document.body.dispatchEvent(event);
    }

    // 不应该触发 show-version
    const showVersionCalls = dispatchEventSpy.mock.calls.filter(
      (call: [Event]) => call[0].type === "show-version",
    );
    expect(showVersionCalls.length).toBe(0);

    // 清理
    document.body.removeChild(button);
  });

  it("点击 input 时不应该计数", () => {
    renderHook(() => useVersionShortcut());

    const input = document.createElement("input");
    document.body.appendChild(input);

    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(100);
      const event = new MouseEvent("pointerdown", {
        bubbles: true,
      });
      Object.defineProperty(event, "target", { value: input });
      document.body.dispatchEvent(event);
    }

    const showVersionCalls = dispatchEventSpy.mock.calls.filter(
      (call: [Event]) => call[0].type === "show-version",
    );
    expect(showVersionCalls.length).toBe(0);

    document.body.removeChild(input);
  });
});
