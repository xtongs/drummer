import type { Pattern, StorageData, CellState } from "../types";
import { CELL_OFF, CELL_NORMAL } from "../types";

const STORAGE_KEY = "drummer-app-data";

/**
 * 迁移旧版 boolean grid 到新版 CellState grid
 * 旧版: boolean[][] (true/false)
 * 新版: CellState[][] (0/1/2)
 */
function migrateGrid(grid: (boolean | CellState)[][]): CellState[][] {
  return grid.map((row) =>
    row.map((cell) => {
      // 如果是 boolean，转换为 CellState
      if (typeof cell === "boolean") {
        return cell ? CELL_NORMAL : CELL_OFF;
      }
      // 已经是 CellState，直接返回
      return cell as CellState;
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
