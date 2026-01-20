import { describe, it, expect } from "vitest";
import {
  pickLargestDurationToken,
  splitGapIntoDurationTokens,
} from "./vexflowDurations";

describe("vexflowDurations", () => {
  describe("pickLargestDurationToken", () => {
    it("应该为整拍间隔选择四分音符", () => {
      expect(pickLargestDurationToken(8)).toEqual({
        base: 4,
        dots: 0,
        units32: 8,
      });
    });

    it("应该支持附点时值（例如附点四分=12）", () => {
      expect(pickLargestDurationToken(12)).toEqual({
        base: 4,
        dots: 1,
        units32: 12,
      });
    });

    it("应该在 gap 非标准值时选择不超过 gap 的最大值", () => {
      // 10 = 8 + 2，最大不超过 10 的单个 token 是四分(8)
      expect(pickLargestDurationToken(10)).toEqual({
        base: 4,
        dots: 0,
        units32: 8,
      });
    });
  });

  describe("splitGapIntoDurationTokens", () => {
    it("gap=0 应该返回空数组", () => {
      expect(splitGapIntoDurationTokens(0)).toEqual([]);
    });

    it("应该能精确分解并保持总时值相等", () => {
      const tokens = splitGapIntoDurationTokens(10);
      const sum = tokens.reduce((acc, t) => acc + t.units32, 0);
      expect(sum).toBe(10);
      // 贪心：10 => 8 + 2
      expect(tokens).toEqual([
        { base: 4, dots: 0, units32: 8 },
        { base: 16, dots: 0, units32: 2 },
      ]);
    });

    it("应该不使用附点休止符（例如 7 = 4 + 2 + 1）", () => {
      const tokens = splitGapIntoDurationTokens(7);
      expect(tokens).toEqual([
        { base: 8, dots: 0, units32: 4 },
        { base: 16, dots: 0, units32: 2 },
        { base: 32, dots: 0, units32: 1 },
      ]);
    });
  });
});

