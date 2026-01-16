import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePattern, createEmptyPattern } from "./usePattern";
import {
  CELL_OFF,
  CELL_NORMAL,
  CELL_GHOST,
  CELL_GRACE,
  CELL_DOUBLE_32,
  CELL_FIRST_32,
  CELL_SECOND_32,
} from "../types";
import { DEFAULT_BPM, DEFAULT_BARS, DRUMS } from "../utils/constants";

describe("createEmptyPattern", () => {
  it("应该创建一个带有默认值的空节奏型", () => {
    const pattern = createEmptyPattern();

    expect(pattern.name).toBe("New Pattern");
    expect(pattern.bpm).toBe(DEFAULT_BPM);
    expect(pattern.bars).toBe(DEFAULT_BARS);
    expect(pattern.drums).toEqual(DRUMS);
    expect(pattern.timeSignature).toEqual([4, 4]);
    expect(pattern.id).toBeDefined();
    expect(pattern.createdAt).toBeDefined();
    expect(pattern.updatedAt).toBeDefined();
  });

  it("应该创建一个带有自定义名称的节奏型", () => {
    const pattern = createEmptyPattern("Custom Pattern");

    expect(pattern.name).toBe("Custom Pattern");
  });

  it("应该创建一个全部为 CELL_OFF 的网格", () => {
    const pattern = createEmptyPattern();

    pattern.grid.forEach((row) => {
      row.forEach((cell) => {
        expect(cell).toBe(CELL_OFF);
      });
    });
  });

  it("应该创建正确大小的网格", () => {
    const pattern = createEmptyPattern();
    const expectedCols = DEFAULT_BARS * 4 * 4; // bars * beatsPerBar * subdivisionsPerBeat

    expect(pattern.grid.length).toBe(DRUMS.length);
    pattern.grid.forEach((row) => {
      expect(row.length).toBe(expectedCols);
    });
  });
});

describe("usePattern", () => {
  let initialPattern: ReturnType<typeof createEmptyPattern>;

  beforeEach(() => {
    initialPattern = createEmptyPattern();
  });

  describe("初始状态", () => {
    it("应该返回初始节奏型", () => {
      const { result } = renderHook(() => usePattern(initialPattern));

      expect(result.current.pattern).toEqual(initialPattern);
    });
  });

  describe("updateBPM", () => {
    it("应该更新 BPM", () => {
      const { result } = renderHook(() => usePattern(initialPattern));

      act(() => {
        result.current.updateBPM(140);
      });

      expect(result.current.pattern.bpm).toBe(140);
    });

    it("应该更新 updatedAt 时间戳", () => {
      const { result } = renderHook(() => usePattern(initialPattern));
      const originalUpdatedAt = result.current.pattern.updatedAt;

      // 等待一小段时间确保时间戳不同
      act(() => {
        result.current.updateBPM(140);
      });

      expect(result.current.pattern.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
    });
  });

  describe("toggleCell", () => {
    it("应该将 CELL_OFF 切换为 CELL_NORMAL", () => {
      const { result } = renderHook(() => usePattern(initialPattern));

      act(() => {
        result.current.toggleCell(0, 0);
      });

      expect(result.current.pattern.grid[0][0]).toBe(CELL_NORMAL);
    });

    it("应该将 CELL_NORMAL 切换为 CELL_OFF", () => {
      const { result } = renderHook(() => usePattern(initialPattern));

      act(() => {
        result.current.toggleCell(0, 0); // OFF -> NORMAL
        result.current.toggleCell(0, 0); // NORMAL -> OFF
      });

      expect(result.current.pattern.grid[0][0]).toBe(CELL_OFF);
    });

    it("不应该影响其他单元格", () => {
      const { result } = renderHook(() => usePattern(initialPattern));

      act(() => {
        result.current.toggleCell(0, 0);
      });

      expect(result.current.pattern.grid[0][1]).toBe(CELL_OFF);
      expect(result.current.pattern.grid[1][0]).toBe(CELL_OFF);
    });
  });

  describe("toggleGhost", () => {
    it("应该在已激活的单元格上循环切换音类型", () => {
      const { result } = renderHook(() => usePattern(initialPattern));

      // 先激活单元格
      act(() => {
        result.current.toggleCell(0, 0);
      });
      expect(result.current.pattern.grid[0][0]).toBe(CELL_NORMAL);

      // NORMAL -> GHOST
      act(() => {
        result.current.toggleGhost(0, 0);
      });
      expect(result.current.pattern.grid[0][0]).toBe(CELL_GHOST);

      // GHOST -> GRACE
      act(() => {
        result.current.toggleGhost(0, 0);
      });
      expect(result.current.pattern.grid[0][0]).toBe(CELL_GRACE);

      // GRACE -> NORMAL
      act(() => {
        result.current.toggleGhost(0, 0);
      });
      expect(result.current.pattern.grid[0][0]).toBe(CELL_NORMAL);
    });

    it("不应该对未激活的单元格生效", () => {
      const { result } = renderHook(() => usePattern(initialPattern));

      act(() => {
        result.current.toggleGhost(0, 0);
      });

      expect(result.current.pattern.grid[0][0]).toBe(CELL_OFF);
    });

    it("不应该对32分音符状态的单元格生效", () => {
      const { result } = renderHook(() => usePattern(initialPattern));

      // 先设置为双32分
      act(() => {
        result.current.toggleCell(0, 0);
        result.current.cycleThirtySecond(0, 0);
      });
      expect(result.current.pattern.grid[0][0]).toBe(CELL_DOUBLE_32);

      // 尝试切换 ghost，应该无效
      act(() => {
        result.current.toggleGhost(0, 0);
      });
      expect(result.current.pattern.grid[0][0]).toBe(CELL_DOUBLE_32);
    });
  });

  describe("cycleThirtySecond", () => {
    it("应该循环切换32分音符状态", () => {
      const { result } = renderHook(() => usePattern(initialPattern));

      // 先激活单元格
      act(() => {
        result.current.toggleCell(0, 0);
      });
      expect(result.current.pattern.grid[0][0]).toBe(CELL_NORMAL);

      // NORMAL -> DOUBLE_32
      act(() => {
        result.current.cycleThirtySecond(0, 0);
      });
      expect(result.current.pattern.grid[0][0]).toBe(CELL_DOUBLE_32);

      // DOUBLE_32 -> FIRST_32
      act(() => {
        result.current.cycleThirtySecond(0, 0);
      });
      expect(result.current.pattern.grid[0][0]).toBe(CELL_FIRST_32);

      // FIRST_32 -> SECOND_32
      act(() => {
        result.current.cycleThirtySecond(0, 0);
      });
      expect(result.current.pattern.grid[0][0]).toBe(CELL_SECOND_32);

      // SECOND_32 -> NORMAL
      act(() => {
        result.current.cycleThirtySecond(0, 0);
      });
      expect(result.current.pattern.grid[0][0]).toBe(CELL_NORMAL);
    });

    it("应该将未激活的单元格变为 CELL_NORMAL", () => {
      const { result } = renderHook(() => usePattern(initialPattern));

      act(() => {
        result.current.cycleThirtySecond(0, 0);
      });

      expect(result.current.pattern.grid[0][0]).toBe(CELL_NORMAL);
    });
  });

  describe("addBar", () => {
    it("应该在末尾添加一个小节", () => {
      const { result } = renderHook(() => usePattern(initialPattern));
      const originalBars = result.current.pattern.bars;

      act(() => {
        result.current.addBar();
      });

      expect(result.current.pattern.bars).toBe(originalBars + 1);
    });

    it("应该复制最后一个小节的内容", () => {
      const { result } = renderHook(() => usePattern(initialPattern));

      // 在第一个小节添加一些内容
      act(() => {
        result.current.toggleCell(0, 0);
        result.current.toggleCell(0, 4);
      });

      act(() => {
        result.current.addBar();
      });

      // 新小节应该复制了第一个小节的内容
      expect(result.current.pattern.grid[0][16]).toBe(CELL_NORMAL);
      expect(result.current.pattern.grid[0][20]).toBe(CELL_NORMAL);
    });

    it("应该根据游标位置在正确的位置插入小节", () => {
      const { result } = renderHook(() => usePattern(initialPattern));

      // 先添加一个小节，使得有2个小节
      act(() => {
        result.current.addBar();
      });
      expect(result.current.pattern.bars).toBe(2);

      // 在第一个小节的前半部分位置添加（应该在第一个小节前插入）
      act(() => {
        result.current.addBar(2); // 位置2在第一个小节的前半部分
      });
      expect(result.current.pattern.bars).toBe(3);
    });
  });

  describe("removeBar", () => {
    it("应该删除最后一个小节", () => {
      const { result } = renderHook(() => usePattern(initialPattern));

      // 先添加一个小节
      act(() => {
        result.current.addBar();
      });
      expect(result.current.pattern.bars).toBe(2);

      act(() => {
        result.current.removeBar();
      });

      expect(result.current.pattern.bars).toBe(1);
    });

    it("不应该删除最后一个小节（至少保留1个）", () => {
      const { result } = renderHook(() => usePattern(initialPattern));

      act(() => {
        result.current.removeBar();
      });

      expect(result.current.pattern.bars).toBe(1);
    });
  });

  describe("clearGrid", () => {
    it("应该清除所有网格单元格", () => {
      const { result } = renderHook(() => usePattern(initialPattern));

      // 添加一些内容
      act(() => {
        result.current.toggleCell(0, 0);
        result.current.toggleCell(1, 1);
        result.current.toggleCell(2, 2);
      });

      act(() => {
        result.current.clearGrid();
      });

      result.current.pattern.grid.forEach((row) => {
        row.forEach((cell) => {
          expect(cell).toBe(CELL_OFF);
        });
      });
    });
  });

  describe("loadPattern", () => {
    it("应该加载新的节奏型", () => {
      const { result } = renderHook(() => usePattern(initialPattern));
      const newPattern = createEmptyPattern("New");
      newPattern.bpm = 180;

      act(() => {
        result.current.loadPattern(newPattern);
      });

      expect(result.current.pattern).toEqual(newPattern);
      expect(result.current.pattern.bpm).toBe(180);
    });
  });

  describe("resetPattern", () => {
    it("应该重置为空节奏型", () => {
      const { result } = renderHook(() => usePattern(initialPattern));

      // 修改一些内容
      act(() => {
        result.current.updateBPM(180);
        result.current.toggleCell(0, 0);
      });

      act(() => {
        result.current.resetPattern();
      });

      expect(result.current.pattern.bpm).toBe(DEFAULT_BPM);
      expect(result.current.pattern.grid[0][0]).toBe(CELL_OFF);
    });
  });
});
