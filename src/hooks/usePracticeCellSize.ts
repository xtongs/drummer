import { useState, useEffect, useCallback } from "react";
import { APP_MAX_WIDTH, SUBDIVISIONS_PER_BEAT } from "../utils/constants";

const APP_PADDING = 24;
const FALLBACK_CELL_SIZE = 23.0625;

export function usePracticeCellSize(
  beatsPerBar: number,
  barsPerViewport = 2,
): number {
  const calculateCellSize = useCallback(() => {
    if (typeof window === "undefined") {
      return FALLBACK_CELL_SIZE;
    }

    const viewportWidth = window.innerWidth;
    const containerWidth = Math.min(viewportWidth, APP_MAX_WIDTH) - APP_PADDING;
    const subdivisionsPerBar = beatsPerBar * SUBDIVISIONS_PER_BEAT;

    if (subdivisionsPerBar <= 0 || barsPerViewport <= 0) {
      return FALLBACK_CELL_SIZE;
    }

    return containerWidth / (subdivisionsPerBar * barsPerViewport);
  }, [beatsPerBar, barsPerViewport]);

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
