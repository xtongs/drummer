import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getExistingXShift,
  getFixedX,
  isBeamable,
  groupByQuarterBar,
  hasSixteenthOrShorter,
  hasSixteenthByHalfBar,
  splitNotesByHalfBar,
  splitNotesByBeat,
  getRestTargetX,
  buildBarTickables,
  type NoteWithMeta,
} from "./vexflowRenderer";
import { CELL_NORMAL } from "../types";

// Mock VexFlow
const mockStaveNote = {
  getXShift: vi.fn(),
  x_shift: undefined as number | undefined,
  getDuration: vi.fn(),
  getStem: vi.fn(() => ({ setOptions: vi.fn() })),
  addModifier: vi.fn(),
};

vi.mock("vexflow", () => ({
  StaveNote: vi.fn(function StaveNote() {
    return mockStaveNote;
  }),
  Dot: { buildAndAttach: vi.fn() },
  Annotation: {
    VerticalJustify: { TOP: 1 },
    HorizontalJustify: { CENTER_STEM: 2 },
  },
}));

// Mock DRUM_TO_VEXFLOW
vi.mock("./vexflowNotation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./vexflowNotation")>();
  return {
    ...actual,
    DRUM_TO_VEXFLOW: {
      "Kick": { keys: ["f/4"], isLowerVoice: true },
      "Snare": { keys: ["c/5"], isLowerVoice: false },
      "Hi-Hat Open": { keys: ["g/5/x"], isLowerVoice: false },
      "Hi-Hat Closed": { keys: ["g/5"], isLowerVoice: false },
      "Crash 1": { keys: ["b/5/x"], isLowerVoice: false },
    },
  };
});

describe("vexflowRenderer utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getExistingXShift", () => {
    it("应该返回 getXShift() 的值", () => {
      mockStaveNote.getXShift.mockReturnValue(10);
      const result = getExistingXShift(mockStaveNote as unknown as import("vexflow").StaveNote);
      expect(result).toBe(10);
    });

    it("当 getXShift() 未定义时返回 0", () => {
      mockStaveNote.getXShift.mockReturnValue(undefined);
      const result = getExistingXShift(mockStaveNote as unknown as import("vexflow").StaveNote);
      expect(result).toBe(0);
    });
  });

  describe("getFixedX", () => {
    const cellWidth = 50;
    const barStartSub = 0;

    it("应该计算普通音符的中心位置", () => {
      const result = getFixedX(4, 0, cellWidth, barStartSub, false);
      expect(result).toBe(225); // (4 * 50) + 50/2 = 225
    });

    it("应该对 32 分音符应用偏移 (subPosition=0)", () => {
      const offset = cellWidth * 0.22; // 11
      const baseX = 4 * cellWidth + cellWidth / 2; // 225
      const result = getFixedX(4, 0, cellWidth, barStartSub, true);
      expect(result).toBe(baseX - offset);
    });

    it("应该对 32 分音符应用偏移 (subPosition=1)", () => {
      const offset = cellWidth * 0.22; // 11
      const baseX = 4 * cellWidth + cellWidth / 2; // 225
      const result = getFixedX(4, 1, cellWidth, barStartSub, true);
      expect(result).toBe(baseX + offset);
    });

    it("应该计算四分休止符的中心位置", () => {
      const result = getFixedX(0, 0, cellWidth, barStartSub, false, 4);
      expect(result).toBe(100); // (0 + 1.5) * 50 + 50/2 = 100
    });

    it("应该计算八分休止符的中心位置", () => {
      const result = getFixedX(2, 0, cellWidth, barStartSub, false, 8);
      expect(result).toBe(150); // (2 + 0.5) * 50 + 50/2 = 150
    });

    it("应该处理 barStartSub 不为 0 的情况", () => {
      const result = getFixedX(20, 0, cellWidth, 16, false);
      // localSub = 20 - 16 = 4
      expect(result).toBe(225);
    });
  });

  describe("isBeamable", () => {
    it("八分音符应该可以用符杠连接", () => {
      mockStaveNote.getDuration.mockReturnValue("8");
      expect(isBeamable(mockStaveNote as unknown as import("vexflow").StaveNote)).toBe(true);
    });

    it("十六分音符应该可以用符杠连接", () => {
      mockStaveNote.getDuration.mockReturnValue("16");
      expect(isBeamable(mockStaveNote as unknown as import("vexflow").StaveNote)).toBe(true);
    });

    it("四分音符不应该用符杠连接", () => {
      mockStaveNote.getDuration.mockReturnValue("4");
      expect(isBeamable(mockStaveNote as unknown as import("vexflow").StaveNote)).toBe(false);
    });

    it("二分音符不应该用符杠连接", () => {
      mockStaveNote.getDuration.mockReturnValue("2");
      expect(isBeamable(mockStaveNote as unknown as import("vexflow").StaveNote)).toBe(false);
    });

    it("八分休止符应该可以用符杠连接", () => {
      mockStaveNote.getDuration.mockReturnValue("8r");
      expect(isBeamable(mockStaveNote as unknown as import("vexflow").StaveNote)).toBe(true);
    });

    it("无效的 duration 应该返回 false", () => {
      mockStaveNote.getDuration.mockReturnValue("invalid");
      expect(isBeamable(mockStaveNote as unknown as import("vexflow").StaveNote)).toBe(false);
    });
  });

  describe("groupByQuarterBar", () => {
    const barStartSub = 0;
    const barSubdivisions = 16; // 4/4 拍，一小节 16 个 16 分音符

    const createMockItem = (
      startUnits32InBar: number,
    ): NoteWithMeta => ({
      note: mockStaveNote as unknown as import("vexflow").StaveNote,
      event: {
        subdivision: Math.floor(startUnits32InBar / 2),
        subPosition: (startUnits32InBar % 2) as 0 | 1,
        drums: [],
        is32nd: startUnits32InBar % 2 === 1,
        kind: "normal" as const,
      },
      isRest: false,
      startUnits32InBar,
      durationUnits32: 4,
    });

    beforeEach(() => {
      mockStaveNote.getDuration.mockReturnValue("8");
    });

    it("应该将音符按 1/4 小节分组", () => {
      const items = [
        createMockItem(0),
        createMockItem(2),
        createMockItem(10),
        createMockItem(18),
        createMockItem(26),
      ];

      const result = groupByQuarterBar(items, barStartSub, barSubdivisions);

      expect(result).toHaveLength(4);
      expect(result[0]).toHaveLength(2);
      expect(result[1]).toHaveLength(1);
      expect(result[2]).toHaveLength(1);
      expect(result[3]).toHaveLength(1);
    });

    it("应该过滤不可符杠连接的音符", () => {
      const items: NoteWithMeta[] = [
        createMockItem(0),
        {
          ...createMockItem(4),
          note: { ...mockStaveNote, getDuration: () => "4" } as unknown as import("vexflow").StaveNote,
        },
      ];

      const result = groupByQuarterBar(items, barStartSub, barSubdivisions);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
    });

    it("应该处理空数组", () => {
      const result = groupByQuarterBar([], barStartSub, barSubdivisions);
      expect(result).toEqual([]);
    });

    it("应该处理所有音符在同一 1/4 小节的情况", () => {
      const items = [
        createMockItem(0),
        createMockItem(2),
        createMockItem(4),
        createMockItem(6),
      ];

      const result = groupByQuarterBar(items, barStartSub, barSubdivisions);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(4);
    });

    it("应该使用 event 中的位置信息当 startUnits32InBar 未定义时", () => {
      const items: NoteWithMeta[] = [
        {
          note: mockStaveNote as unknown as import("vexflow").StaveNote,
          event: {
            subdivision: 2,
            subPosition: 0 as 0 | 1,
            drums: [],
            is32nd: false,
            kind: "normal" as const,
          },
          isRest: false,
          durationUnits32: 4,
        },
      ];

      const result = groupByQuarterBar(items, barStartSub, barSubdivisions);

      expect(result).toHaveLength(1);
    });
  });

  describe("hasSixteenthOrShorter", () => {
    const createMockItem = (
      duration: string,
      isRest: boolean = false,
    ): NoteWithMeta => ({
      note: { ...mockStaveNote, getDuration: () => duration } as unknown as import("vexflow").StaveNote,
      event: {
        subdivision: 0,
        subPosition: 0 as 0 | 1,
        drums: [],
        is32nd: false,
        kind: "normal" as const,
      },
      isRest,
      durationUnits32: 4,
    });

    it("当有十六分音符时应该返回 true", () => {
      const items = [
        createMockItem("8"),
        createMockItem("8"),
        createMockItem("16"),  // 十六分音符
        createMockItem("8"),
      ];

      expect(hasSixteenthOrShorter(items)).toBe(true);
    });

    it("当有三十二分音符时应该返回 true", () => {
      const items = [
        createMockItem("8"),
        createMockItem("32"),  // 三十二分音符
      ];

      expect(hasSixteenthOrShorter(items)).toBe(true);
    });

    it("当只有八分音符时应该返回 false", () => {
      const items = [
        createMockItem("8"),
        createMockItem("8"),
        createMockItem("8"),
        createMockItem("8"),
      ];

      expect(hasSixteenthOrShorter(items)).toBe(false);
    });

    it("当只有四分音符时应该返回 false", () => {
      const items = [
        createMockItem("4"),
        createMockItem("4"),
      ];

      expect(hasSixteenthOrShorter(items)).toBe(false);
    });

    it("应该忽略休止符", () => {
      const items = [
        createMockItem("8"),
        createMockItem("16r", true),  // 十六分休止符应该被忽略
        createMockItem("8"),
      ];

      expect(hasSixteenthOrShorter(items)).toBe(false);
    });

    it("应该处理空数组", () => {
      expect(hasSixteenthOrShorter([])).toBe(false);
    });

    it("当有混合音符包含十六分音符时应该返回 true", () => {
      const items = [
        createMockItem("4"),
        createMockItem("8"),
        createMockItem("16"),  // 有一个十六分音符
        createMockItem("8"),
      ];

      expect(hasSixteenthOrShorter(items)).toBe(true);
    });
  });

  describe("hasSixteenthByHalfBar", () => {
    const createMockItem = (
      startUnits32InBar: number,
      duration: string,
      isRest: boolean = false,
    ): NoteWithMeta => ({
      note: { ...mockStaveNote, getDuration: () => duration } as unknown as import("vexflow").StaveNote,
      event: {
        subdivision: Math.floor(startUnits32InBar / 2),
        subPosition: (startUnits32InBar % 2) as 0 | 1,
        drums: [],
        is32nd: startUnits32InBar % 2 === 1,
        kind: "normal" as const,
      },
      isRest,
      durationUnits32: 4,
      startUnits32InBar,
    });

    it("应该正确检测前半小节的十六分音符", () => {
      const items = [
        createMockItem(0, "16"), // 前半小节
        createMockItem(8, "8"),  // 前半小节
      ];
      const [firstHalf, secondHalf] = hasSixteenthByHalfBar(items, 16);
      expect(firstHalf).toBe(true);
      expect(secondHalf).toBe(false);
    });

    it("应该正确检测后半小节的十六分音符", () => {
      const items = [
        createMockItem(16, "8"),  // 后半小节
        createMockItem(20, "16"), // 后半小节
      ];
      const [firstHalf, secondHalf] = hasSixteenthByHalfBar(items, 16);
      expect(firstHalf).toBe(false);
      expect(secondHalf).toBe(true);
    });

    it("应该忽略休止符", () => {
      const items = [
        createMockItem(0, "8"),
        createMockItem(20, "16r", true), // 休止符应该被忽略
      ];
      const [firstHalf, secondHalf] = hasSixteenthByHalfBar(items, 16);
      expect(firstHalf).toBe(false);
      expect(secondHalf).toBe(false);
    });

    it("应该处理空数组", () => {
      const [firstHalf, secondHalf] = hasSixteenthByHalfBar([], 16);
      expect(firstHalf).toBe(false);
      expect(secondHalf).toBe(false);
    });
  });

  describe("splitNotesByHalfBar", () => {
    const createMockItem = (
      startUnits32InBar: number,
    ): NoteWithMeta => ({
      note: mockStaveNote as unknown as import("vexflow").StaveNote,
      event: {
        subdivision: Math.floor(startUnits32InBar / 2),
        subPosition: (startUnits32InBar % 2) as 0 | 1,
        drums: [],
        is32nd: startUnits32InBar % 2 === 1,
        kind: "normal" as const,
      },
      isRest: false,
      durationUnits32: 4,
      startUnits32InBar,
    });

    it("应该将音符按半小节分组", () => {
      const items = [
        createMockItem(0),
        createMockItem(4),
        createMockItem(16),
        createMockItem(20),
      ];

      const [firstHalf, secondHalf] = splitNotesByHalfBar(items, 16);

      expect(firstHalf).toHaveLength(2);
      expect(secondHalf).toHaveLength(2);
    });

    it("应该处理所有音符都在前半小节的情况", () => {
      const items = [
        createMockItem(0),
        createMockItem(4),
        createMockItem(8),
      ];

      const [firstHalf, secondHalf] = splitNotesByHalfBar(items, 16);

      expect(firstHalf).toHaveLength(3);
      expect(secondHalf).toHaveLength(0);
    });

    it("应该处理所有音符都在后半小节的情况", () => {
      const items = [
        createMockItem(16),
        createMockItem(20),
      ];

      const [firstHalf, secondHalf] = splitNotesByHalfBar(items, 16);

      expect(firstHalf).toHaveLength(0);
      expect(secondHalf).toHaveLength(2);
    });

    it("应该处理空数组", () => {
      const [firstHalf, secondHalf] = splitNotesByHalfBar([], 16);
      expect(firstHalf).toEqual([]);
      expect(secondHalf).toEqual([]);
    });
  });

  describe("splitNotesByBeat", () => {
    const createMockItem = (
      startUnits32InBar: number,
    ): NoteWithMeta => ({
      note: mockStaveNote as unknown as import("vexflow").StaveNote,
      event: {
        subdivision: Math.floor(startUnits32InBar / 2),
        subPosition: (startUnits32InBar % 2) as 0 | 1,
        drums: [],
        is32nd: startUnits32InBar % 2 === 1,
        kind: "normal" as const,
      },
      isRest: false,
      durationUnits32: 4,
      startUnits32InBar,
    });

    it("应该将音符按拍子分组 (4/4 拍)", () => {
      // 4/4 拍，每拍 8 units32
      // 音符分布：第1拍有2个，第2拍有1个，第3拍有2个，第4拍有0个
      const items = [
        createMockItem(0),   // 第1拍
        createMockItem(2),   // 第1拍
        createMockItem(8),   // 第2拍
        createMockItem(16),  // 第3拍
        createMockItem(18),  // 第3拍
      ];

      const result = splitNotesByBeat(items, 16, 4);

      expect(result).toHaveLength(3); // 3个非空拍
      expect(result[0]).toHaveLength(2); // 第1拍有2个音符
      expect(result[1]).toHaveLength(1); // 第2拍有1个音符
      expect(result[2]).toHaveLength(2); // 第3拍有2个音符
    });

    it("应该将半小节的音符按拍子分组", () => {
      // 半小节有2拍（4/4拍时）
      // 第1拍有2个十六分音符，第2拍有2个十六分音符
      const items = [
        createMockItem(0),   // 第1拍位置0
        createMockItem(2),   // 第1拍位置2
        createMockItem(8),   // 第2拍位置0
        createMockItem(10),  // 第2拍位置2
      ];

      const result = splitNotesByBeat(items, 16, 4);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(2);
      expect(result[1]).toHaveLength(2);

      // 验证第1拍的音符
      expect(result[0]![0]!.startUnits32InBar).toBe(0);
      expect(result[0]![1]!.startUnits32InBar).toBe(2);

      // 验证第2拍的音符
      expect(result[1]![0]!.startUnits32InBar).toBe(8);
      expect(result[1]![1]!.startUnits32InBar).toBe(10);
    });

    it("应该处理所有音符都在同一拍的情况", () => {
      const items = [
        createMockItem(0),
        createMockItem(2),
        createMockItem(4),
      ];

      const result = splitNotesByBeat(items, 16, 4);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(3);
    });

    it("应该处理空数组", () => {
      const result = splitNotesByBeat([], 16, 4);
      expect(result).toEqual([]);
    });
  });

  describe("getRestTargetX", () => {
    const cellWidth = 50;

    it("应该计算休止符的中心位置", () => {
      // startUnits32InBar=0, durationUnits32=8 (四分音符)
      const result = getRestTargetX(0, 8, cellWidth);
      // centerUnits32 = 0 + 8/2 = 4
      // centerSub = 4 / 2 = 2
      // result = 2 * 50 - 50/4 * 1.2 = 100 - 15 = 85
      expect(result).toBe(85);
    });

    it("应该计算不同起始位置的休止符", () => {
      // startUnits32InBar=8, durationUnits32=4 (八分音符)
      const result = getRestTargetX(8, 4, cellWidth);
      // centerUnits32 = 8 + 4/2 = 10
      // centerSub = 10 / 2 = 5
      // result = 5 * 50 - 15 = 235
      expect(result).toBe(235);
    });

    it("应该计算较长的休止符", () => {
      // startUnits32InBar=0, durationUnits32=16 (二分音符)
      const result = getRestTargetX(0, 16, cellWidth);
      // centerUnits32 = 0 + 16/2 = 8
      // centerSub = 8 / 2 = 4
      // result = 4 * 50 - 15 = 185
      expect(result).toBe(185);
    });
  });

  describe("buildBarTickables", () => {
    const totalSubdivisionsInBar = 16; // 4/4 拍，一小节 16 个 16 分音符

    it("当没有音符时，应该返回空数组（不显示休止符）", () => {
      const result = buildBarTickables([], totalSubdivisionsInBar, false);
      expect(result).toEqual([]);
    });

    it("当有音符时，应该正常构建 tickables", () => {
      const events = [
        {
          subdivision: 0,
          subPosition: 0 as const,
          drums: [{ drum: "Snare" as const, cellState: CELL_NORMAL, kind: "normal" as const }],
          is32nd: false,
          kind: "normal" as const,
        },
      ];
      const result = buildBarTickables(events, totalSubdivisionsInBar, false);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({
        isRest: false,
      });
    });

    it("当只有休止符时，应该返回空数组", () => {
      const result = buildBarTickables([], totalSubdivisionsInBar, false);
      expect(result).toEqual([]);
    });
  });
});
