import type {
  Pattern,
  StorageData,
  CellState,
  CrossPatternLoop,
} from "../types";
import {
  CELL_OFF,
  CELL_NORMAL,
  CELL_GHOST,
  CELL_GRACE,
  CELL_DOUBLE_32,
  CELL_FIRST_32,
  CELL_SECOND_32,
} from "../types";

const STORAGE_KEY = "drummer-app-data";
const METRONOME_BPM_KEY = "drummer-metronome-bpm";
const CROSS_PATTERN_LOOP_KEY = "drummer-cross-pattern-loop";

/**
 * 迁移旧版 boolean grid 到新版 CellState grid
 * 旧版: boolean[][] (true/false)
 * 新版: CellState[][] (0/1/2)
 */
const VALID_CELL_STATES = new Set<CellState>([
  CELL_OFF,
  CELL_NORMAL,
  CELL_GHOST,
  CELL_GRACE,
  CELL_DOUBLE_32,
  CELL_FIRST_32,
  CELL_SECOND_32,
]);

function migrateGrid(grid: (boolean | CellState | number)[][]): CellState[][] {
  return grid.map((row) =>
    row.map((cell) => {
      // 如果是 boolean，转换为 CellState
      if (typeof cell === "boolean") {
        return cell ? CELL_NORMAL : CELL_OFF;
      }
      // 如果是数字，验证是否在允许范围
      if (typeof cell === "number") {
        return VALID_CELL_STATES.has(cell as CellState)
          ? (cell as CellState)
          : CELL_OFF;
      }
      // 其它未知类型降级为关闭
      return CELL_OFF;
    })
  );
}

/**
 * 迁移单个节奏型
 */
function migratePattern(pattern: Pattern): Pattern {
  // 检查 grid 是否需要迁移
  if (
    pattern.grid.length > 0 &&
    pattern.grid[0].length > 0 &&
    typeof pattern.grid[0][0] === "boolean"
  ) {
    return {
      ...pattern,
      grid: migrateGrid(pattern.grid),
    };
  }
  return pattern;
}

/**
 * 从localStorage加载数据
 */
export function loadStorageData(): StorageData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data) as StorageData;
      // 迁移所有节奏型
      parsed.patterns = parsed.patterns.map(migratePattern);
      return parsed;
    }
  } catch (error) {
    console.error("Failed to load storage data:", error);
  }
  return {
    patterns: [],
  };
}

/**
 * 保存数据到localStorage
 */
export function saveStorageData(data: StorageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save storage data:", error);
  }
}

/**
 * 保存节奏型
 */
export function savePattern(pattern: Pattern): void {
  const data = loadStorageData();
  const existingIndex = data.patterns.findIndex((p) => p.id === pattern.id);

  if (existingIndex >= 0) {
    // 更新现有节奏型
    data.patterns[existingIndex] = pattern;
  } else {
    // 添加新节奏型
    data.patterns.push(pattern);
  }

  saveStorageData(data);
}

/**
 * 加载所有节奏型
 */
export function loadPatterns(): Pattern[] {
  const data = loadStorageData();
  return data.patterns;
}

/**
 * 删除节奏型
 */
export function deletePattern(patternId: string): void {
  const data = loadStorageData();
  data.patterns = data.patterns.filter((p) => p.id !== patternId);

  // 如果删除的是当前选中的节奏型，清除currentPatternId
  if (data.currentPatternId === patternId) {
    data.currentPatternId = undefined;
  }

  saveStorageData(data);
}

/**
 * 获取当前选中的节奏型ID
 */
export function getCurrentPatternId(): string | undefined {
  const data = loadStorageData();
  return data.currentPatternId;
}

/**
 * 设置当前选中的节奏型ID
 */
export function setCurrentPatternId(patternId: string | undefined): void {
  const data = loadStorageData();
  data.currentPatternId = patternId;
  saveStorageData(data);
}

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 保存节拍器 BPM
 */
export function saveMetronomeBPM(bpm: number): void {
  try {
    localStorage.setItem(METRONOME_BPM_KEY, String(bpm));
  } catch (error) {
    console.error("Failed to save metronome BPM:", error);
  }
}

/**
 * 加载节拍器 BPM
 */
export function loadMetronomeBPM(): number | null {
  try {
    const bpm = localStorage.getItem(METRONOME_BPM_KEY);
    if (bpm) {
      const parsed = parseInt(bpm, 10);
      if (!isNaN(parsed) && parsed >= 20 && parsed <= 300) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Failed to load metronome BPM:", error);
  }
  return null;
}

/**
 * 保存跨 Pattern 循环范围
 */
export function saveCrossPatternLoop(loop: CrossPatternLoop | undefined): void {
  try {
    if (loop === undefined) {
      localStorage.removeItem(CROSS_PATTERN_LOOP_KEY);
    } else {
      localStorage.setItem(CROSS_PATTERN_LOOP_KEY, JSON.stringify(loop));
    }
  } catch (error) {
    console.error("Failed to save cross pattern loop:", error);
  }
}

/**
 * 加载跨 Pattern 循环范围
 */
export function loadCrossPatternLoop(): CrossPatternLoop | undefined {
  try {
    const data = localStorage.getItem(CROSS_PATTERN_LOOP_KEY);
    if (data) {
      const parsed = JSON.parse(data) as CrossPatternLoop;
      // 验证数据格式
      if (
        typeof parsed === "object" &&
        typeof parsed.startPatternName === "string" &&
        typeof parsed.startBar === "number" &&
        typeof parsed.endPatternName === "string" &&
        typeof parsed.endBar === "number" &&
        parsed.startBar >= 0 &&
        parsed.endBar >= 0
      ) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Failed to load cross pattern loop:", error);
  }
  return undefined;
}

/**
 * 验证 Pattern 数据是否合法
 * 用于从剪贴板导入时验证数据格式
 */
export function validatePattern(data: unknown): data is Pattern {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const pattern = data as Record<string, unknown>;

  // 验证必需字段存在且类型正确
  if (typeof pattern.id !== "string" || pattern.id.length === 0) {
    return false;
  }

  if (typeof pattern.name !== "string" || pattern.name.length === 0) {
    return false;
  }

  if (
    typeof pattern.bpm !== "number" ||
    pattern.bpm < 20 ||
    pattern.bpm > 300
  ) {
    return false;
  }

  if (
    !Array.isArray(pattern.timeSignature) ||
    pattern.timeSignature.length !== 2 ||
    typeof pattern.timeSignature[0] !== "number" ||
    typeof pattern.timeSignature[1] !== "number"
  ) {
    return false;
  }

  if (
    typeof pattern.bars !== "number" ||
    pattern.bars < 1 ||
    pattern.bars > 100
  ) {
    return false;
  }

  // 验证 grid
  if (!Array.isArray(pattern.grid)) {
    return false;
  }

  // 验证 grid 的每一行
  for (const row of pattern.grid) {
    if (!Array.isArray(row)) {
      return false;
    }
    for (const cell of row) {
      if (
        typeof cell !== "number" ||
        !VALID_CELL_STATES.has(cell as CellState)
      ) {
        return false;
      }
    }
  }

  // 验证 drums
  if (!Array.isArray(pattern.drums)) {
    return false;
  }

  for (const drum of pattern.drums) {
    if (typeof drum !== "string") {
      return false;
    }
  }

  // 验证时间戳
  if (
    typeof pattern.createdAt !== "number" ||
    typeof pattern.updatedAt !== "number"
  ) {
    return false;
  }

  // 验证可选的 loopRange
  if (pattern.loopRange !== undefined) {
    if (
      !Array.isArray(pattern.loopRange) ||
      pattern.loopRange.length !== 2 ||
      typeof pattern.loopRange[0] !== "number" ||
      typeof pattern.loopRange[1] !== "number"
    ) {
      return false;
    }
  }

  return true;
}

/**
 * 从 JSON 字符串解析 Pattern
 * 如果解析失败或数据无效，返回 null
 */
export function parsePatternFromJSON(jsonString: string): Pattern | null {
  try {
    const data = JSON.parse(jsonString);
    if (validatePattern(data)) {
      return data;
    }
  } catch {
    // JSON 解析失败
  }
  return null;
}

/**
 * 将 Pattern 序列化为 JSON 字符串
 */
export function serializePatternToJSON(pattern: Pattern): string {
  return JSON.stringify(pattern);
}

/**
 * 获取下一个可用的 Pattern 名称（A-Z）
 * @param existingPatterns - 现有的 patterns 列表
 * @returns 下一个可用的字母（A-Z）
 */
export function getNextPatternName(existingPatterns: Pattern[]): string {
  const existingLetters = existingPatterns
    .map((p) => p.name)
    .filter((name) => /^[A-Z]$/.test(name));

  let nextLetter = "A";
  if (existingLetters.length > 0) {
    // 找出已使用的字母，获取下一个
    const usedCodes = existingLetters.map((l) => l.charCodeAt(0));
    const maxCode = Math.max(...usedCodes);
    // 如果还没超过 Z，使用下一个字母
    if (maxCode < 90) {
      // 90 = 'Z'.charCodeAt(0)
      nextLetter = String.fromCharCode(maxCode + 1);
    } else {
      // 如果已经到 Z，找第一个未使用的字母
      for (let code = 65; code <= 90; code++) {
        // 65 = 'A'.charCodeAt(0)
        if (!usedCodes.includes(code)) {
          nextLetter = String.fromCharCode(code);
          break;
        }
      }
    }
  }

  return nextLetter;
}
