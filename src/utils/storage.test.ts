import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadStorageData,
  saveStorageData,
  savePattern,
  loadPatterns,
  deletePattern,
  getCurrentPatternId,
  setCurrentPatternId,
  generateId,
  saveMetronomeBPM,
  loadMetronomeBPM,
  saveCrossPatternLoop,
  loadCrossPatternLoop,
  validatePattern,
  parsePatternFromJSON,
  serializePatternToJSON,
} from "./storage";
import type { Pattern, CrossPatternLoop } from "../types";
import { CELL_OFF, CELL_NORMAL, CELL_GHOST } from "../types";

// 创建测试用的 Pattern
function createTestPattern(overrides: Partial<Pattern> = {}): Pattern {
  return {
    id: "test-pattern-1",
    name: "Test Pattern",
    bpm: 120,
    timeSignature: [4, 4],
    bars: 1,
    grid: [[CELL_OFF, CELL_NORMAL, CELL_GHOST, CELL_OFF]],
    drums: ["Kick"],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("Storage 工具函数", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("loadStorageData / saveStorageData", () => {
    it("当没有数据时应该返回空的 patterns 数组", () => {
      const data = loadStorageData();

      expect(data.patterns).toEqual([]);
    });

    it("应该正确保存和加载数据", () => {
      const pattern = createTestPattern();
      const data = { patterns: [pattern], currentPatternId: pattern.id };

      saveStorageData(data);
      const loaded = loadStorageData();

      expect(loaded.patterns).toHaveLength(1);
      expect(loaded.patterns[0].id).toBe(pattern.id);
      expect(loaded.currentPatternId).toBe(pattern.id);
    });

    it("应该将旧版 boolean grid 迁移为 CellState grid", () => {
      // 模拟旧版数据（boolean grid）
      const oldData = {
        patterns: [
          {
            id: "old-pattern",
            name: "Old",
            bpm: 120,
            timeSignature: [4, 4],
            bars: 1,
            grid: [[true, false, true, false]], // 旧版 boolean 格式
            drums: ["Kick"],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      };

      localStorage.setItem("drummer-app-data", JSON.stringify(oldData));
      const loaded = loadStorageData();

      // 应该被迁移为 CellState
      expect(loaded.patterns[0].grid[0]).toEqual([CELL_NORMAL, CELL_OFF, CELL_NORMAL, CELL_OFF]);
    });
  });

  describe("savePattern / loadPatterns", () => {
    it("应该保存新的 pattern", () => {
      const pattern = createTestPattern();

      savePattern(pattern);
      const patterns = loadPatterns();

      expect(patterns).toHaveLength(1);
      expect(patterns[0]).toEqual(pattern);
    });

    it("应该更新已存在的 pattern", () => {
      const pattern = createTestPattern();
      savePattern(pattern);

      const updatedPattern = { ...pattern, bpm: 140 };
      savePattern(updatedPattern);

      const patterns = loadPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0].bpm).toBe(140);
    });

    it("应该保存多个 pattern", () => {
      const pattern1 = createTestPattern({ id: "pattern-1", name: "A" });
      const pattern2 = createTestPattern({ id: "pattern-2", name: "B" });

      savePattern(pattern1);
      savePattern(pattern2);

      const patterns = loadPatterns();
      expect(patterns).toHaveLength(2);
    });
  });

  describe("deletePattern", () => {
    it("应该删除指定的 pattern", () => {
      const pattern = createTestPattern();
      savePattern(pattern);

      deletePattern(pattern.id);
      const patterns = loadPatterns();

      expect(patterns).toHaveLength(0);
    });

    it("删除当前选中的 pattern 时应该清除 currentPatternId", () => {
      const pattern = createTestPattern();
      savePattern(pattern);
      setCurrentPatternId(pattern.id);

      deletePattern(pattern.id);

      expect(getCurrentPatternId()).toBeUndefined();
    });
  });

  describe("getCurrentPatternId / setCurrentPatternId", () => {
    it("当没有设置时应该返回 undefined", () => {
      expect(getCurrentPatternId()).toBeUndefined();
    });

    it("应该正确设置和获取当前 pattern ID", () => {
      setCurrentPatternId("test-id");

      expect(getCurrentPatternId()).toBe("test-id");
    });

    it("应该能够清除当前 pattern ID", () => {
      setCurrentPatternId("test-id");
      setCurrentPatternId(undefined);

      expect(getCurrentPatternId()).toBeUndefined();
    });
  });

  describe("generateId", () => {
    it("应该生成唯一的 ID", () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).not.toBe(id2);
    });

    it("应该以 'pattern-' 开头", () => {
      const id = generateId();

      expect(id).toMatch(/^pattern-/);
    });
  });

  describe("saveMetronomeBPM / loadMetronomeBPM", () => {
    it("当没有保存时应该返回 null", () => {
      expect(loadMetronomeBPM()).toBeNull();
    });

    it("应该正确保存和加载 BPM", () => {
      saveMetronomeBPM(140);

      expect(loadMetronomeBPM()).toBe(140);
    });

    it("BPM 范围应该在 20-300 之间", () => {
      saveMetronomeBPM(10); // 太低
      expect(loadMetronomeBPM()).toBeNull();

      localStorage.clear();

      saveMetronomeBPM(350); // 太高
      expect(loadMetronomeBPM()).toBeNull();
    });
  });

  describe("saveCrossPatternLoop / loadCrossPatternLoop", () => {
    it("当没有保存时应该返回 undefined", () => {
      expect(loadCrossPatternLoop()).toBeUndefined();
    });

    it("应该正确保存和加载跨 Pattern 循环", () => {
      const loop: CrossPatternLoop = {
        startPatternName: "A",
        startBar: 0,
        endPatternName: "B",
        endBar: 3,
      };

      saveCrossPatternLoop(loop);
      const loaded = loadCrossPatternLoop();

      expect(loaded).toEqual(loop);
    });

    it("保存 undefined 应该删除数据", () => {
      const loop: CrossPatternLoop = {
        startPatternName: "A",
        startBar: 0,
        endPatternName: "B",
        endBar: 3,
      };

      saveCrossPatternLoop(loop);
      saveCrossPatternLoop(undefined);

      expect(loadCrossPatternLoop()).toBeUndefined();
    });

    it("应该验证加载的数据格式", () => {
      // 无效数据
      localStorage.setItem("drummer-cross-pattern-loop", JSON.stringify({ invalid: true }));

      expect(loadCrossPatternLoop()).toBeUndefined();
    });
  });

  describe("validatePattern", () => {
    it("应该验证有效的 Pattern", () => {
      const pattern = createTestPattern();

      expect(validatePattern(pattern)).toBe(true);
    });

    it("应该拒绝 null", () => {
      expect(validatePattern(null)).toBe(false);
    });

    it("应该拒绝非对象", () => {
      expect(validatePattern("string")).toBe(false);
      expect(validatePattern(123)).toBe(false);
    });

    it("应该拒绝缺少必需字段的对象", () => {
      expect(validatePattern({})).toBe(false);
      expect(validatePattern({ id: "test" })).toBe(false);
    });

    it("应该拒绝无效的 BPM 范围", () => {
      const pattern = createTestPattern({ bpm: 10 }); // 太低
      expect(validatePattern(pattern)).toBe(false);

      const pattern2 = createTestPattern({ bpm: 400 }); // 太高
      expect(validatePattern(pattern2)).toBe(false);
    });

    it("应该拒绝无效的 timeSignature", () => {
      const pattern = createTestPattern();
      (pattern as any).timeSignature = [4]; // 不是两元素数组
      expect(validatePattern(pattern)).toBe(false);
    });

    it("应该拒绝无效的 grid", () => {
      const pattern = createTestPattern();
      (pattern as any).grid = "invalid";
      expect(validatePattern(pattern)).toBe(false);
    });

    it("应该拒绝包含无效 CellState 的 grid", () => {
      const pattern = createTestPattern();
      pattern.grid = [[99 as any]]; // 无效的 CellState
      expect(validatePattern(pattern)).toBe(false);
    });
  });

  describe("parsePatternFromJSON / serializePatternToJSON", () => {
    it("应该正确序列化和反序列化 Pattern", () => {
      const pattern = createTestPattern();

      const json = serializePatternToJSON(pattern);
      const parsed = parsePatternFromJSON(json);

      expect(parsed).toEqual(pattern);
    });

    it("应该对无效 JSON 返回 null", () => {
      expect(parsePatternFromJSON("invalid json")).toBeNull();
    });

    it("应该对无效 Pattern 数据返回 null", () => {
      expect(parsePatternFromJSON('{"invalid": true}')).toBeNull();
    });
  });
});
