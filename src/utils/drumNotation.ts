import type { DrumType } from "../types";
import { DRUM_NOTATION } from "./constants";

/**
 * 计算符号在五线谱上的Y坐标
 * @param line 相对中间线的位置（-2到2）
 * @param staffHeight 五线谱总高度（未使用，保留以兼容）
 * @param staffTop 五线谱顶部位置
 * @param lineSpacing 线间距
 */
export function getSymbolY(
  line: number,
  staffHeight: number,
  staffTop: number,
  lineSpacing: number
): number {
  // 五线谱有5条线，中间线是第3条（索引2）
  // 第1条线（最下）在 staffTop + 0 * lineSpacing
  // 第3条线（中间）在 staffTop + 2 * lineSpacing
  const middleLine = staffTop + 2 * lineSpacing;
  return middleLine + line * lineSpacing;
}

/**
 * 获取鼓件的符号信息
 */
export function getDrumNotation(drum: DrumType) {
  return DRUM_NOTATION[drum];
}

