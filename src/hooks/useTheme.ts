import { useState } from "react";
import { themes, applyTheme, type Theme } from "../styles/themes";

const THEME_STORAGE_KEY = "drummer_theme";
const DEFAULT_THEME_NAME = "Dracula";

/**
 * 获取默认主题（Dracula）
 */
function getDefaultTheme(): Theme {
  const defaultTheme = themes.find((t) => t.name === DEFAULT_THEME_NAME);
  return defaultTheme || themes[0];
}

/**
 * 从 localStorage 加载主题
 */
function loadThemeFromStorage(): Theme {
  try {
    const savedThemeName = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedThemeName) {
      const theme = themes.find((t) => t.name === savedThemeName);
      if (theme) {
        return theme;
      }
    }
  } catch (error) {
    console.warn("Failed to load theme from localStorage:", error);
  }
  return getDefaultTheme();
}

/**
 * 保存主题到 localStorage
 */
function saveThemeToStorage(themeName: string): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeName);
  } catch (error) {
    console.warn("Failed to save theme to localStorage:", error);
  }
}

/**
 * 主题管理 Hook
 */
export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const theme = loadThemeFromStorage();
    // 立即应用主题
    applyTheme(theme);
    return theme;
  });

  // 切换到下一个主题（循环）
  const cycleTheme = () => {
    const currentIndex = themes.findIndex((t) => t.name === currentTheme.name);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    setCurrentTheme(nextTheme);
    applyTheme(nextTheme);
    saveThemeToStorage(nextTheme.name);
  };

  return {
    currentTheme,
    cycleTheme,
    themes,
  };
}
