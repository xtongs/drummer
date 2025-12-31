import { useState, useEffect, useCallback } from "react";
import { APP_MAX_WIDTH } from "../utils/constants";

// 基准常量
const BASE_WIDTH = 393; // 基准屏幕宽度
const BASE_CELL_SIZE = 23; // 基准单元格大小
const MAX_WIDTH = APP_MAX_WIDTH; // 最大容器宽度（从 constants 导入）
const APP_PADDING = 24; // .app 的左右 padding 总和 (12px * 2)

/**
 * 根据屏幕宽度动态计算网格单元格大小
 * 以 393px 宽度下 cellSize = 23px 为基准
 */
export function useGridCellSize(): number {
  const calculateCellSize = useCallback(() => {
    const viewportWidth = window.innerWidth;
    // 容器宽度不超过最大宽度，并减去左右 padding
    const containerWidth = Math.min(viewportWidth, MAX_WIDTH) - APP_PADDING;
    // 按比例计算单元格大小（BASE_WIDTH 也需要减去 padding）
    return (containerWidth * BASE_CELL_SIZE) / (BASE_WIDTH - APP_PADDING);
  }, []);

  const [cellSize, setCellSize] = useState(calculateCellSize);

  useEffect(() => {
    const handleResize = () => {
      setCellSize(calculateCellSize());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [calculateCellSize]);

  return cellSize;
}

/**
 * 获取当前网格单元格大小（非响应式版本，用于一次性计算）
 */
export function getGridCellSize(): number {
  const viewportWidth = window.innerWidth;
  const containerWidth = Math.min(viewportWidth, MAX_WIDTH) - APP_PADDING;
  return (containerWidth * BASE_CELL_SIZE) / (BASE_WIDTH - APP_PADDING);
}
