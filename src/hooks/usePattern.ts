import { useState, useCallback } from "react";
import type { Pattern } from "../types";
import { DEFAULT_BPM, DEFAULT_TIME_SIGNATURE, DEFAULT_BARS, DRUMS, SUBDIVISIONS_PER_BEAT } from "../utils/constants";
import { generateId } from "../utils/storage";

/**
 * 创建新的空节奏型
 */
export function createEmptyPattern(name: string = "New Pattern"): Pattern {
  const beatsPerBar = DEFAULT_TIME_SIGNATURE[0];
  const subdivisionsPerBar = DEFAULT_BARS * beatsPerBar * SUBDIVISIONS_PER_BEAT;
  return {
    id: generateId(),
    name,
    bpm: DEFAULT_BPM,
    timeSignature: DEFAULT_TIME_SIGNATURE,
    bars: DEFAULT_BARS,
    grid: Array(DRUMS.length)
      .fill(null)
      .map(() => Array(subdivisionsPerBar).fill(false)),
    drums: DRUMS,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * 使用节奏型管理的 Hook
 */
export function usePattern(initialPattern: Pattern) {
  const [pattern, setPattern] = useState<Pattern>(initialPattern);

  // 更新BPM
  const updateBPM = useCallback((bpm: number) => {
    setPattern((prev) => ({
      ...prev,
      bpm,
      updatedAt: Date.now(),
    }));
  }, []);

  // 更新拍号
  const updateTimeSignature = useCallback((timeSignature: [number, number]) => {
    setPattern((prev) => {
      const [newBeatsPerBar] = timeSignature;
      const [oldBeatsPerBar] = prev.timeSignature;
      const totalSubdivisions = prev.bars * oldBeatsPerBar * SUBDIVISIONS_PER_BEAT;
      const newTotalSubdivisions = prev.bars * newBeatsPerBar * SUBDIVISIONS_PER_BEAT;

      // 重新调整grid大小
      const newGrid = prev.grid.map((row) => {
        if (newTotalSubdivisions > totalSubdivisions) {
          // 增加列
          return [...row, ...Array(newTotalSubdivisions - totalSubdivisions).fill(false)];
        } else if (newTotalSubdivisions < totalSubdivisions) {
          // 减少列
          return row.slice(0, newTotalSubdivisions);
        }
        return row;
      });

      return {
        ...prev,
        timeSignature,
        grid: newGrid,
        updatedAt: Date.now(),
      };
    });
  }, []);

  // 切换网格单元格状态
  const toggleCell = useCallback((drumIndex: number, beatIndex: number) => {
    setPattern((prev) => {
      const newGrid = prev.grid.map((row, i) => {
        if (i === drumIndex) {
          const newRow = [...row];
          newRow[beatIndex] = !newRow[beatIndex];
          return newRow;
        }
        return row;
      });

      return {
        ...prev,
        grid: newGrid,
        updatedAt: Date.now(),
      };
    });
  }, []);

  // 添加小节
  const addBar = useCallback(() => {
    setPattern((prev) => {
      const [beatsPerBar] = prev.timeSignature;
      const subdivisionsPerBar = beatsPerBar * SUBDIVISIONS_PER_BEAT;
      const newGrid = prev.grid.map((row) => [
        ...row,
        ...Array(subdivisionsPerBar).fill(false),
      ]);

      return {
        ...prev,
        bars: prev.bars + 1,
        grid: newGrid,
        updatedAt: Date.now(),
      };
    });
  }, []);

  // 删除小节
  const removeBar = useCallback(() => {
    setPattern((prev) => {
      if (prev.bars <= 1) return prev; // 至少保留1个小节

      const [beatsPerBar] = prev.timeSignature;
      const subdivisionsPerBar = beatsPerBar * SUBDIVISIONS_PER_BEAT;
      const newGrid = prev.grid.map((row) => row.slice(0, -subdivisionsPerBar));

      return {
        ...prev,
        bars: prev.bars - 1,
        grid: newGrid,
        // 如果循环范围超出，需要调整
        loopRange:
          prev.loopRange && prev.loopRange[1] >= prev.bars - 1
            ? [prev.loopRange[0], prev.bars - 2]
            : prev.loopRange,
        updatedAt: Date.now(),
      };
    });
  }, []);

  // 清除所有网格
  const clearGrid = useCallback(() => {
    setPattern((prev) => {
      const newGrid = prev.grid.map((row) => row.map(() => false));

      return {
        ...prev,
        grid: newGrid,
        updatedAt: Date.now(),
      };
    });
  }, []);

  // 设置循环范围
  const setLoopRange = useCallback((loopRange: [number, number] | undefined) => {
    setPattern((prev) => ({
      ...prev,
      loopRange,
      updatedAt: Date.now(),
    }));
  }, []);

  // 更新节奏型名称
  const updateName = useCallback((name: string) => {
    setPattern((prev) => ({
      ...prev,
      name,
      updatedAt: Date.now(),
    }));
  }, []);

  // 加载节奏型
  const loadPattern = useCallback((newPattern: Pattern) => {
    setPattern(newPattern);
  }, []);

  // 重置为默认节奏型
  const resetPattern = useCallback(() => {
    setPattern(createEmptyPattern());
  }, []);

  return {
    pattern,
    updateBPM,
    updateTimeSignature,
    toggleCell,
    addBar,
    removeBar,
    clearGrid,
    setLoopRange,
    updateName,
    loadPattern,
    resetPattern,
  };
}

