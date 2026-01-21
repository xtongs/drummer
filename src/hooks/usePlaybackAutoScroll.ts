import { useRef, useEffect, useLayoutEffect, useCallback } from "react";
import type { Pattern, CrossPatternLoop } from "../types";
import { SUBDIVISIONS_PER_BEAT } from "../utils/constants";
import { smoothScrollTo } from "../utils/animation";

interface UsePlaybackAutoScrollOptions {
  /** 滚动容器的 ref */
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  /** 当前播放位置（subdivision 索引） */
  currentBeat: number | undefined;
  /** 单元格大小（像素） */
  cellSize: number;
  /** 当前 pattern */
  pattern: Pattern;
  /** 跨 pattern 循环范围 */
  crossPatternLoop: CrossPatternLoop | undefined;
  /** 是否为草稿模式 */
  isDraftMode: boolean;
  /** 是否正在播放 */
  isPlaying: boolean;
}

interface UsePlaybackAutoScrollReturn {
  /** 滚动容器的 ref */
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  /** 执行滚动的函数 */
  doScroll: (container: HTMLElement, targetLeft: number) => void;
}

/**
 * 管理播放时自动滚动逻辑
 */
export function usePlaybackAutoScroll({
  scrollContainerRef,
  currentBeat,
  cellSize,
  pattern,
  crossPatternLoop,
  isDraftMode,
  isPlaying,
}: UsePlaybackAutoScrollOptions): UsePlaybackAutoScrollReturn {
  const isScrollingRef = useRef(false);
  const lastScrollTargetRef = useRef<number | null>(null);
  const lastPatternIdRef = useRef<string | null>(null);
  const lastPlayingStateRef = useRef(false); // 跟踪上一次的播放状态
  // pattern 切换后，记录预期的起始位置，用于验证 currentBeat 是否已同步
  const expectedStartSubRef = useRef<number | null>(null);

  // 执行滚动的函数
  const doScroll = useCallback((container: HTMLElement, targetLeft: number) => {
    // 如果目标位置与上次相同，不重复滚动
    if (lastScrollTargetRef.current === targetLeft) {
      return;
    }

    // 如果正在滚动中，不触发新的滚动
    if (isScrollingRef.current) {
      return;
    }

    isScrollingRef.current = true;
    lastScrollTargetRef.current = targetLeft;

    smoothScrollTo(container, targetLeft, 150, () => {
      isScrollingRef.current = false;
    });
  }, []);

  // Pattern 切换时，在浏览器绘制前同步设置 scrollLeft
  // 使用 useLayoutEffect 确保在 DOM 更新后、绘制前执行
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const previousPatternId = lastPatternIdRef.current;
    const currentPatternId = pattern.id;

    // 检测 pattern 是否切换
    if (previousPatternId !== null && previousPatternId !== currentPatternId) {
      // Pattern 切换了，计算该 pattern 在 crossPatternLoop 中的起始小节
      // 注意：此时 currentBeat 可能还是旧 pattern 的值，不可靠
      let startBar = 0;

      if (crossPatternLoop) {
        // 检查当前 pattern 是否是 range 的开始 pattern
        const isStartPattern = isDraftMode
          ? crossPatternLoop.startPatternName === ""
          : crossPatternLoop.startPatternName === pattern.name;

        if (isStartPattern) {
          startBar = crossPatternLoop.startBar;
        }
      }

      const [beatsPerBar] = pattern.timeSignature;
      const subdivisionsPerBar = beatsPerBar * SUBDIVISIONS_PER_BEAT;
      const targetLeft = startBar * subdivisionsPerBar * cellSize;

      // 记录预期的起始位置（第一个小节末尾），用于验证 currentBeat 是否已同步
      // 只有当 currentBeat 进入这个范围内时，才恢复正常的滚动逻辑
      expectedStartSubRef.current = (startBar + 1) * subdivisionsPerBar;

      // 使用平滑滚动切换到新 pattern 的起始位置
      doScroll(container, Math.max(0, targetLeft));
    }

    lastPatternIdRef.current = currentPatternId;
  }, [
    pattern.id,
    pattern.name,
    cellSize,
    pattern.timeSignature,
    scrollContainerRef,
    crossPatternLoop,
    isDraftMode,
    doScroll,
  ]);

  // 当播放时，自动滚动到当前游标位置（按页滚动，带提前量）
  useEffect(() => {
    if (currentBeat === undefined || !scrollContainerRef.current) {
      return;
    }

    // 如果正在等待 currentBeat 同步（pattern 刚切换）
    // 只有当 currentBeat 进入预期范围内时，才恢复正常的滚动逻辑
    if (expectedStartSubRef.current !== null) {
      if (currentBeat >= expectedStartSubRef.current) {
        return;
      } else {
        expectedStartSubRef.current = null;
      }
    }

    // 计算小节相关数据
    const [beatsPerBar] = pattern.timeSignature;
    const subdivisionsPerBar = beatsPerBar * SUBDIVISIONS_PER_BEAT;
    const totalSubdivisions = pattern.bars * subdivisionsPerBar;

    // 检查 currentBeat 是否在当前 pattern 的有效范围内
    // 如果超出范围，说明 pattern 和 currentBeat 状态还未同步，跳过本次滚动
    if (currentBeat >= totalSubdivisions) {
      return;
    }

    // 检查 currentBeat 是否在当前 pattern 的循环范围内
    // 这用于检测跨 pattern 切换时的状态不同步
    if (crossPatternLoop) {
      let rangeStartSub = 0;
      let rangeEndSub = totalSubdivisions;

      const isStartPattern = isDraftMode
        ? crossPatternLoop.startPatternName === ""
        : crossPatternLoop.startPatternName === pattern.name;
      const isEndPattern = isDraftMode
        ? crossPatternLoop.endPatternName === ""
        : crossPatternLoop.endPatternName === pattern.name;

      if (isStartPattern) {
        rangeStartSub = crossPatternLoop.startBar * subdivisionsPerBar;
      }
      if (isEndPattern) {
        rangeEndSub = (crossPatternLoop.endBar + 1) * subdivisionsPerBar;
      }

      // 如果 currentBeat 不在循环范围内，说明状态还未同步
      if (currentBeat < rangeStartSub || currentBeat >= rangeEndSub) {
        return;
      }
    }

    const container = scrollContainerRef.current;
    const cursorPosition = currentBeat * cellSize;
    const scrollLeft = container.scrollLeft;
    const scrollRight = scrollLeft + container.clientWidth;
    const rightLead = (cellSize * SUBDIVISIONS_PER_BEAT) / 4;

    const currentBarIndex = Math.floor(currentBeat / subdivisionsPerBar);

    // 游标超出可视区域左侧时，滚动到游标所在小节的起始位置
    if (cursorPosition < scrollLeft) {
      const targetLeft = currentBarIndex * subdivisionsPerBar * cellSize;
      doScroll(container, Math.max(0, targetLeft));
    } else if (cursorPosition + cellSize > scrollRight - rightLead) {
      // 游标接近右侧提前量时，滚动到 range 范围内的下一个小节
      // 确定当前 pattern 在 range 中的范围
      let rangeStartBar = 0;
      let rangeEndBar = pattern.bars - 1;

      if (crossPatternLoop) {
        // 检查当前 pattern 是否是 range 的开始 pattern
        const isStartPattern = isDraftMode
          ? crossPatternLoop.startPatternName === ""
          : crossPatternLoop.startPatternName === pattern.name;
        // 检查当前 pattern 是否是 range 的结束 pattern
        const isEndPattern = isDraftMode
          ? crossPatternLoop.endPatternName === ""
          : crossPatternLoop.endPatternName === pattern.name;

        if (isStartPattern) {
          rangeStartBar = crossPatternLoop.startBar;
        }
        if (isEndPattern) {
          rangeEndBar = crossPatternLoop.endBar;
        }
      }

      // 计算下一个小节的位置
      let nextBarIndex: number;
      if (currentBarIndex >= rangeEndBar) {
        // 当前是 range 最后一个小节，回到 range 开头
        nextBarIndex = rangeStartBar;
      } else {
        // 滚到下一个小节
        nextBarIndex = currentBarIndex + 1;
      }

      const targetLeft = nextBarIndex * subdivisionsPerBar * cellSize;
      doScroll(container, Math.max(0, targetLeft));
    }
  }, [
    currentBeat,
    cellSize,
    doScroll,
    pattern.timeSignature,
    pattern.bars,
    pattern.name,
    crossPatternLoop,
    isDraftMode,
    scrollContainerRef,
  ]);

  // 当停止播放或切换 pattern 时，重置滚动状态
  useEffect(() => {
    if (!isPlaying) {
      lastScrollTargetRef.current = null;
      lastPlayingStateRef.current = false;
    }
  }, [isPlaying, pattern.id]);

  // 当开始播放时，自动对齐游标所在小节的左边界到容器左边
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // 检测是否从停止状态开始播放
    const wasNotPlaying = !lastPlayingStateRef.current && isPlaying;
    lastPlayingStateRef.current = isPlaying;

    if (!wasNotPlaying || currentBeat === undefined) {
      return;
    }

    // 计算小节相关数据
    const [beatsPerBar] = pattern.timeSignature;
    const subdivisionsPerBar = beatsPerBar * SUBDIVISIONS_PER_BEAT;
    const totalSubdivisions = pattern.bars * subdivisionsPerBar;

    // 检查 currentBeat 是否在当前 pattern 的有效范围内
    // 如果超出范围，说明 pattern 和 currentBeat 状态还未同步，跳过本次滚动
    if (currentBeat >= totalSubdivisions) {
      return;
    }

    // 检查 currentBeat 是否在当前 pattern 的循环范围内
    if (crossPatternLoop) {
      let rangeStartSub = 0;
      let rangeEndSub = totalSubdivisions;

      const isStartPattern = isDraftMode
        ? crossPatternLoop.startPatternName === ""
        : crossPatternLoop.startPatternName === pattern.name;
      const isEndPattern = isDraftMode
        ? crossPatternLoop.endPatternName === ""
        : crossPatternLoop.endPatternName === pattern.name;

      if (isStartPattern) {
        rangeStartSub = crossPatternLoop.startBar * subdivisionsPerBar;
      }
      if (isEndPattern) {
        rangeEndSub = (crossPatternLoop.endBar + 1) * subdivisionsPerBar;
      }

      // 如果 currentBeat 不在循环范围内，说明状态还未同步
      if (currentBeat < rangeStartSub || currentBeat >= rangeEndSub) {
        return;
      }
    }

    // 计算游标所在的小节索引
    const currentBarIndex = Math.floor(currentBeat / subdivisionsPerBar);

    // 计算该小节的左边界位置
    const barLeft = currentBarIndex * subdivisionsPerBar * cellSize;

    // 检查当前 scrollLeft 是否已经对齐（允许小幅误差）
    const currentScrollLeft = container.scrollLeft;
    const tolerance = cellSize; // 1个单元格的容差
    if (Math.abs(currentScrollLeft - barLeft) <= tolerance) {
      // 已经对齐，不需要滚动
      return;
    }

    // 计算右侧提前量（与自动滚动逻辑保持一致）
    const rightLead = (cellSize * SUBDIVISIONS_PER_BEAT) / 2;

    // 检查游标是否已经接近右边界（考虑 rightLead）
    const cursorPosition = currentBeat * cellSize;
    const scrollRight = currentScrollLeft + container.clientWidth;

    if (cursorPosition + cellSize > scrollRight - rightLead) {
      // 如果游标已经在接近右边界，滚动到下一个小节
      // 确定当前 pattern 在 range 中的范围
      let rangeStartBar = 0;
      let rangeEndBar = pattern.bars - 1;

      if (crossPatternLoop) {
        const isStartPattern = isDraftMode
          ? crossPatternLoop.startPatternName === ""
          : crossPatternLoop.startPatternName === pattern.name;
        const isEndPattern = isDraftMode
          ? crossPatternLoop.endPatternName === ""
          : crossPatternLoop.endPatternName === pattern.name;

        if (isStartPattern) {
          rangeStartBar = crossPatternLoop.startBar;
        }
        if (isEndPattern) {
          rangeEndBar = crossPatternLoop.endBar;
        }
      }

      // 计算下一个小节的位置
      let nextBarIndex: number;
      if (currentBarIndex >= rangeEndBar) {
        // 当前是 range 最后一个小节，回到 range 开头
        nextBarIndex = rangeStartBar;
      } else {
        // 滚到下一个小节
        nextBarIndex = currentBarIndex + 1;
      }

      const nextBarLeft = nextBarIndex * subdivisionsPerBar * cellSize;
      doScroll(container, nextBarLeft);
    } else {
      // 否则，滚动到当前小节的左边界
      doScroll(container, barLeft);
    }
  }, [
    isPlaying,
    currentBeat,
    cellSize,
    pattern.timeSignature,
    pattern.bars,
    pattern.name,
    crossPatternLoop,
    isDraftMode,
    scrollContainerRef,
    doScroll,
  ]);

  return {
    scrollContainerRef,
    doScroll,
  };
}
