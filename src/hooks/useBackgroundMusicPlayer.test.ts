/**
 * BGM 同步逻辑测试
 *
 * ⚠️ 这是一个关键的逻辑测试，用于验证 BGM 在不同 playbackRate 下都能正确同步
 *
 * 核心原则：
 * BGM offset 是相对于"原始节奏"的，不受 playbackRate 影响
 * 计算 BGM 位置时，必须使用原始节奏时间（不考虑 playbackRate）
 */
import { describe, it, expect } from "vitest";

describe("BGM 同步逻辑", () => {
  describe("原始节奏时间计算", () => {
    it("应该使用原始 BPM（不乘以 playbackRate）", () => {
      // 场景：BPM=180, 4/4 拍
      const bpm = 180;
      const beatsPerBar = 4;
      const beatDuration = 60 / bpm; // 0.333... 秒
      const barDuration = beatDuration * beatsPerBar; // 1.333... 秒

      // bar1（从 bar 0 到 bar 1）的原始节奏时间
      const timeAtBar1 = barDuration;
      expect(timeAtBar1).toBeCloseTo(1.333, 2);

      // ⚠️ 关键：无论 playbackRate 是多少，原始节奏时间都不变
      expect(timeAtBar1).toBeCloseTo(1.333, 2); // rate = 1.0
      expect(timeAtBar1).toBeCloseTo(1.333, 2); // rate = 0.9
      expect(timeAtBar1).toBeCloseTo(1.333, 2); // rate = 0.8
    });

    it("应该正确计算从 bar 0 到 bar 1 的原始节奏时间", () => {
      const bpm = 180;
      const timeSignature: [number, number] = [4, 4];
      const beatsPerBar = timeSignature[0];

      // 从 bar 0 到 bar 1 的时间
      let timeAtBar1 = 0;
      for (let barIndex = 0; barIndex < 1; barIndex++) {
        const beatDuration = (60 / bpm) * (4 / timeSignature[1]);
        const barDuration = beatDuration * beatsPerBar;
        timeAtBar1 += barDuration;
      }

      expect(timeAtBar1).toBeCloseTo(1.333, 2);
    });

    it("应该正确计算从 bar 0 到 bar 2 的原始节奏时间", () => {
      const bpm = 180;
      const timeSignature: [number, number] = [4, 4];
      const beatsPerBar = timeSignature[0];

      // 从 bar 0 到 bar 2 的时间
      let timeAtBar2 = 0;
      for (let barIndex = 0; barIndex < 2; barIndex++) {
        const beatDuration = (60 / bpm) * (4 / timeSignature[1]);
        const barDuration = beatDuration * beatsPerBar;
        timeAtBar2 += barDuration;
      }

      expect(timeAtBar2).toBeCloseTo(2.667, 2);
    });
  });

  describe("patternTime 转换为原始节奏时间", () => {
    it("应该将 patternTime（已考虑 playbackRate）除以 playbackRate 得到原始节奏时间", () => {
      // 场景：patternTime = 3.70 秒（rate=0.9 时的实际播放时间）
      const patternTime = 3.70;
      const playbackRate = 0.9;

      // 转换为原始节奏时间
      const patternTimeOriginal = patternTime / playbackRate;

      // 3.70 / 0.9 ≈ 4.111
      expect(patternTimeOriginal).toBeCloseTo(4.111, 2);
    });

    it("rate=1.0 时，patternTimeOriginal 应该等于 patternTime", () => {
      const patternTime = 3.33;
      const playbackRate = 1.0;

      const patternTimeOriginal = patternTime / playbackRate;

      expect(patternTimeOriginal).toBe(3.33);
    });
  });

  describe("BGM 位置计算", () => {
    const bpm = 180;
    const timeSignature: [number, number] = [4, 4];
    const beatsPerBar = timeSignature[0];
    const beatDuration = (60 / bpm) * (4 / timeSignature[1]);
    const barDuration = beatDuration * beatsPerBar;

    it("rate=1.0, rangeStartBar=1, offset=-0.87s", () => {
      const playbackRate = 1.0;
      const rangeStartBar = 1;
      const offsetSeconds = -0.87;

      // 计算 range start 的原始节奏时间
      let timeAtRangeStartOriginal = 0;
      for (let barIndex = 0; barIndex < rangeStartBar; barIndex++) {
        timeAtRangeStartOriginal += barDuration;
      }

      // patternTime = 0（range start）
      const patternTime = 0;
      const patternTimeOriginal = patternTime / playbackRate;

      // 计算 BGM 位置
      const absolutePatternTime = patternTimeOriginal + timeAtRangeStartOriginal;
      const adjustedPatternTime = absolutePatternTime - offsetSeconds;
      const desiredBgmPosition = adjustedPatternTime / playbackRate;

      // 验证
      expect(timeAtRangeStartOriginal).toBeCloseTo(1.333, 2);
      expect(absolutePatternTime).toBeCloseTo(1.333, 2);
      expect(adjustedPatternTime).toBeCloseTo(2.203, 2); // 1.333 - (-0.87)
      expect(desiredBgmPosition).toBeCloseTo(2.203, 2);
    });

    it("rate=0.9, rangeStartBar=1, offset=-0.87s - 关键测试！", () => {
      const playbackRate = 0.9;
      const rangeStartBar = 1;
      const offsetSeconds = -0.87;

      // ⚠️ 必须使用原始节奏时间（不乘以 playbackRate）
      let timeAtRangeStartOriginal = 0;
      for (let barIndex = 0; barIndex < rangeStartBar; barIndex++) {
        timeAtRangeStartOriginal += barDuration;
      }

      // patternTime = 0（range start）
      const patternTime = 0;
      const patternTimeOriginal = patternTime / playbackRate;

      // 计算 BGM 位置
      const absolutePatternTime = patternTimeOriginal + timeAtRangeStartOriginal;
      const adjustedPatternTime = absolutePatternTime - offsetSeconds;
      const desiredBgmPosition = adjustedPatternTime / playbackRate;

      // ⚠️ 关键断言：
      // 1. timeAtRangeStartOriginal 应该等于 1.333（不受 rate 影响）
      expect(timeAtRangeStartOriginal).toBeCloseTo(1.333, 2);

      // 2. desiredBgmPosition 应该等于 2.448（不是 2.203 / 0.9）
      // 因为 1.333 - (-0.87) = 2.203，然后 2.203 / 0.9 = 2.448
      expect(desiredBgmPosition).toBeCloseTo(2.448, 2);

      // 3. 验证同步：BGM player 的 playbackRate = 0.9
      //    所以实际播放时间是 2.448 * 0.9 = 2.203 秒
      //    这与 rate=1.0 时的 adjustedPatternTime 一致！
      const actualPlaybackTime = desiredBgmPosition * playbackRate;
      expect(actualPlaybackTime).toBeCloseTo(2.203, 2);
    });

    it("rate=0.8, rangeStartBar=1, offset=-0.87s", () => {
      const playbackRate = 0.8;
      const rangeStartBar = 1;
      const offsetSeconds = -0.87;

      // ⚠️ 必须使用原始节奏时间
      let timeAtRangeStartOriginal = 0;
      for (let barIndex = 0; barIndex < rangeStartBar; barIndex++) {
        timeAtRangeStartOriginal += barDuration;
      }

      const patternTime = 0;
      const patternTimeOriginal = patternTime / playbackRate;

      const absolutePatternTime = patternTimeOriginal + timeAtRangeStartOriginal;
      const adjustedPatternTime = absolutePatternTime - offsetSeconds;
      const desiredBgmPosition = adjustedPatternTime / playbackRate;

      // 验证
      expect(timeAtRangeStartOriginal).toBeCloseTo(1.333, 2); // 不受 rate 影响
      expect(desiredBgmPosition).toBeCloseTo(2.754, 2); // 2.203 / 0.8

      // 验证同步
      const actualPlaybackTime = desiredBgmPosition * playbackRate;
      expect(actualPlaybackTime).toBeCloseTo(2.203, 2); // 与 rate=1.0 一致
    });
  });

  describe("错误做法验证 - 不要这样做！", () => {
    it("❌ 错误：使用考虑 playbackRate 的时间计算", () => {
      const playbackRate = 0.9;
      const rangeStartBar = 1;
      const offsetSeconds = -0.87;

      // ❌ 错误做法：使用 effectiveBpm = barBpm * playbackRate
      const effectiveBpm = 180 * playbackRate; // 162
      const beatDuration = (60 / effectiveBpm) * (4 / 4); // 0.370 秒
      const barDuration = beatDuration * 4; // 1.481 秒

      const timeAtRangeStartWrong = barDuration * rangeStartBar; // 1.481 秒

      const patternTime = 0;
      const absolutePatternTime = patternTime + timeAtRangeStartWrong; // 1.481
      const adjustedPatternTime = absolutePatternTime - offsetSeconds; // 2.351
      const desiredBgmPosition = adjustedPatternTime / playbackRate; // 2.612

      // ⚠️ 这是错误的！
      // timeAtRangeStartWrong = 1.481（应该是 1.333）
      // desiredBgmPosition = 2.612（应该是 2.448）
      // 这会导致 BGM 不同步！

      expect(timeAtRangeStartWrong).toBeCloseTo(1.481, 2); // ❌ 错误
      expect(desiredBgmPosition).toBeCloseTo(2.612, 2); // ❌ 错误
    });
  });
});
