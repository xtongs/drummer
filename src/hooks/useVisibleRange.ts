import { useRef, useLayoutEffect, useCallback, useState, useMemo } from "react";

interface UseVisibleRangeOptions {
  /** 每个 item 的像素宽度 */
  itemSize: number;
  /** 总 item 数量 */
  totalItems: number;
  /** 缓冲区大小（item 数量） */
  bufferItems?: number;
}

/**
 * 计算可见范围
 */
function calculateVisibleRange(
  scrollRect: DOMRect,
  contentRect: DOMRect,
  itemSize: number,
  bufferItems: number,
  totalItems: number,
): { start: number; end: number } {
  const visibleLeft = scrollRect.left - contentRect.left;
  const visibleRight = visibleLeft + scrollRect.width;

  const startItem = Math.max(0, Math.floor(visibleLeft / itemSize) - bufferItems);
  const endItem = Math.min(totalItems, Math.ceil(visibleRight / itemSize) + bufferItems);

  return { start: startItem, end: endItem };
}

/**
 * 抽象可见性范围的 Hook，用于 Grid 和 VexFlow 等列表渲染的 lazy loading
 */
export function useVisibleRange(
  scrollContainerRef: React.RefObject<HTMLElement> | undefined,
  contentRef: React.RefObject<HTMLElement>,
  options: UseVisibleRangeOptions,
): { start: number; end: number; visibleSet: Set<number> } {
  const { itemSize, totalItems, bufferItems = 0 } = options;

  const initializedRef = useRef(false);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: totalItems });

  const calculateRange = useCallback(() => {
    const scrollContainer = scrollContainerRef?.current;
    const content = contentRef.current;

    // 如果还没有 scrollContainer，跳过初始化
    if (!scrollContainer || !content) {
      return;
    }

    // 首次有 scrollContainer 时初始化
    if (!initializedRef.current) {
      initializedRef.current = true;
    }

    const scrollRect = scrollContainer.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();

    // 处理内容比视口小的情况
    if (contentRect.width <= scrollRect.width) {
      setVisibleRange({ start: 0, end: totalItems });
      return;
    }

    const newRange = calculateVisibleRange(
      scrollRect,
      contentRect,
      itemSize,
      bufferItems,
      totalItems,
    );

    // 只有范围变化时才更新，避免无限循环
    setVisibleRange((prev) => {
      if (prev.start === newRange.start && prev.end === newRange.end) {
        return prev;
      }
      return newRange;
    });
  }, [scrollContainerRef, contentRef, itemSize, bufferItems, totalItems]);

  useLayoutEffect(() => {
    calculateRange();

    const scrollContainer = scrollContainerRef?.current;
    if (!scrollContainer) return;

    let rafId: number;

    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calculateRange);
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", calculateRange);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      scrollContainer.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", calculateRange);
    };
  }, [scrollContainerRef, calculateRange]);

  const visibleSet = useMemo(
    () =>
      new Set(
        Array.from({ length: visibleRange.end - visibleRange.start }, (_, i) => visibleRange.start + i),
      ),
    [visibleRange],
  );

  return { ...visibleRange, visibleSet };
}
