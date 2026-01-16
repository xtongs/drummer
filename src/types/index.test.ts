import { describe, it, expect } from "vitest";
import {
  CELL_OFF,
  CELL_NORMAL,
  CELL_GHOST,
  CELL_GRACE,
  CELL_DOUBLE_32,
  CELL_FIRST_32,
  CELL_SECOND_32,
} from "./index";
import type {
  DrumType,
  TimeSignature,
  LoopRange,
  CrossPatternLoop,
  CellState,
  Pattern,
  StorageData,
} from "./index";

describe("Types", () => {
  describe("CellState 常量", () => {
    it("应该定义所有的 CellState 值", () => {
      expect(CELL_OFF).toBe(0);
      expect(CELL_NORMAL).toBe(1);
      expect(CELL_GHOST).toBe(2);
      expect(CELL_GRACE).toBe(3);
      expect(CELL_DOUBLE_32).toBe(4);
      expect(CELL_FIRST_32).toBe(5);
      expect(CELL_SECOND_32).toBe(6);
    });

    it("每个值应该是唯一的", () => {
      const values = [
        CELL_OFF,
        CELL_NORMAL,
        CELL_GHOST,
        CELL_GRACE,
        CELL_DOUBLE_32,
        CELL_FIRST_32,
        CELL_SECOND_32,
      ];
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe("Type 定义（编译时检查）", () => {
    it("DrumType 应该是有效的鼓件类型", () => {
      const drum: DrumType = "Kick";
      expect(drum).toBe("Kick");
    });

    it("TimeSignature 应该是两个数字的元组", () => {
      const ts: TimeSignature = [4, 4];
      expect(ts).toHaveLength(2);
      expect(typeof ts[0]).toBe("number");
      expect(typeof ts[1]).toBe("number");
    });

    it("LoopRange 应该是两个数字的元组", () => {
      const range: LoopRange = [0, 3];
      expect(range).toHaveLength(2);
      expect(typeof range[0]).toBe("number");
      expect(typeof range[1]).toBe("number");
    });

    it("CrossPatternLoop 应该有正确的结构", () => {
      const loop: CrossPatternLoop = {
        startPatternName: "A",
        startBar: 0,
        endPatternName: "B",
        endBar: 3,
      };

      expect(loop.startPatternName).toBe("A");
      expect(loop.startBar).toBe(0);
      expect(loop.endPatternName).toBe("B");
      expect(loop.endBar).toBe(3);
    });

    it("CellState 应该是 0-6 的数字", () => {
      const validStates: CellState[] = [0, 1, 2, 3, 4, 5, 6];
      validStates.forEach((state) => {
        expect(state).toBeGreaterThanOrEqual(0);
        expect(state).toBeLessThanOrEqual(6);
      });
    });

    it("Pattern 应该有正确的结构", () => {
      const pattern: Pattern = {
        id: "test-id",
        name: "Test",
        bpm: 120,
        timeSignature: [4, 4],
        bars: 1,
        grid: [[CELL_OFF]],
        drums: ["Kick"],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(pattern.id).toBeDefined();
      expect(pattern.name).toBeDefined();
      expect(pattern.bpm).toBeDefined();
      expect(pattern.timeSignature).toBeDefined();
      expect(pattern.bars).toBeDefined();
      expect(pattern.grid).toBeDefined();
      expect(pattern.drums).toBeDefined();
      expect(pattern.createdAt).toBeDefined();
      expect(pattern.updatedAt).toBeDefined();
    });

    it("Pattern 的 loopRange 是可选的", () => {
      const patternWithLoop: Pattern = {
        id: "test-id",
        name: "Test",
        bpm: 120,
        timeSignature: [4, 4],
        bars: 2,
        grid: [[CELL_OFF]],
        drums: ["Kick"],
        loopRange: [0, 1],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(patternWithLoop.loopRange).toEqual([0, 1]);
    });

    it("StorageData 应该有正确的结构", () => {
      const data: StorageData = {
        patterns: [],
        currentPatternId: undefined,
        settings: {
          defaultBPM: 120,
          defaultTimeSignature: [4, 4],
        },
      };

      expect(data.patterns).toBeDefined();
      expect(Array.isArray(data.patterns)).toBe(true);
    });
  });
});
