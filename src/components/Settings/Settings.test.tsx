import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Settings } from "./Settings";
import * as storage from "../../utils/storage";
import * as audioEngine from "../../utils/audioEngine";

// Mock storage functions
vi.mock("../../utils/storage", () => ({
  loadSampleSelection: vi.fn(),
  setSampleVariant: vi.fn(),
}));

// Mock audioEngine functions
vi.mock("../../utils/audioEngine", () => ({
  playDrumSound: vi.fn(),
  reloadSamples: vi.fn(),
}));

// Mock useTheme hook
vi.mock("../../hooks/useTheme", () => ({
  useTheme: vi.fn(() => ({
    currentTheme: { name: "Light" },
    cycleTheme: vi.fn(),
  })),
}));

// Mock configBackup functions
vi.mock("../../utils/configBackup", () => ({
  exportConfig: vi.fn(),
  importConfig: vi.fn(),
}));

describe("Settings 采样选择功能", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // 默认mock返回值
    vi.mocked(storage.loadSampleSelection).mockReturnValue({});
    vi.mocked(audioEngine.playDrumSound).mockResolvedValue(undefined);
    vi.mocked(audioEngine.reloadSamples).mockResolvedValue(undefined);
  });

  describe("采样选择UI渲染", () => {
    it("应该渲染所有10个鼓件", () => {
      render(<Settings />);

      // 打开 modal
      const aboutButton = screen.getByTitle("About");
      fireEvent.click(aboutButton);

      const expectedDrums = [
        "Crash 1",
        "Crash 2",
        "Hi-Hat Open",
        "Hi-Hat Closed",
        "Ride",
        "Tom 1",
        "Tom 2",
        "Snare",
        "Tom 3",
        "Kick",
      ];

      expectedDrums.forEach((drum) => {
        expect(screen.getByText(drum)).toBeInTheDocument();
      });
    });

    it("每个鼓件应该有A/B/C三个变体按钮", () => {
      render(<Settings />);

      const aboutButton = screen.getByTitle("About");
      fireEvent.click(aboutButton);

      // 检查 Kick 鼓的三个变体按钮
      const kickSection = screen
        .getAllByText("Kick")
        .find((el) => el.textContent === "Kick")
        ?.closest(".sample-selection-item");

      expect(kickSection).not.toBeNull();

      const variantButtons = kickSection?.querySelectorAll(
        ".sample-variant-button",
      );
      expect(variantButtons).toHaveLength(3);
      expect(variantButtons?.[0]).toHaveTextContent("A");
      expect(variantButtons?.[1]).toHaveTextContent("B");
      expect(variantButtons?.[2]).toHaveTextContent("C");
    });

    it("应该默认选中A变体", () => {
      vi.mocked(storage.loadSampleSelection).mockReturnValue({});

      render(<Settings />);

      const aboutButton = screen.getByTitle("About");
      fireEvent.click(aboutButton);

      // 获取所有 A 按钮
      const aButtons = screen
        .getAllByText("A")
        .filter((el) => el.classList.contains("sample-variant-button"));

      aButtons.forEach((button) => {
        expect(button).toHaveClass("active");
      });
    });

    it("应该正确显示已保存的采样选择", () => {
      vi.mocked(storage.loadSampleSelection).mockReturnValue({
        Kick: "B",
        Snare: "C",
      });

      render(<Settings />);

      const aboutButton = screen.getByTitle("About");
      fireEvent.click(aboutButton);

      // 找到 Kick 的 B 按钮
      const kickButtons = screen
        .getAllByText("Kick")
        .filter((el) => el.textContent === "Kick");
      const kickSection = kickButtons[0]?.closest(".sample-selection-item");
      const kickBButton =
        kickSection?.querySelectorAll(".sample-variant-button")[1];

      expect(kickBButton).toHaveClass("active");

      // 找到 Snare 的 C 按钮
      const snareButtons = screen
        .getAllByText("Snare")
        .filter((el) => el.textContent === "Snare");
      const snareSection = snareButtons[0]?.closest(".sample-selection-item");
      const snareCButton =
        snareSection?.querySelectorAll(".sample-variant-button")[2];

      expect(snareCButton).toHaveClass("active");
    });
  });

  describe("采样选择交互", () => {
    it("点击变体按钮应该调用setSampleVariant", async () => {
      render(<Settings />);

      const aboutButton = screen.getByTitle("About");
      fireEvent.click(aboutButton);

      // 找到 Kick 的 B 按钮
      const kickButtons = screen
        .getAllByText("Kick")
        .filter((el) => el.textContent === "Kick");
      const kickSection = kickButtons[0]?.closest(".sample-selection-item");
      const kickBButton =
        kickSection?.querySelectorAll(".sample-variant-button")[1];

      fireEvent.click(kickBButton!);

      expect(storage.setSampleVariant).toHaveBeenCalledWith("Kick", "B");
    });

    it("点击变体按钮应该调用reloadSamples", async () => {
      render(<Settings />);

      const aboutButton = screen.getByTitle("About");
      fireEvent.click(aboutButton);

      const kickButtons = screen
        .getAllByText("Kick")
        .filter((el) => el.textContent === "Kick");
      const kickSection = kickButtons[0]?.closest(".sample-selection-item");
      const kickBButton =
        kickSection?.querySelectorAll(".sample-variant-button")[1];

      fireEvent.click(kickBButton!);

      expect(audioEngine.reloadSamples).toHaveBeenCalled();
    });

    it("点击变体按钮应该调用playDrumSound预览", async () => {
      render(<Settings />);

      const aboutButton = screen.getByTitle("About");
      fireEvent.click(aboutButton);

      const kickButtons = screen
        .getAllByText("Kick")
        .filter((el) => el.textContent === "Kick");
      const kickSection = kickButtons[0]?.closest(".sample-selection-item");
      const kickBButton =
        kickSection?.querySelectorAll(".sample-variant-button")[1];

      fireEvent.click(kickBButton!);

      // 等待所有异步操作完成
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(audioEngine.playDrumSound).toHaveBeenCalledWith("Kick");
    });

    it("应该按正确顺序执行: 切换采样 → 重载采样 → 预览", async () => {
      const callOrder: string[] = [];

      vi.mocked(storage.setSampleVariant).mockImplementation(() => {
        callOrder.push("setSampleVariant");
      });
      vi.mocked(audioEngine.reloadSamples).mockImplementation(async () => {
        callOrder.push("reloadSamples");
      });
      vi.mocked(audioEngine.playDrumSound).mockImplementation(async () => {
        callOrder.push("playDrumSound");
      });

      render(<Settings />);

      const aboutButton = screen.getByTitle("About");
      fireEvent.click(aboutButton);

      const kickButtons = screen
        .getAllByText("Kick")
        .filter((el) => el.textContent === "Kick");
      const kickSection = kickButtons[0]?.closest(".sample-selection-item");
      const kickBButton =
        kickSection?.querySelectorAll(".sample-variant-button")[1];

      fireEvent.click(kickBButton!);

      // 等待所有异步操作完成
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(callOrder).toEqual([
        "setSampleVariant",
        "reloadSamples",
        "playDrumSound",
      ]);
    });

    it("切换后应该更新UI显示active状态", async () => {
      render(<Settings />);

      const aboutButton = screen.getByTitle("About");
      fireEvent.click(aboutButton);

      const kickButtons = screen
        .getAllByText("Kick")
        .filter((el) => el.textContent === "Kick");
      const kickSection = kickButtons[0]?.closest(".sample-selection-item");
      const kickButtons_list =
        kickSection?.querySelectorAll(".sample-variant-button");

      // 初始状态: A 是 active
      expect(kickButtons_list?.[0]).toHaveClass("active");
      expect(kickButtons_list?.[1]).not.toHaveClass("active");

      // 点击 B
      fireEvent.click(kickButtons_list![1]);

      // B 变成 active
      expect(kickButtons_list?.[0]).not.toHaveClass("active");
      expect(kickButtons_list?.[1]).toHaveClass("active");
    });
  });

  describe("多个鼓件的采样选择", () => {
    it("应该支持独立选择每个鼓件的采样", async () => {
      render(<Settings />);

      const aboutButton = screen.getByTitle("About");
      fireEvent.click(aboutButton);

      // 选择 Kick 的 B
      const kickButtons = screen
        .getAllByText("Kick")
        .filter((el) => el.textContent === "Kick");
      const kickSection = kickButtons[0]?.closest(".sample-selection-item");
      const kickBButton =
        kickSection?.querySelectorAll(".sample-variant-button")[1];
      fireEvent.click(kickBButton!);

      // 选择 Snare 的 C
      const snareButtons = screen
        .getAllByText("Snare")
        .filter((el) => el.textContent === "Snare");
      const snareSection = snareButtons[0]?.closest(".sample-selection-item");
      const snareCButton =
        snareSection?.querySelectorAll(".sample-variant-button")[2];
      fireEvent.click(snareCButton!);

      expect(storage.setSampleVariant).toHaveBeenCalledWith("Kick", "B");
      expect(storage.setSampleVariant).toHaveBeenCalledWith("Snare", "C");
    });

    it("应该支持部分鼓件选择不同变体", async () => {
      vi.mocked(storage.loadSampleSelection).mockReturnValue({
        Kick: "B",
        Snare: "C",
        "Hi-Hat Closed": "B",
      });

      render(<Settings />);

      const aboutButton = screen.getByTitle("About");
      fireEvent.click(aboutButton);

      // 验证 Kick 是 B
      const kickButtons = screen
        .getAllByText("Kick")
        .filter((el) => el.textContent === "Kick");
      const kickSection = kickButtons[0]?.closest(".sample-selection-item");
      const kickVariantButtons =
        kickSection?.querySelectorAll(".sample-variant-button");

      expect(kickVariantButtons?.[0]).not.toHaveClass("active");
      expect(kickVariantButtons?.[1]).toHaveClass("active");
      expect(kickVariantButtons?.[2]).not.toHaveClass("active");

      // 验证 Snare 是 C
      const snareButtons = screen
        .getAllByText("Snare")
        .filter((el) => el.textContent === "Snare");
      const snareSection = snareButtons[0]?.closest(".sample-selection-item");
      const snareVariantButtons =
        snareSection?.querySelectorAll(".sample-variant-button");

      expect(snareVariantButtons?.[0]).not.toHaveClass("active");
      expect(snareVariantButtons?.[1]).not.toHaveClass("active");
      expect(snareVariantButtons?.[2]).toHaveClass("active");
    });
  });

  describe("组件挂载和localStorage", () => {
    it("组件挂载时应该加载已保存的采样选择", () => {
      vi.mocked(storage.loadSampleSelection).mockReturnValue({
        Kick: "B",
        Snare: "C",
      });

      render(<Settings />);

      expect(storage.loadSampleSelection).toHaveBeenCalled();
    });

    it("localStorage为空时应该使用默认值A", () => {
      vi.mocked(storage.loadSampleSelection).mockReturnValue({});

      render(<Settings />);

      const aboutButton = screen.getByTitle("About");
      fireEvent.click(aboutButton);

      // 所有鼓件的A按钮都应该是active
      const aButtons = screen
        .getAllByText("A")
        .filter((el) => el.classList.contains("sample-variant-button"));

      aButtons.forEach((button) => {
        expect(button).toHaveClass("active");
      });
    });
  });

  describe("按钮标题和可访问性", () => {
    it("变体按钮应该有正确的title属性", () => {
      render(<Settings />);

      const aboutButton = screen.getByTitle("About");
      fireEvent.click(aboutButton);

      const kickButtons = screen
        .getAllByText("Kick")
        .filter((el) => el.textContent === "Kick");
      const kickSection = kickButtons[0]?.closest(".sample-selection-item");
      const kickAButton =
        kickSection?.querySelectorAll(".sample-variant-button")[0];

      expect(kickAButton).toHaveAttribute(
        "title",
        "Select A variant for Kick",
      );
    });
  });
});
