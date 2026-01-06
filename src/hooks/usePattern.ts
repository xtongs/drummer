import { useState, useCallback } from "react";
import type { Pattern, CellState } from "../types";
import {
  CELL_OFF,
  CELL_NORMAL,
  CELL_GHOST,
  CELL_GRACE,
  CELL_DOUBLE_32,
  CELL_FIRST_32,
  CELL_SECOND_32,
} from "../types";
import {
  DEFAULT_BPM,
  DEFAULT_TIME_SIGNATURE,
  DEFAULT_BARS,
  DRUMS,
  SUBDIVISIONS_PER_BEAT,
} from "../utils/constants";
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
      .map(() => Array<CellState>(subdivisionsPerBar).fill(CELL_OFF)),
    drums: DRUMS,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * 使用节奏型管理的 Hook
 */
const isThirtySecondState = (state: CellState) =>
  state === CELL_DOUBLE_32 ||
  state === CELL_FIRST_32 ||
  state === CELL_SECOND_32;

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

  // 切换网格单元格状态：未激活 -> 正常 -> 未激活
  const toggleCell = useCallback((drumIndex: number, beatIndex: number) => {
    setPattern((prev) => {
      const newGrid = prev.grid.map((row, i) => {
        if (i === drumIndex) {
          const newRow = [...row];
          // 未激活 -> 正常, 正常/鬼音 -> 未激活
          newRow[beatIndex] =
            newRow[beatIndex] === CELL_OFF ? CELL_NORMAL : CELL_OFF;
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

  // 切换音类型状态：正常 -> 鬼音 -> 倚音 -> 正常（仅对已激活的单元格有效）
  const toggleGhost = useCallback((drumIndex: number, beatIndex: number) => {
    setPattern((prev) => {
      const currentState = prev.grid[drumIndex]?.[beatIndex];
      // 只有激活的单元格且不是32分状态才能切换
      if (currentState === CELL_OFF || isThirtySecondState(currentState)) {
        return prev;
      }

      const newGrid = prev.grid.map((row, i) => {
        if (i === drumIndex) {
          const newRow = [...row];
          // 循环切换：正常 -> 鬼音 -> 倚音 -> 正常
          let nextState: typeof currentState;
          if (currentState === CELL_NORMAL) {
            nextState = CELL_GHOST;
          } else if (currentState === CELL_GHOST) {
            nextState = CELL_GRACE;
          } else {
            // CELL_GRACE -> CELL_NORMAL
            nextState = CELL_NORMAL;
          }
          newRow[beatIndex] = nextState;
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

  // 双击循环 16分 -> 双32 -> 前32 -> 后32 -> 16分
  const cycleThirtySecond = useCallback(
    (drumIndex: number, beatIndex: number) => {
      setPattern((prev) => {
        const currentState = prev.grid[drumIndex]?.[beatIndex];

        let nextState: CellState;
        if (
          currentState === CELL_NORMAL ||
          currentState === CELL_GHOST ||
          currentState === CELL_GRACE
        ) {
          nextState = CELL_DOUBLE_32;
        } else if (currentState === CELL_DOUBLE_32) {
          nextState = CELL_FIRST_32;
        } else if (currentState === CELL_FIRST_32) {
          nextState = CELL_SECOND_32;
        } else if (currentState === CELL_SECOND_32) {
          nextState = CELL_NORMAL;
        } else {
          // 未激活时先进入正常16分
          nextState = CELL_NORMAL;
        }

        const newGrid = prev.grid.map((row, i) => {
          if (i === drumIndex) {
            const newRow = [...row];
            newRow[beatIndex] = nextState;
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
    },
    []
  );

  // 添加小节
  const addBar = useCallback((cursorPosition?: number) => {
    setPattern((prev) => {
      const [beatsPerBar] = prev.timeSignature;
      const subdivisionsPerBar = beatsPerBar * SUBDIVISIONS_PER_BEAT;

      let insertIndex: number;
      let barToCopy: number;

      if (cursorPosition !== undefined) {
        // 根据游标位置决定插入位置
        const cursorBarIndex = Math.floor(cursorPosition / subdivisionsPerBar);
        const cursorPositionInBar = cursorPosition % subdivisionsPerBar;
        const barMidpoint = subdivisionsPerBar / 2;

        if (cursorPositionInBar < barMidpoint) {
          // 在小节前半部分，在该小节前插入
          insertIndex = cursorBarIndex;
          barToCopy = cursorBarIndex;
        } else {
          // 在小节后半部分，在该小节后插入
          insertIndex = cursorBarIndex + 1;
          barToCopy = cursorBarIndex;
        }
      } else {
        // 没有游标位置，在末尾添加
        insertIndex = prev.bars;
        barToCopy = prev.bars - 1;
      }

      // 复制指定小节的内容
      const barStartIndex = barToCopy * subdivisionsPerBar;
      const barEndIndex = barStartIndex + subdivisionsPerBar;

      const newGrid = prev.grid.map((row) => {
        const barContent = row.slice(barStartIndex, barEndIndex);
        const newRow = [...row];
        newRow.splice(insertIndex * subdivisionsPerBar, 0, ...barContent);
        return newRow;
      });

      return {
        ...prev,
        bars: prev.bars + 1,
        grid: newGrid,
        updatedAt: Date.now(),
      };
    });
  }, []);

  // 删除小节
  const removeBar = useCallback((cursorPosition?: number) => {
    setPattern((prev) => {
      if (prev.bars <= 1) return prev; // 至少保留1个小节

      const [beatsPerBar] = prev.timeSignature;
      const subdivisionsPerBar = beatsPerBar * SUBDIVISIONS_PER_BEAT;

      let barToRemove: number;

      if (cursorPosition !== undefined) {
        // 根据游标位置决定删除哪个小节
        const cursorBarIndex = Math.floor(cursorPosition / subdivisionsPerBar);
        const cursorPositionInBar = cursorPosition % subdivisionsPerBar;
        const barMidpoint = subdivisionsPerBar / 2;

        if (cursorPositionInBar < barMidpoint) {
          // 在小节前半部分，删除该小节
          barToRemove = cursorBarIndex;
        } else {
          // 在小节后半部分，删除该小节
          barToRemove = cursorBarIndex;
        }
      } else {
        // 没有游标位置，删除最后一小节
        barToRemove = prev.bars - 1;
      }

      const removeStartIndex = barToRemove * subdivisionsPerBar;

      const newGrid = prev.grid.map((row) => {
        const newRow = [...row];
        newRow.splice(removeStartIndex, subdivisionsPerBar);
        return newRow;
      });

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
      const newGrid = prev.grid.map((row) => row.map(() => CELL_OFF));

      return {
        ...prev,
        grid: newGrid,
        updatedAt: Date.now(),
      };
    });
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
    toggleCell,
    toggleGhost,
    cycleThirtySecond,
    addBar,
    removeBar,
    clearGrid,
    loadPattern,
    resetPattern,
  };
}
