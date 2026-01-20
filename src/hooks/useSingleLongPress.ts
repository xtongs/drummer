import { useCallback, useRef, useEffect, useState } from "react";

interface UseSingleLongPressOptions {
  delay?: number;
  onLongPress: () => void;
  onClick?: () => void;
}

/**
 * 单次长按 hook - 长按时触发一次 onLongPress，不触发 onClick
 * 短按时只触发 onClick，不触发 onLongPress
 *
 * 与 useLongPress 的区别：
 * - useLongPress 是用于连续触发（如长按调节 BPM）
 * - useSingleLongPress 是用于长按触发一次操作（如长按复制到剪贴板）
 */
export function useSingleLongPress(options: UseSingleLongPressOptions) {
  const { delay = 500, onLongPress, onClick } = options;

  // 使用 state 来跟踪元素，这样当元素变化时 useEffect 会重新运行
  const [element, setElement] = useState<HTMLElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPressingRef = useRef(false);
  const hasTriggeredLongPressRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const onLongPressRef = useRef(onLongPress);
  const onClickRef = useRef(onClick);

  // 保持回调引用最新
  onLongPressRef.current = onLongPress;
  onClickRef.current = onClick;

  const stopPress = useCallback(() => {
    isPressingRef.current = false;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startPress = useCallback(() => {
    if (isPressingRef.current) return;
    isPressingRef.current = true;
    startTimeRef.current = Date.now();
    hasTriggeredLongPressRef.current = false;

    timeoutRef.current = setTimeout(() => {
      if (!isPressingRef.current) return;

      hasTriggeredLongPressRef.current = true;
      onLongPressRef.current();
    }, delay);
  }, [delay]);

  const handlePressEnd = useCallback(() => {
    const wasPressed = isPressingRef.current;
    const pressDuration = Date.now() - startTimeRef.current;
    const didTriggerLongPress = hasTriggeredLongPressRef.current;

    stopPress();

    // 如果是短按（未触发长按），则执行 onClick
    if (
      wasPressed &&
      !didTriggerLongPress &&
      pressDuration < delay &&
      onClickRef.current
    ) {
      onClickRef.current();
    }
  }, [delay, stopPress]);

  // 使用 useEffect 来添加原生事件监听器，设置 passive: false
  useEffect(() => {
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      // 只有在事件可取消时才阻止默认行为（避免滚动时警告）
      if (e.cancelable) {
        e.preventDefault();
      }
      startPress();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
      handlePressEnd();
    };

    const handleTouchCancel = () => {
      stopPress();
    };

    const handleContextMenu = (e: Event) => {
      // 阻止右键菜单/长按菜单
      e.preventDefault();
    };

    // 添加事件监听器，设置 passive: false 以允许 preventDefault
    element.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    element.addEventListener("touchend", handleTouchEnd, { passive: false });
    element.addEventListener("touchcancel", handleTouchCancel);
    element.addEventListener("contextmenu", handleContextMenu);

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchcancel", handleTouchCancel);
      element.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [element, startPress, handlePressEnd, stopPress]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      stopPress();
    };
  }, [stopPress]);

  // ref 回调函数，用于获取元素引用并触发 state 更新
  const refCallback = useCallback((node: HTMLElement | null) => {
    setElement(node);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // 阻止默认行为，防止某些情况下的文本选择
      e.preventDefault();
      startPress();
    },
    [startPress]
  );

  const handleMouseUp = useCallback(() => {
    handlePressEnd();
  }, [handlePressEnd]);

  const handleMouseLeave = useCallback(() => {
    stopPress();
  }, [stopPress]);

  return {
    ref: refCallback,
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
  };
}
