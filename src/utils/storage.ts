import type { Pattern, StorageData } from "../types";

const STORAGE_KEY = "drummer-app-data";

/**
 * 从localStorage加载数据
 */
export function loadStorageData(): StorageData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
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

