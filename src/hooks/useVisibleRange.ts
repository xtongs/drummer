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
  scrollLeft: number,
  viewportWidth: number,
  itemSize: number,
  bufferItems: number,
  totalItems: number,
): { start: number; end: number } {
  const visibleLeft = scrollLeft;
  const visibleRight = visibleLeft + viewportWidth;

  const startItem = Math.max(
    0,
    Math.floor(visibleLeft / itemSize) - bufferItems,
  );
  const endItem = Math.min(
    totalItems,
    Math.ceil(visibleRight / itemSize) + bufferItems,
  );

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
  // 初始状态只渲染可见区域（按当前视口宽度估算，buffer 2 beat）
  // 避免首次渲染时渲染所有 items 导致长 pattern 卡顿
  const [visibleRange, setVisibleRange] = useState(() => {
    const initialVisibleItems = Math.min(
      totalItems,
      Math.ceil(window.innerWidth / itemSize) + bufferItems! * 2,
    );
    return { start: 0, end: initialVisibleItems };
  });

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

    const viewportWidth = scrollContainer.clientWidth;

    // 处理内容比视口小的情况
    if (totalItems * itemSize <= viewportWidth) {
      setVisibleRange({ start: 0, end: totalItems });
      return;
    }

    const newRange = calculateVisibleRange(
      scrollContainer.scrollLeft,
      viewportWidth,
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

  const scrollContainer = scrollContainerRef?.current;

  useLayoutEffect(() => {
    if (!scrollContainer) return;

    calculateRange();

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
  }, [scrollContainer, calculateRange]);

  const visibleSet = useMemo(
    () =>
      new Set(
        Array.from(
          { length: visibleRange.end - visibleRange.start },
          (_, i) => visibleRange.start + i,
        ),
      ),
    [visibleRange],
  );

  return { ...visibleRange, visibleSet };
}
