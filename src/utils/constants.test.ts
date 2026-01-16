import { describe, it, expect } from "vitest";
import {
  DRUMS,
  DEFAULT_BPM,
  DEFAULT_TIME_SIGNATURE,
  DEFAULT_BARS,
  MIN_BPM,
  MAX_BPM,
  SUBDIVISIONS_PER_BEAT,
  APP_MAX_WIDTH,
  GRID_CELL_SIZE,
  DRUM_NOTATION,
  THEME_COLOR,
  BPM_RATES,
  BPM_RATE_LABELS,
  calculateCumulativeRate,
} from "./constants";

describe("Constants", () => {
  describe("DRUMS", () => {
    it("应该包含 10 种鼓件", () => {
      expect(DRUMS).toHaveLength(10);
    });

    it("应该包含所有必要的鼓件类型", () => {
      expect(DRUMS).toContain("Kick");
      expect(DRUMS).toContain("Snare");
      expect(DRUMS).toContain("Hi-Hat Closed");
      expect(DRUMS).toContain("Hi-Hat Open");
      expect(DRUMS).toContain("Crash 1");
      expect(DRUMS).toContain("Crash 2");
      expect(DRUMS).toContain("Ride");
      expect(DRUMS).toContain("Tom 1");
      expect(DRUMS).toContain("Tom 2");
      expect(DRUMS).toContain("Tom 3");
    });

    it("应该按标准鼓谱顺序排列（Crash 在顶部，Kick 在底部）", () => {
      expect(DRUMS[0]).toBe("Crash 1");
      expect(DRUMS[DRUMS.length - 1]).toBe("Kick");
    });
  });

  describe("默认值", () => {
    it("DEFAULT_BPM 应该是合理的值", () => {
      expect(DEFAULT_BPM).toBe(120);
      expect(DEFAULT_BPM).toBeGreaterThanOrEqual(MIN_BPM);
      expect(DEFAULT_BPM).toBeLessThanOrEqual(MAX_BPM);
    });

    it("DEFAULT_TIME_SIGNATURE 应该是 4/4", () => {
      expect(DEFAULT_TIME_SIGNATURE).toEqual([4, 4]);
    });

    it("DEFAULT_BARS 应该至少为 1", () => {
      expect(DEFAULT_BARS).toBeGreaterThanOrEqual(1);
    });
  });

  describe("BPM 范围", () => {
    it("MIN_BPM 应该大于 0", () => {
      expect(MIN_BPM).toBeGreaterThan(0);
    });

    it("MAX_BPM 应该大于 MIN_BPM", () => {
      expect(MAX_BPM).toBeGreaterThan(MIN_BPM);
    });

    it("BPM 范围应该是实际可用的", () => {
      expect(MIN_BPM).toBeGreaterThanOrEqual(20);
      expect(MAX_BPM).toBeLessThanOrEqual(300);
    });
  });

  describe("SUBDIVISIONS_PER_BEAT", () => {
    it("应该是 16 分音符（每拍 4 个细分）", () => {
      expect(SUBDIVISIONS_PER_BEAT).toBe(4);
    });
  });

  describe("UI 常量", () => {
    it("APP_MAX_WIDTH 应该是合理的像素值", () => {
      expect(APP_MAX_WIDTH).toBeGreaterThan(0);
      expect(APP_MAX_WIDTH).toBeLessThanOrEqual(1200);
    });

    it("GRID_CELL_SIZE 应该是合理的像素值", () => {
      expect(GRID_CELL_SIZE).toBeGreaterThan(0);
      expect(GRID_CELL_SIZE).toBeLessThanOrEqual(100);
    });
  });

  describe("DRUM_NOTATION", () => {
    it("应该为每个鼓件定义符号", () => {
      DRUMS.forEach((drum) => {
        expect(DRUM_NOTATION[drum]).toBeDefined();
      });
    });

    it("每个鼓件应该有有效的 position", () => {
      DRUMS.forEach((drum) => {
        const notation = DRUM_NOTATION[drum];
        expect(["above", "center", "below"]).toContain(notation.position);
      });
    });

    it("每个鼓件应该有有效的 symbol", () => {
      DRUMS.forEach((drum) => {
        const notation = DRUM_NOTATION[drum];
        expect(["x", "o", "●", "○"]).toContain(notation.symbol);
      });
    });

    it("每个鼓件应该有定义的 line 位置", () => {
      DRUMS.forEach((drum) => {
        const notation = DRUM_NOTATION[drum];
        expect(typeof notation.line).toBe("number");
      });
    });

    it("Kick 应该在下方位置", () => {
      expect(DRUM_NOTATION["Kick"].position).toBe("below");
    });

    it("Hi-Hat 应该使用 x 或 o 符号", () => {
      expect(["x", "o"]).toContain(DRUM_NOTATION["Hi-Hat Closed"].symbol);
      expect(["x", "o"]).toContain(DRUM_NOTATION["Hi-Hat Open"].symbol);
    });
  });

  describe("THEME_COLOR", () => {
    it("应该是有效的颜色值", () => {
      expect(THEME_COLOR).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  describe("BPM_RATES", () => {
    it("应该包含 6 个 rate 值", () => {
      expect(BPM_RATES).toHaveLength(6);
    });

    it("前 5 个值应该小于 1（减速）", () => {
      for (let i = 0; i < 5; i++) {
        expect(BPM_RATES[i]).toBeLessThan(1);
      }
    });

    it("最后一个值应该是 2（加速回到原速）", () => {
      expect(BPM_RATES[5]).toBe(2);
    });

    it("所有 rate 相乘应该等于 1（循环回到原速）", () => {
      const product = BPM_RATES.reduce((acc, rate) => acc * rate, 1);
      expect(product).toBeCloseTo(1, 10);
    });
  });

  describe("BPM_RATE_LABELS", () => {
    it("应该与 BPM_RATES 长度相同", () => {
      expect(BPM_RATE_LABELS).toHaveLength(BPM_RATES.length);
    });

    it("第一个标签应该为空（原速）", () => {
      expect(BPM_RATE_LABELS[0]).toBe("");
    });

    it("应该包含减速标签", () => {
      expect(BPM_RATE_LABELS).toContain("x0.9");
      expect(BPM_RATE_LABELS).toContain("x0.5");
    });
  });

  describe("calculateCumulativeRate", () => {
    it("rateIndex 为 0 时应该返回 1", () => {
      expect(calculateCumulativeRate(0)).toBe(1);
    });

    it("rateIndex 为 1 时应该返回第一个 rate 值", () => {
      expect(calculateCumulativeRate(1)).toBe(BPM_RATES[0]);
    });

    it("rateIndex 为 2 时应该返回前两个 rate 的乘积", () => {
      const expected = BPM_RATES[0] * BPM_RATES[1];
      expect(calculateCumulativeRate(2)).toBeCloseTo(expected, 10);
    });

    it("完整循环后应该返回 1", () => {
      expect(calculateCumulativeRate(6)).toBeCloseTo(1, 10);
    });

    it("应该支持自定义 rates 数组", () => {
      const customRates = [0.5, 2];
      expect(calculateCumulativeRate(1, customRates)).toBe(0.5);
      expect(calculateCumulativeRate(2, customRates)).toBe(1);
    });

    it("负数 rateIndex 应该返回 1", () => {
      expect(calculateCumulativeRate(-1)).toBe(1);
    });
  });
});
