import { describe, it, expect } from "vitest";
import { getSymbolY, getDrumNotation } from "./drumNotation";
import { DRUMS, DRUM_NOTATION } from "./constants";
import type { DrumType } from "../types";

describe("drumNotation 工具函数", () => {
  describe("getSymbolY", () => {
    const staffTop = 50;
    const lineSpacing = 10;
    const staffHeight = 40; // 5条线，4个间隔

    it("应该正确计算中间线位置 (line = 0)", () => {
      const y = getSymbolY(0, staffHeight, staffTop, lineSpacing);
      // 中间线是第3条线，在 staffTop + 2 * lineSpacing
      expect(y).toBe(staffTop + 2 * lineSpacing);
    });

    it("应该正确计算第一条线位置 (line = -2)", () => {
      const y = getSymbolY(-2, staffHeight, staffTop, lineSpacing);
      // 第一条线在中间线上方2个间距
      expect(y).toBe(staffTop + 2 * lineSpacing - 2 * lineSpacing);
      expect(y).toBe(staffTop);
    });

    it("应该正确计算第五条线位置 (line = 2)", () => {
      const y = getSymbolY(2, staffHeight, staffTop, lineSpacing);
      // 第五条线在中间线下方2个间距
      expect(y).toBe(staffTop + 2 * lineSpacing + 2 * lineSpacing);
      expect(y).toBe(staffTop + 4 * lineSpacing);
    });

    it("应该支持半线位置 (line = 0.5)", () => {
      const y = getSymbolY(0.5, staffHeight, staffTop, lineSpacing);
      // 在中间线和下一条线之间
      expect(y).toBe(staffTop + 2 * lineSpacing + 0.5 * lineSpacing);
    });

    it("应该支持超出五线谱范围的位置", () => {
      const yAbove = getSymbolY(-2.5, staffHeight, staffTop, lineSpacing);
      const yBelow = getSymbolY(2.5, staffHeight, staffTop, lineSpacing);

      // 在五线谱上方
      expect(yAbove).toBeLessThan(staffTop);
      // 在五线谱下方
      expect(yBelow).toBeGreaterThan(staffTop + 4 * lineSpacing);
    });
  });

  describe("getDrumNotation", () => {
    it("应该返回每个鼓件的符号信息", () => {
      DRUMS.forEach((drum) => {
        const notation = getDrumNotation(drum);
        expect(notation).toBeDefined();
        expect(notation).toHaveProperty("position");
        expect(notation).toHaveProperty("symbol");
        expect(notation).toHaveProperty("line");
      });
    });

    it("应该返回与 DRUM_NOTATION 常量相同的值", () => {
      DRUMS.forEach((drum) => {
        const notation = getDrumNotation(drum);
        expect(notation).toEqual(DRUM_NOTATION[drum]);
      });
    });

    it("Kick 应该在最低位置", () => {
      const kickNotation = getDrumNotation("Kick");
      expect(kickNotation.position).toBe("below");
      expect(kickNotation.line).toBeGreaterThan(2);
    });

    it("Crash 应该在最高位置", () => {
      const crash1Notation = getDrumNotation("Crash 1");
      expect(crash1Notation.position).toBe("above");
      expect(crash1Notation.line).toBeLessThan(0);
    });

    it("Snare 应该在中间位置", () => {
      const snareNotation = getDrumNotation("Snare");
      expect(snareNotation.position).toBe("center");
    });

    it("Hi-Hat Closed 和 Hi-Hat Open 应该在同一行", () => {
      const closedNotation = getDrumNotation("Hi-Hat Closed");
      const openNotation = getDrumNotation("Hi-Hat Open");

      expect(closedNotation.line).toBe(openNotation.line);
    });

    it("Tom 1, Tom 2, Tom 3 应该按音高从高到低排列", () => {
      const tom1 = getDrumNotation("Tom 1");
      const tom2 = getDrumNotation("Tom 2");
      const tom3 = getDrumNotation("Tom 3");

      // 在五线谱上，line 值越小位置越高
      expect(tom1.line).toBeLessThan(tom2.line);
      expect(tom2.line).toBeLessThan(tom3.line);
    });
  });

  describe("符号类型验证", () => {
    it("镲片类应该使用 x 或 o 符号", () => {
      const cymbals: DrumType[] = [
        "Crash 1",
        "Crash 2",
        "Hi-Hat Open",
        "Hi-Hat Closed",
        "Ride",
      ];

      cymbals.forEach((drum) => {
        const notation = getDrumNotation(drum);
        expect(["x", "o"]).toContain(notation.symbol);
      });
    });

    it("鼓类应该使用 ● 符号", () => {
      const drums: DrumType[] = ["Kick", "Snare", "Tom 1", "Tom 2", "Tom 3"];

      drums.forEach((drum) => {
        const notation = getDrumNotation(drum);
        expect(notation.symbol).toBe("●");
      });
    });
  });
});
