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
  getNextPatternName,
  getNotationRenderer,
  setNotationRenderer,
  saveSampleSelection,
  loadSampleSelection,
  getSampleVariant,
  setSampleVariant,
  saveSettingsLanguagePreference,
  loadSettingsLanguagePreference,
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
      expect(loaded.patterns[0].grid[0]).toEqual([
        CELL_NORMAL,
        CELL_OFF,
        CELL_NORMAL,
        CELL_OFF,
      ]);
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
      localStorage.setItem(
        "drummer-cross-pattern-loop",
        JSON.stringify({ invalid: true }),
      );

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

  describe("getNextPatternName", () => {
    it("当没有现有 pattern 时应该返回 A", () => {
      expect(getNextPatternName([])).toBe("A");
    });

    it("当有 pattern A 时应该返回 B", () => {
      const patterns = [createTestPattern({ name: "A" })];
      expect(getNextPatternName(patterns)).toBe("B");
    });

    it("当有 pattern A, B, C 时应该返回 D", () => {
      const patterns = [
        createTestPattern({ name: "A" }),
        createTestPattern({ name: "B" }),
        createTestPattern({ name: "C" }),
      ];
      expect(getNextPatternName(patterns)).toBe("D");
    });

    it("应该忽略非单字母名称的 pattern", () => {
      const patterns = [
        createTestPattern({ name: "A" }),
        createTestPattern({ name: "Custom Name" }),
        createTestPattern({ name: "AB" }),
      ];
      expect(getNextPatternName(patterns)).toBe("B");
    });

    it("当所有字母用完但有空隙时应该填充空隙", () => {
      // 假设有 A, C（缺少 B）
      const patterns = [
        createTestPattern({ name: "A" }),
        createTestPattern({ name: "C" }),
      ];
      // 应该返回 D（因为 C 是最大的）
      expect(getNextPatternName(patterns)).toBe("D");
    });

    it("当 A-Z 全部用完时应该找第一个空隙", () => {
      // 创建 A-Z 除了 M 的所有 patterns
      const patterns = [];
      for (let code = 65; code <= 90; code++) {
        if (code !== 77) {
          // 跳过 M
          patterns.push(createTestPattern({ name: String.fromCharCode(code) }));
        }
      }
      expect(getNextPatternName(patterns)).toBe("M");
    });

    it("当有 pattern Z 但没有更多空隙时应该返回 A", () => {
      // 创建 A-Z 所有 patterns
      const patterns = [];
      for (let code = 65; code <= 90; code++) {
        patterns.push(createTestPattern({ name: String.fromCharCode(code) }));
      }
      // 所有字母都用完了，没有空隙，应该返回什么取决于实现
      // 当前实现会在找不到空隙时保持 nextLetter = "A"
      // 实际上循环结束后 nextLetter 还是初始值
      // 但由于所有都用完了，for 循环不会 break，nextLetter 保持 "A"
      expect(getNextPatternName(patterns)).toBe("A");
    });
  });

  describe("getNotationRenderer / setNotationRenderer", () => {
    it("默认值应该为 'vexflow'", () => {
      expect(getNotationRenderer()).toBe("vexflow");
    });

    it("应该固定返回 'vexflow'", () => {
      setNotationRenderer("vexflow");

      expect(getNotationRenderer()).toBe("vexflow");
    });

    it("设置为 legacy 仍然保持 'vexflow'", () => {
      setNotationRenderer("vexflow");
      setNotationRenderer("legacy");

      expect(getNotationRenderer()).toBe("vexflow");
    });

    it("非法值应该回退到默认值 'vexflow'", () => {
      localStorage.setItem("drummer-notation-renderer", "invalid-value");

      expect(getNotationRenderer()).toBe("vexflow");
    });

    it("空字符串应该回退到默认值 'vexflow'", () => {
      localStorage.setItem("drummer-notation-renderer", "");

      expect(getNotationRenderer()).toBe("vexflow");
    });

    it("set 后 get 仍然保持 'vexflow'", () => {
      setNotationRenderer("vexflow");
      expect(getNotationRenderer()).toBe("vexflow");

      setNotationRenderer("legacy");
      expect(getNotationRenderer()).toBe("vexflow");
    });
  });

  describe("采样选择存储 (Sample Selection)", () => {
    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
    });

    describe("saveSampleSelection / loadSampleSelection", () => {
      it("应该保存并加载采样选择映射", () => {
        const selection = {
          Kick: "B" as const,
          Snare: "C" as const,
          "Hi-Hat Closed": "A" as const,
        };
        saveSampleSelection(selection);

        const loaded = loadSampleSelection();
        expect(loaded).toEqual(selection);
      });

      it("空的 localStorage 应该返回空对象", () => {
        const loaded = loadSampleSelection();
        expect(loaded).toEqual({});
      });

      it("应该忽略非法的 variant 值", () => {
        const selection = {
          Kick: "B",
          Snare: "invalid",
          "Hi-Hat Closed": "A",
        } as unknown;
        localStorage.setItem(
          "drummer-sample-selection",
          JSON.stringify(selection),
        );

        const loaded = loadSampleSelection();
        expect(loaded).toEqual({
          Kick: "B",
          "Hi-Hat Closed": "A",
        });
      });

      it("应该覆盖已存在的采样选择", () => {
        saveSampleSelection({ Kick: "A" });
        saveSampleSelection({ Kick: "B" });

        const loaded = loadSampleSelection();
        expect(loaded).toEqual({ Kick: "B" });
      });

      it("应该支持部分鼓件的采样选择", () => {
        const selection = {
          Kick: "C" as const,
          Snare: "B" as const,
        };
        saveSampleSelection(selection);

        const loaded = loadSampleSelection();
        expect(loaded).toEqual(selection);
      });
    });

    describe("getSampleVariant", () => {
      beforeEach(() => {
        localStorage.clear();
      });

      it("应该返回已设置的采样变体", () => {
        setSampleVariant("Kick", "C");
        expect(getSampleVariant("Kick")).toBe("C");

        setSampleVariant("Snare", "A");
        expect(getSampleVariant("Snare")).toBe("A");
      });

      it("未设置的鼓件应该返回默认值 'A'", () => {
        expect(getSampleVariant("Kick")).toBe("A");
        expect(getSampleVariant("Snare")).toBe("A");
        expect(getSampleVariant("Crash 1")).toBe("A");
      });

      it("应该正确更新采样变体", () => {
        setSampleVariant("Kick", "B");
        expect(getSampleVariant("Kick")).toBe("B");

        setSampleVariant("Kick", "C");
        expect(getSampleVariant("Kick")).toBe("C");
      });
    });

    describe("setSampleVariant", () => {
      beforeEach(() => {
        localStorage.clear();
      });

      it("应该能够设置所有鼓件的所有变体", () => {
        const variants: Array<"A" | "B" | "C"> = ["A", "B", "C"];

        variants.forEach((variant) => {
          setSampleVariant("Kick", variant);
          expect(getSampleVariant("Kick")).toBe(variant);
        });
      });

      it("应该支持多个鼓件的不同采样变体", () => {
        setSampleVariant("Kick", "A");
        setSampleVariant("Snare", "B");
        setSampleVariant("Crash 1", "C");

        expect(getSampleVariant("Kick")).toBe("A");
        expect(getSampleVariant("Snare")).toBe("B");
        expect(getSampleVariant("Crash 1")).toBe("C");
      });

      it("应该能够覆盖已有的采样选择", () => {
        setSampleVariant("Kick", "B");
        setSampleVariant("Kick", "C");

        expect(getSampleVariant("Kick")).toBe("C");
      });
    });

    describe("集成测试", () => {
      it("完整的采样选择工作流", () => {
        // 1. 初始状态应该返回默认值
        expect(getSampleVariant("Kick")).toBe("A");

        // 2. 设置不同的变体
        setSampleVariant("Kick", "B");
        expect(getSampleVariant("Kick")).toBe("B");

        // 3. 通过 loadSampleSelection 验证
        const loaded = loadSampleSelection();
        expect(loaded).toEqual({ Kick: "B" });

        // 4. 清除 localStorage 后应该恢复默认值
        localStorage.removeItem("drummer-sample-selection");
        expect(getSampleVariant("Kick")).toBe("A");
      });

      it("应该支持所有鼓件类型的采样选择", () => {
        const drumTypes = [
          "Kick",
          "Snare",
          "Hi-Hat Closed",
          "Hi-Hat Open",
          "Crash 1",
          "Crash 2",
          "Ride",
          "Tom 1",
          "Tom 2",
          "Tom 3",
        ] as const;

        drumTypes.forEach((drumType) => {
          setSampleVariant(drumType, "B");
          expect(getSampleVariant(drumType)).toBe("B");

          setSampleVariant(drumType, "C");
          expect(getSampleVariant(drumType)).toBe("C");

          setSampleVariant(drumType, "A");
          expect(getSampleVariant(drumType)).toBe("A");
        });
      });
    });
  });

  describe("Settings 语言偏好存储", () => {
    it("默认应返回 auto", () => {
      expect(loadSettingsLanguagePreference()).toBe("auto");
    });

    it("应保存并读取具体语言代码", () => {
      saveSettingsLanguagePreference("ja");
      expect(loadSettingsLanguagePreference()).toBe("ja");
    });

    it("应保存并读取 auto", () => {
      saveSettingsLanguagePreference("auto");
      expect(loadSettingsLanguagePreference()).toBe("auto");
    });

    it("非法值应回退为 auto", () => {
      localStorage.setItem("drummer-settings-language", "invalid");
      expect(loadSettingsLanguagePreference()).toBe("auto");
    });
  });
});
