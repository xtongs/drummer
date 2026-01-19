import { describe, it, expect } from "vitest";
import type { Pattern } from "../types";
import { CELL_OFF, CELL_NORMAL, CELL_DOUBLE_32, CELL_FIRST_32 } from "../types";
import {
  patternToVexflowNoteEvents,
  buildBarTimeline,
  DRUM_TO_VEXFLOW,
} from "./vexflowNotation";

function createTestPattern(overrides: Partial<Pattern> = {}): Pattern {
  return {
    id: "p1",
    name: "p1",
    bpm: 120,
    timeSignature: [4, 4],
    bars: 1,
    grid: [],
    drums: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("vexflowNotation utils", () => {
  describe("DRUM_TO_VEXFLOW", () => {
    it("Kick 应该在 lower voice", () => {
      expect(DRUM_TO_VEXFLOW["Kick"].isLowerVoice).toBe(true);
    });
  });

  describe("patternToVexflowNoteEvents", () => {
    it("应该将 Kick 放入 lowerVoice，将 Snare 放入 upperVoice", () => {
      const pattern = createTestPattern({
        bars: 1,
        drums: ["Kick", "Snare"],
        grid: [
          // Kick
          [CELL_NORMAL, CELL_OFF, CELL_OFF, CELL_OFF],
          // Snare
          [CELL_OFF, CELL_NORMAL, CELL_OFF, CELL_OFF],
        ],
      });

      const { upperVoice, lowerVoice } = patternToVexflowNoteEvents(pattern);
      expect(lowerVoice.some((e) => e.drums.some((d) => d.drum === "Kick"))).toBe(
        true
      );
      expect(upperVoice.some((e) => e.drums.some((d) => d.drum === "Snare"))).toBe(
        true
      );
    });

    it("CELL_DOUBLE_32 应该在同一 subdivision 生成两个 subPosition 事件", () => {
      const pattern = createTestPattern({
        bars: 1,
        drums: ["Snare"],
        grid: [[CELL_DOUBLE_32, CELL_OFF, CELL_OFF, CELL_OFF]],
      });

      const { upperVoice } = patternToVexflowNoteEvents(pattern);
      const eventsAt0 = upperVoice.filter((e) => e.subdivision === 0);
      expect(eventsAt0.map((e) => e.subPosition).sort()).toEqual([0, 1]);
    });

    it("CELL_FIRST_32 只应生成 subPosition=0 事件", () => {
      const pattern = createTestPattern({
        bars: 1,
        drums: ["Snare"],
        grid: [[CELL_FIRST_32, CELL_OFF, CELL_OFF, CELL_OFF]],
      });

      const { upperVoice } = patternToVexflowNoteEvents(pattern);
      const eventsAt0 = upperVoice.filter((e) => e.subdivision === 0);
      expect(eventsAt0.map((e) => e.subPosition)).toEqual([0]);
    });
  });

  describe("buildBarTimeline", () => {
    it("小节完全空白时默认应生成整小节休止符（4/4 => 1r）", () => {
      const timeline = buildBarTimeline([], 16);
      expect(timeline).toEqual([
        {
          kind: "rest",
          startUnits32InBar: 0,
          durationToken: { base: 1, dots: 0, units32: 32 },
          durationUnits32: 32,
        },
      ]);
    });

    it("默认应省略尾部休止符", () => {
      const timeline = buildBarTimeline(
        [
          {
            subdivision: 0,
            subPosition: 0,
            drums: [{ drum: "Snare", cellState: CELL_NORMAL }],
            is32nd: false,
          },
        ],
        16
      );
      // 只有一个音符，不应自动补到小节末尾的 rests
      expect(timeline.filter((i) => i.kind === "rest")).toHaveLength(0);
      expect(timeline.filter((i) => i.kind === "note")).toHaveLength(1);
    });

    it("事件之间应生成必要的休止符，并尽量用大时值", () => {
      // event at 0 and 1/2 拍（8 units32）
      const timeline = buildBarTimeline(
        [
          {
            subdivision: 0,
            subPosition: 0,
            drums: [{ drum: "Snare", cellState: CELL_NORMAL }],
            is32nd: false,
          },
          {
            subdivision: 4, // 4 个 16 分 => 8 units32
            subPosition: 0,
            drums: [{ drum: "Snare", cellState: CELL_NORMAL }],
            is32nd: false,
          },
        ],
        16
      );

      const rests = timeline.filter((i) => i.kind === "rest");
      expect(rests).toHaveLength(0); // 这里音符 1 会变成四分(8 units32)覆盖空档，无需 rests

      const notes = timeline.filter((i) => i.kind === "note");
      expect(notes).toHaveLength(2);
      expect(notes[0]).toMatchObject({
        kind: "note",
        startUnits32InBar: 0,
        durationUnits32: 8,
      });
    });

    it("时值不应跨 1/4 小节：跨段时应拆成音符 + 休止符", () => {
      // 4/4：barUnits32=32，1/4 小节=8 units32（1 beat）
      // next event 在 2 beats 之后（16 units32），但第一个音符最多只能到 8
      const timeline = buildBarTimeline(
        [
          {
            subdivision: 0,
            subPosition: 0,
            drums: [{ drum: "Snare", cellState: CELL_NORMAL }],
            is32nd: false,
          },
          {
            subdivision: 8, // 8 个 16 分 => 16 units32（2 beats）
            subPosition: 0,
            drums: [{ drum: "Snare", cellState: CELL_NORMAL }],
            is32nd: false,
          },
        ],
        16
      );

      const notes = timeline.filter((i) => i.kind === "note");
      const rests = timeline.filter((i) => i.kind === "rest");

      expect(notes).toHaveLength(2);
      expect(notes[0]).toMatchObject({ startUnits32InBar: 0, durationUnits32: 8 });
      // 8..16 的间隔需要一个四分休止符
      expect(rests).toEqual([
        {
          kind: "rest",
          startUnits32InBar: 8,
          durationToken: { base: 4, dots: 0, units32: 8 },
          durationUnits32: 8,
        },
      ]);
    });

    it("休止符允许跨 1/4 小节边界（例如 2 beats gap => 二分休止符）", () => {
      // note at 0 => 最多 1 beat (8 units32)
      // next note at 3 beats (24 units32)
      // gap from 8..24 = 16 units32，跨过 1/4 边界(16)，休止符应允许用二分(16)
      const timeline = buildBarTimeline(
        [
          {
            subdivision: 0,
            subPosition: 0,
            drums: [{ drum: "Snare", cellState: CELL_NORMAL }],
            is32nd: false,
          },
          {
            subdivision: 12, // 12*2=24 units32 (3 beats)
            subPosition: 0,
            drums: [{ drum: "Snare", cellState: CELL_NORMAL }],
            is32nd: false,
          },
        ],
        16
      );

      const rests = timeline.filter((i) => i.kind === "rest");
      expect(rests).toEqual([
        {
          kind: "rest",
          startUnits32InBar: 8,
          durationToken: { base: 2, dots: 0, units32: 16 },
          durationUnits32: 16,
        },
      ]);
    });
  });
});

