export type VexflowBaseDuration = 1 | 2 | 4 | 8 | 16 | 32;

export interface VexflowDurationToken {
  base: VexflowBaseDuration;
  dots: 0 | 1;
  /**
   * 以“32 分音符”为最小单位的长度：
   * - 32 -> 1
   * - 16 -> 2
   * - 8  -> 4
   * - 4  -> 8
   * - 2  -> 16
   * - 1  -> 32
   * dotted => * 1.5（例如 dotted 8 = 6）
   */
  units32: number;
}

const TOKENS_DESC: readonly VexflowDurationToken[] = [
  { base: 1, dots: 0, units32: 32 },
  { base: 2, dots: 1, units32: 24 },
  { base: 2, dots: 0, units32: 16 },
  { base: 4, dots: 1, units32: 12 },
  { base: 4, dots: 0, units32: 8 },
  { base: 8, dots: 1, units32: 6 },
  { base: 8, dots: 0, units32: 4 },
  { base: 16, dots: 1, units32: 3 },
  { base: 16, dots: 0, units32: 2 },
  { base: 32, dots: 0, units32: 1 },
] as const;

/**
 * 在不超过 gapUnits32 的前提下，选择“尽可能大”的单个时值 token。
 * gapUnits32 必须 > 0。
 */
export function pickLargestDurationToken(
  gapUnits32: number
): VexflowDurationToken {
  if (!Number.isFinite(gapUnits32) || gapUnits32 <= 0) {
    throw new Error(`gapUnits32 must be > 0, got: ${gapUnits32}`);
  }

  const token = TOKENS_DESC.find((t) => t.units32 <= gapUnits32);
  if (!token) {
    // 理论上不会发生，因为最小 token 为 1
    return { base: 32, dots: 0, units32: 1 };
  }
  return token;
}

/**
 * 用尽可能少的“更大时值” token 贪心分解 gapUnits32（用于休止符补齐）。
 * gapUnits32 可以为 0。
 */
export function splitGapIntoDurationTokens(
  gapUnits32: number
): VexflowDurationToken[] {
  if (!Number.isFinite(gapUnits32) || gapUnits32 < 0) {
    throw new Error(`gapUnits32 must be >= 0, got: ${gapUnits32}`);
  }

  const result: VexflowDurationToken[] = [];
  let remaining = gapUnits32;
  while (remaining > 0) {
    const token = pickLargestDurationToken(remaining);
    result.push(token);
    remaining -= token.units32;
  }
  return result;
}

