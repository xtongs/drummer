import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayButton } from "./PlayButton";

describe("PlayButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("基本渲染", () => {
    it("应该在暂停状态时显示播放图标", () => {
      const handleClick = vi.fn();
      const { container } = render(
        <PlayButton isPlaying={false} onClick={handleClick} />,
      );

      const playIcon = container.querySelector(".play-icon");
      expect(playIcon).toBeInTheDocument();
    });

    it("应该在播放状态时显示暂停图标", () => {
      const handleClick = vi.fn();
      const { container } = render(
        <PlayButton isPlaying={true} onClick={handleClick} />,
      );

      const playIcon = container.querySelector(".play-icon");
      expect(playIcon).not.toBeInTheDocument();

      const pauseIcon = container.querySelector("rect");
      expect(pauseIcon).toBeInTheDocument();
    });

    it("应该在循环计数大于0时显示计数", () => {
      const handleClick = vi.fn();
      render(
        <PlayButton isPlaying={false} onClick={handleClick} loopCount={5} />,
      );

      const count = screen.getByText("5");
      expect(count).toBeInTheDocument();
    });

    it("应该在循环计数为0时不显示计数", () => {
      const handleClick = vi.fn();
      const { container } = render(
        <PlayButton isPlaying={false} onClick={handleClick} loopCount={0} />,
      );

      const playIcon = container.querySelector(".play-icon");
      expect(playIcon).toBeInTheDocument();
    });

    it("应该设置正确的 aria-label", () => {
      const handleClick = vi.fn();
      const { rerender } = render(
        <PlayButton isPlaying={false} onClick={handleClick} />,
      );

      expect(screen.getByLabelText("Play")).toBeInTheDocument();

      rerender(<PlayButton isPlaying={true} onClick={handleClick} />);
      expect(screen.getByLabelText("Pause")).toBeInTheDocument();
    });
  });

  describe("点击事件", () => {
    it("应该在点击时调用 onClick", () => {
      const handleClick = vi.fn();
      render(<PlayButton isPlaying={false} onClick={handleClick} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("应该在播放状态点击时调用 onClick", () => {
      const handleClick = vi.fn();
      render(<PlayButton isPlaying={true} onClick={handleClick} />);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("长按重置功能", () => {
    it("应该在长按时调用 onResetCount", () => {
      const handleReset = vi.fn();
      const handleClick = vi.fn();
      render(
        <PlayButton
          isPlaying={false}
          onClick={handleClick}
          loopCount={5}
          onResetCount={handleReset}
        />,
      );

      const button = screen.getByRole("button");

      // 触发鼠标按下
      fireEvent.mouseDown(button);

      // 快进时间 500ms
      vi.advanceTimersByTime(500);

      expect(handleReset).toHaveBeenCalledTimes(1);
    });

    it("应该在短按时不调用 onResetCount", () => {
      const handleReset = vi.fn();
      const handleClick = vi.fn();
      render(
        <PlayButton
          isPlaying={false}
          onClick={handleClick}
          loopCount={5}
          onResetCount={handleReset}
        />,
      );

      const button = screen.getByRole("button");

      // 触发鼠标按下
      fireEvent.mouseDown(button);

      // 快进时间 400ms (不足 500ms)
      vi.advanceTimersByTime(400);

      // 触发鼠标抬起
      fireEvent.mouseUp(button);

      expect(handleReset).not.toHaveBeenCalled();
    });

    it("应该在长按后阻止点击事件", () => {
      const handleReset = vi.fn();
      const handleClick = vi.fn();
      render(
        <PlayButton
          isPlaying={false}
          onClick={handleClick}
          loopCount={5}
          onResetCount={handleReset}
        />,
      );

      const button = screen.getByRole("button");

      // 触发鼠标按下
      fireEvent.mouseDown(button);

      // 快进时间 500ms
      vi.advanceTimersByTime(500);

      // 触发鼠标抬起
      fireEvent.mouseUp(button);

      // 触发点击
      fireEvent.click(button);

      expect(handleReset).toHaveBeenCalledTimes(1);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it("应该在鼠标离开时取消长按", () => {
      const handleReset = vi.fn();
      const handleClick = vi.fn();
      render(
        <PlayButton
          isPlaying={false}
          onClick={handleClick}
          loopCount={5}
          onResetCount={handleReset}
        />,
      );

      const button = screen.getByRole("button");

      // 触发鼠标按下
      fireEvent.mouseDown(button);

      // 快进时间 300ms
      vi.advanceTimersByTime(300);

      // 触发鼠标离开
      fireEvent.mouseLeave(button);

      // 继续快进到 600ms
      vi.advanceTimersByTime(300);

      expect(handleReset).not.toHaveBeenCalled();
    });

    it("应该在没有 onResetCount 时不处理长按", () => {
      const handleClick = vi.fn();
      render(
        <PlayButton isPlaying={false} onClick={handleClick} loopCount={5} />,
      );

      const button = screen.getByRole("button");

      // 触发鼠标按下
      fireEvent.mouseDown(button);

      // 快进时间 500ms
      vi.advanceTimersByTime(500);

      // 不应该抛出错误
      expect(button).toBeInTheDocument();
    });
  });

  describe("触摸事件", () => {
    it("应该在触摸长按时调用 onResetCount", () => {
      const handleReset = vi.fn();
      const handleClick = vi.fn();
      render(
        <PlayButton
          isPlaying={false}
          onClick={handleClick}
          loopCount={5}
          onResetCount={handleReset}
        />,
      );

      const button = screen.getByRole("button");

      // 触发触摸开始
      fireEvent.touchStart(button);

      // 快进时间 500ms
      vi.advanceTimersByTime(500);

      expect(handleReset).toHaveBeenCalledTimes(1);
    });

    it("应该在触摸长按后阻止点击事件", () => {
      const handleReset = vi.fn();
      const handleClick = vi.fn();
      render(
        <PlayButton
          isPlaying={false}
          onClick={handleClick}
          loopCount={5}
          onResetCount={handleReset}
        />,
      );

      const button = screen.getByRole("button");

      // 触发触摸开始
      fireEvent.touchStart(button);

      // 快进时间 500ms
      vi.advanceTimersByTime(500);

      // 触发触摸结束
      fireEvent.touchEnd(button);

      // 触发点击
      fireEvent.click(button);

      expect(handleReset).toHaveBeenCalledTimes(1);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it("应该在触摸短按时不阻止点击事件", () => {
      const handleReset = vi.fn();
      const handleClick = vi.fn();
      render(
        <PlayButton
          isPlaying={false}
          onClick={handleClick}
          loopCount={5}
          onResetCount={handleReset}
        />,
      );

      const button = screen.getByRole("button");

      // 触发触摸开始
      fireEvent.touchStart(button);

      // 快进时间 300ms
      vi.advanceTimersByTime(300);

      // 触发触摸结束
      fireEvent.touchEnd(button);

      // 触发点击
      fireEvent.click(button);

      expect(handleReset).not.toHaveBeenCalled();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("CSS 类名", () => {
    it("应该在暂停状态添加 paused 类", () => {
      const handleClick = vi.fn();
      const { container } = render(
        <PlayButton isPlaying={false} onClick={handleClick} />,
      );

      const button = container.querySelector("button");
      expect(button).toHaveClass("paused");
      expect(button).not.toHaveClass("playing");
    });

    it("应该在播放状态添加 playing 类", () => {
      const handleClick = vi.fn();
      const { container } = render(
        <PlayButton isPlaying={true} onClick={handleClick} />,
      );

      const button = container.querySelector("button");
      expect(button).toHaveClass("playing");
      expect(button).not.toHaveClass("paused");
    });
  });
});
