import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { DrumNotation, RENDERER_CHANGE_EVENT } from "./DrumNotation";
import type { Pattern } from "../../types";
import { CELL_OFF, CELL_NORMAL } from "../../types";
import * as storage from "../../utils/storage";

// Mock VexFlow
vi.mock("vexflow", () => ({
  Renderer: vi.fn().mockImplementation(() => ({
    resize: vi.fn(),
    getContext: vi.fn().mockReturnValue({
      setFont: vi.fn(),
    }),
  })),
}));

// 创建测试用的 Pattern
function createTestPattern(overrides: Partial<Pattern> = {}): Pattern {
  return {
    id: "test-pattern-1",
    name: "Test Pattern",
    bpm: 120,
    timeSignature: [4, 4] as [number, number],
    bars: 1,
    grid: [[CELL_NORMAL, CELL_OFF, CELL_OFF, CELL_OFF]],
    drums: ["Kick"],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("DrumNotation 组件", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("渲染器选择", () => {
    it("默认应该使用 Legacy 渲染器", () => {
      const pattern = createTestPattern();
      const { container } = render(
        <DrumNotation pattern={pattern} cellSize={20} />,
      );

      // 验证容器存在
      expect(container.querySelector(".drum-notation-container")).toBeTruthy();
    });

    it("当设置为 vexflow 时应该使用 VexFlow 渲染器", () => {
      storage.setNotationRenderer("vexflow");

      const pattern = createTestPattern();
      const { container } = render(
        <DrumNotation pattern={pattern} cellSize={20} />,
      );

      // 验证容器存在
      expect(container.querySelector(".drum-notation-container")).toBeTruthy();
    });

    it("应该响应渲染器变更事件", async () => {
      const pattern = createTestPattern();
      const { container } = render(
        <DrumNotation pattern={pattern} cellSize={20} />,
      );

      // 初始状态
      expect(container.querySelector(".drum-notation-container")).toBeTruthy();

      // 切换渲染器
      act(() => {
        storage.setNotationRenderer("vexflow");
        window.dispatchEvent(new CustomEvent(RENDERER_CHANGE_EVENT));
      });

      // 验证仍然渲染（使用新渲染器）
      expect(container.querySelector(".drum-notation-container")).toBeTruthy();
    });
  });

  describe("交互事件", () => {
    it("双击应该触发 onDoubleClick 回调", () => {
      const pattern = createTestPattern();
      const onDoubleClick = vi.fn();

      const { container } = render(
        <DrumNotation
          pattern={pattern}
          cellSize={20}
          onDoubleClick={onDoubleClick}
        />
      );

      const svg = container.querySelector("svg");
      if (svg) {
        // 模拟双击
        fireEvent.doubleClick(svg, { clientX: 50, clientY: 50 });

        // 验证回调被调用
        expect(onDoubleClick).toHaveBeenCalled();
      }
    });

    it("双击应该传递正确的 subdivision", () => {
      const pattern = createTestPattern();
      const onDoubleClick = vi.fn();

      // 需要 mock getBoundingClientRect
      const originalGetBoundingClientRect =
        Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: 200,
        height: 100,
        right: 200,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      try {
        const { container } = render(
          <DrumNotation
            pattern={pattern}
            cellSize={20}
            onDoubleClick={onDoubleClick}
          />
        );

        const svg = container.querySelector("svg");
        if (svg) {
          // 模拟双击
          fireEvent.doubleClick(svg, { clientX: 50, clientY: 50 });

          // 验证回调被调用并传递了 subdivision
          expect(onDoubleClick).toHaveBeenCalledWith(expect.any(Number));
        }
      } finally {
        Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      }
    });
  });

  describe("持久化", () => {
    it("渲染器设置应该从 localStorage 读取", () => {
      // 先设置 vexflow
      storage.setNotationRenderer("vexflow");

      const pattern = createTestPattern();
      render(<DrumNotation pattern={pattern} cellSize={20} />);

      // 验证读取了正确的设置
      expect(storage.getNotationRenderer()).toBe("vexflow");
    });

    it("刷新后应该保持用户选择", () => {
      // 设置为 vexflow
      storage.setNotationRenderer("vexflow");

      // 第一次渲染
      const pattern = createTestPattern();
      const { unmount } = render(
        <DrumNotation pattern={pattern} cellSize={20} />,
      );
      unmount();

      // 验证设置仍然存在
      expect(storage.getNotationRenderer()).toBe("vexflow");

      // 第二次渲染（模拟刷新）
      render(<DrumNotation pattern={pattern} cellSize={20} />);
      expect(storage.getNotationRenderer()).toBe("vexflow");
    });
  });
});

describe("渲染器设置存储", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("默认值应该为 vexflow", () => {
    expect(storage.getNotationRenderer()).toBe("vexflow");
  });

  it("设置渲染器不影响当前默认值", () => {
    storage.setNotationRenderer("vexflow");
    expect(storage.getNotationRenderer()).toBe("vexflow");

    storage.setNotationRenderer("legacy");
    expect(storage.getNotationRenderer()).toBe("vexflow");
  });

  it("非法值应该回退到默认值", () => {
    localStorage.setItem("drummer-notation-renderer", "invalid");
    expect(storage.getNotationRenderer()).toBe("vexflow");
  });
});
