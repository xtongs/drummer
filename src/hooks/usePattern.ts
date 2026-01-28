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
  DRUM_FEATURE_CONFIG,
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

/**
 * 偏移 barBpmOverrides 中的索引
 * @param overrides - 原始的 barBpmOverrides 对象
 * @param fromIndex - 从这个索引开始偏移
 * @param offset - 偏移量（正数为向后移动，负数为向前移动）
 * @param excludeIndex - 要排除的索引（不进行偏移）
 * @returns 偏移后的新对象，如果没有覆盖值则返回 undefined
 */
function shiftBarBpmIndexes(
  overrides: Record<number, number> | undefined,
  fromIndex: number,
  offset: number,
  excludeIndex?: number,
): Record<number, number> | undefined {
  if (!overrides) return undefined;

  const newOverrides: Record<number, number> = {};

  for (const [key, value] of Object.entries(overrides)) {
    const oldIndex = parseInt(key, 10);

    // 跳过要排除的索引
    if (oldIndex === excludeIndex) continue;

    if (oldIndex >= fromIndex) {
      newOverrides[oldIndex + offset] = value;
    } else {
      newOverrides[oldIndex] = value;
    }
  }

  return Object.keys(newOverrides).length > 0 ? newOverrides : undefined;
}

export interface PatternGridCopy {
  grid: CellState[][];
  bars: number;
  timeSignature: [number, number];
  drums: Pattern["drums"];
  bpm: number; // 被复制节奏型的全局 BPM
  barBpmOverrides?: Record<number, number>;
}

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

  // 更新指定小节的BPM覆盖
  const updateBarBpm = useCallback((barIndex: number, bpm: number | null) => {
    setPattern((prev) => {
      const newOverrides = { ...prev.barBpmOverrides };

      if (bpm === null) {
        // 移除覆盖，使用全局 BPM
        delete newOverrides[barIndex];
      } else {
        // 设置覆盖值
        newOverrides[barIndex] = bpm;
      }

      // 如果没有覆盖值了，移除整个字段
      const hasOverrides = Object.keys(newOverrides).length > 0;

      return {
        ...prev,
        barBpmOverrides: hasOverrides ? newOverrides : undefined,
        updatedAt: Date.now(),
      };
    });
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

      const drumType = prev.drums[drumIndex];
      const config = DRUM_FEATURE_CONFIG[drumType];

      const newGrid = prev.grid.map((row, i) => {
        if (i === drumIndex) {
          const newRow = [...row];
          // 循环切换：正常 -> 鬼音 -> 倚音 -> 正常
          let nextState: typeof currentState;
          if (currentState === CELL_NORMAL) {
            // 只有支持鬼音时才能切换到鬼音
            nextState = config.allowGhost ? CELL_GHOST : CELL_NORMAL;
          } else if (currentState === CELL_GHOST) {
            // 只有支持倚音时才能切换到倚音，否则回到正常
            nextState = config.allowGrace ? CELL_GRACE : CELL_NORMAL;
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
        const drumType = prev.drums[drumIndex];
        const config = DRUM_FEATURE_CONFIG[drumType];

        // 如果鼓件不支持32分音符，则不允许切换
        if (!config.allowThirtySecond) {
          // 如果当前未激活，激活为正常音符
          if (currentState === CELL_OFF) {
            const newGrid = prev.grid.map((row, i) => {
              if (i === drumIndex) {
                const newRow = [...row];
                newRow[beatIndex] = CELL_NORMAL;
                return newRow;
              }
              return row;
            });
            return {
              ...prev,
              grid: newGrid,
              updatedAt: Date.now(),
            };
          }
          // 已激活时不做任何改变
          return prev;
        }

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
    [],
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

      // 更新 barBpmOverrides：插入位置后的索引都要 +1，并复制被复制小节的 BPM
      let newOverrides = shiftBarBpmIndexes(
        prev.barBpmOverrides,
        insertIndex,
        1,
      );

      // 复制被复制小节的 BPM 到新小节
      const copiedBpm = prev.barBpmOverrides?.[barToCopy];
      if (copiedBpm !== undefined) {
        newOverrides = newOverrides ?? {};
        newOverrides[insertIndex] = copiedBpm;
      }

      return {
        ...prev,
        bars: prev.bars + 1,
        grid: newGrid,
        barBpmOverrides: newOverrides,
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

      // 更新 barBpmOverrides：删除该小节的覆盖，后续索引 -1
      const newOverrides = shiftBarBpmIndexes(
        prev.barBpmOverrides,
        barToRemove + 1,
        -1,
        barToRemove,
      );

      return {
        ...prev,
        bars: prev.bars - 1,
        grid: newGrid,
        barBpmOverrides: newOverrides,
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

  // 清除指定小节
  const clearBar = useCallback((cursorPosition: number) => {
    setPattern((prev) => {
      const [beatsPerBar] = prev.timeSignature;
      const subdivisionsPerBar = beatsPerBar * SUBDIVISIONS_PER_BEAT;
      const barIndex = Math.floor(cursorPosition / subdivisionsPerBar);
      const barStartIndex = barIndex * subdivisionsPerBar;
      const barEndIndex = barStartIndex + subdivisionsPerBar;

      const newGrid = prev.grid.map((row) => {
        const newRow = [...row];
        for (let i = barStartIndex; i < barEndIndex; i++) {
          newRow[i] = CELL_OFF;
        }
        return newRow;
      });

      return {
        ...prev,
        grid: newGrid,
        updatedAt: Date.now(),
      };
    });
  }, []);

  const insertPatternGrid = useCallback(
    (barIndex: number, copy: PatternGridCopy) => {
      setPattern((prev) => {
        if (
          copy.bars <= 0 ||
          copy.grid.length !== prev.drums.length ||
          copy.timeSignature[0] !== prev.timeSignature[0] ||
          copy.timeSignature[1] !== prev.timeSignature[1]
        ) {
          return prev;
        }

        const [beatsPerBar] = prev.timeSignature;
        const subdivisionsPerBar = beatsPerBar * SUBDIVISIONS_PER_BEAT;
        const insertIndex = Math.max(0, Math.min(prev.bars, barIndex));
        const insertOffset = insertIndex * subdivisionsPerBar;
        const expectedLength = copy.bars * subdivisionsPerBar;

        if (copy.grid.some((row) => row.length !== expectedLength)) {
          return prev;
        }

        const newGrid = prev.grid.map((row, index) => {
          const insertRow = copy.grid[index];
          const newRow = [...row];
          newRow.splice(insertOffset, 0, ...insertRow);
          return newRow;
        });

        // 更新 barBpmOverrides：现有小节插入位置后的索引 +copy.bars，并合并复制的覆盖
        const bpmDiffers = copy.bpm !== prev.bpm;
        let newOverrides = shiftBarBpmIndexes(
          prev.barBpmOverrides,
          insertIndex,
          copy.bars,
        );

        // 合并复制的覆盖（索引加上 insertIndex）
        // 如果 BPM 不同且没有特殊覆盖，则使用复制来源的全局 BPM
        for (let i = 0; i < copy.bars; i++) {
          const copyBarBpm = copy.barBpmOverrides?.[i];
          if (copyBarBpm !== undefined) {
            // 有特殊覆盖，使用覆盖值
            newOverrides = newOverrides ?? {};
            newOverrides[insertIndex + i] = copyBarBpm;
          } else if (bpmDiffers) {
            // 没有特殊覆盖但 BPM 不同，使用复制来源的全局 BPM
            newOverrides = newOverrides ?? {};
            newOverrides[insertIndex + i] = copy.bpm;
          }
        }

        return {
          ...prev,
          bars: prev.bars + copy.bars,
          grid: newGrid,
          barBpmOverrides: newOverrides,
          updatedAt: Date.now(),
        };
      });
    },
    [],
  );

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
    updateBarBpm,
    toggleCell,
    toggleGhost,
    cycleThirtySecond,
    addBar,
    removeBar,
    clearGrid,
    clearBar,
    insertPatternGrid,
    loadPattern,
    resetPattern,
  };
}
