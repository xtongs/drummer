// 用于取消当前动画的 ID
let currentAnimationId: number | null = null;

/**
 * 取消当前正在进行的滚动动画
 */
export function cancelSmoothScroll(): void {
  if (currentAnimationId !== null) {
    cancelAnimationFrame(currentAnimationId);
    currentAnimationId = null;
  }
}

/**
 * 自定义快速动画滚动函数
 * @param element - 要滚动的 DOM 元素
 * @param targetLeft - 目标滚动位置（像素）
 * @param duration - 动画时长（毫秒），默认 150ms
 * @param onComplete - 动画完成后的回调
 */
export function smoothScrollTo(
  element: HTMLElement,
  targetLeft: number,
  duration: number = 150,
  onComplete?: () => void
): void {
  // 取消之前的动画
  cancelSmoothScroll();

  const startLeft = element.scrollLeft;
  const distance = targetLeft - startLeft;
  const startTime = performance.now();

  function animate(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // 使用 easeOutCubic 缓动函数
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    element.scrollLeft = startLeft + distance * easeProgress;

    if (progress < 1) {
      currentAnimationId = requestAnimationFrame(animate);
    } else {
      currentAnimationId = null;
      onComplete?.();
    }
  }

  currentAnimationId = requestAnimationFrame(animate);
}

/**
 * easeOutCubic 缓动函数
 * @param t - 进度值 (0-1)
 * @returns 缓动后的值
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
