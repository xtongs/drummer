/**
 * 主题类型定义
 */
export interface Theme {
  name: string;
  colors: {
    // 基础颜色
    bgColor: string;
    cardBg: string;
    bgSecondary: string;
    text: string;
    textSecondary: string;
    textDim: string;
    textTertiary: string;
    border: string;

    // 主题色
    primary: string;
    primaryHover: string;
    secondary: string;
    active: string;
    activeBg: string;
    accentGlow: string;

    // 功能色
    danger: string;
    dangerHover: string;
    warning: string;
    warningHover: string;

    // 特殊效果
    glassBg: string;
    glassBgHover: string;
    glassBorder: string;
    overlayBg: string;
    gridBorder: string;
    gridCellBg: string;
    gridCellBgAlt: string;

    // 节拍线
    beatLine: string;
  };
}

/**
 * Dracula 主题（默认）
 * 来源: https://draculatheme.com/
 */
export const draculaTheme: Theme = {
  name: "Dracula",
  colors: {
    bgColor: "#282a36",
    cardBg: "#44475a",
    bgSecondary: "#21222c",
    text: "#f8f8f2",
    textSecondary: "#6272a4",
    textDim: "#6272a4",
    textTertiary: "#6272a4",
    border: "rgba(139, 233, 253, 0.3)",
    primary: "#bd93f9",
    primaryHover: "#ff79c6",
    secondary: "#50fa7b",
    active: "#50fa7b",
    activeBg: "rgba(80, 250, 123, 0.2)",
    accentGlow: "rgba(189, 147, 249, 0.3)",
    danger: "#ff5555",
    dangerHover: "#ff6e6e",
    warning: "#f2f28c",
    warningHover: "#ffb86c",
    glassBg: "rgba(68, 71, 90, 0.5)",
    glassBgHover: "rgba(68, 71, 90, 0.7)",
    glassBorder: "rgba(139, 233, 253, 0.3)",
    overlayBg: "rgba(40, 42, 54, 0.9)",
    gridBorder: "rgba(139, 233, 253, 0.2)",
    gridCellBg: "#1a3a2a",
    gridCellBgAlt: "#1a3a2a94",
    beatLine: "#8be9fd",
  },
};

/**
 * One Dark 主题
 * 来源: Atom 编辑器默认主题
 */
export const oneDarkTheme: Theme = {
  name: "One",
  colors: {
    bgColor: "#282c34",
    cardBg: "#21252b",
    bgSecondary: "#1e2227",
    text: "#c6cedd",
    textSecondary: "#8c96a8",
    textDim: "#6c768e",
    textTertiary: "#586178",
    border: "rgba(171, 178, 191, 0.2)",
    primary: "#61afef",
    primaryHover: "#7aa6f2",
    secondary: "#98c379",
    active: "#98c379",
    activeBg: "rgba(152, 195, 121, 0.2)",
    accentGlow: "rgba(97, 175, 239, 0.3)",
    danger: "#e06c75",
    dangerHover: "#ff6b7a",
    warning: "#d19a66",
    warningHover: "#e5c07b",
    glassBg: "rgba(33, 37, 43, 0.6)",
    glassBgHover: "rgba(33, 37, 43, 0.8)",
    glassBorder: "rgba(171, 178, 191, 0.2)",
    overlayBg: "rgba(40, 44, 52, 0.9)",
    gridBorder: "rgba(171, 178, 191, 0.15)",
    gridCellBg: "#1f252d",
    gridCellBgAlt: "#1f252d94",
    beatLine: "#61afef",
  },
};

/**
 * Gruvbox Dark 主题
 * 来源: morhetz/gruvbox
 * 与 Solarized 齐名的经典配色方案
 */
export const gruvboxDarkTheme: Theme = {
  name: "Gruvbox",
  colors: {
    bgColor: "#282828",
    cardBg: "#3c3836",
    bgSecondary: "#1d2021",
    text: "#ebdbb2",
    textSecondary: "#928374",
    textDim: "#7c6f64",
    textTertiary: "#5a5047",
    border: "rgba(235, 219, 178, 0.2)",
    primary: "#fe8019",
    primaryHover: "#d65e0e",
    secondary: "#b8bb26",
    active: "#b8bb26",
    activeBg: "rgba(184, 187, 38, 0.2)",
    accentGlow: "rgba(254, 128, 25, 0.3)",
    danger: "#fb4934",
    dangerHover: "#cc241d",
    warning: "#fabd2f",
    warningHover: "#d79921",
    glassBg: "rgba(60, 56, 54, 0.6)",
    glassBgHover: "rgba(60, 56, 54, 0.8)",
    glassBorder: "rgba(235, 219, 178, 0.2)",
    overlayBg: "rgba(40, 40, 40, 0.9)",
    gridBorder: "rgba(235, 219, 178, 0.15)",
    gridCellBg: "#1d2021",
    gridCellBgAlt: "#1d202194",
    beatLine: "#fe8019",
  },
};

/**
 * Monokai 主题
 * 来源: 经典的 Monokai 文本编辑器配色方案
 * 高对比度设计，适合长时间编码
 */
export const monokaiTheme: Theme = {
  name: "Monokai",
  colors: {
    bgColor: "#272822",
    cardBg: "#3e3d32",
    bgSecondary: "#1e1f1a",
    text: "#f8f8f2",
    textSecondary: "#a6a69c",
    textDim: "#75715e",
    textTertiary: "#5a594f",
    border: "rgba(248, 248, 242, 0.2)",
    primary: "#a6e22e",
    primaryHover: "#66d9ef",
    secondary: "#f92672",
    active: "#a6e22e",
    activeBg: "rgba(166, 226, 46, 0.2)",
    accentGlow: "rgba(249, 38, 114, 0.3)",
    danger: "#f92672",
    dangerHover: "#fe4e8e",
    warning: "#e6db74",
    warningHover: "#f1e8a0",
    glassBg: "rgba(62, 61, 50, 0.7)",
    glassBgHover: "rgba(62, 61, 50, 0.85)",
    glassBorder: "rgba(248, 248, 242, 0.15)",
    overlayBg: "rgba(39, 40, 34, 0.92)",
    gridBorder: "rgba(248, 248, 242, 0.12)",
    gridCellBg: "#2a2b26",
    gridCellBgAlt: "#23241e",
    beatLine: "#66d9ef",
  },
};

/**
 * Campbell 主题
 * 来源: Windows Terminal 默认配色
 * 微软风格的传统终端配色，适合系统管理
 */
export const campbellTheme: Theme = {
  name: "Campbell",
  colors: {
    bgColor: "#000",
    cardBg: "#1f1f1f",
    bgSecondary: "#080808",
    text: "#cccccc",
    textSecondary: "#a0a0a0",
    textDim: "#767676",
    textTertiary: "#5c5c5c",
    border: "rgba(204, 204, 204, 0.25)",
    primary: "#3a96dd",
    primaryHover: "#5cb3ff",
    secondary: "#13a10e",
    active: "#13a10e",
    activeBg: "rgba(19, 161, 14, 0.2)",
    accentGlow: "rgba(58, 150, 221, 0.3)",
    danger: "#c50f1f",
    dangerHover: "#e81123",
    warning: "#c19c00",
    warningHover: "#d9b812",
    glassBg: "rgba(31, 31, 31, 0.8)",
    glassBgHover: "rgba(31, 31, 31, 0.92)",
    glassBorder: "rgba(204, 204, 204, 0.15)",
    overlayBg: "rgba(12, 12, 12, 0.95)",
    gridBorder: "rgba(204, 204, 204, 0.1)",
    gridCellBg: "#121212",
    gridCellBgAlt: "#0a0a0a",
    beatLine: "#3a96dd",
  },
};

/**
 * Solarized Dark 主题
 * 来源: Ethan Schoonover 的经典配色方案
 * 基于科学设计的色彩系统，对比度恒定
 */
export const solarizedDarkTheme: Theme = {
  name: "Solarized",
  colors: {
    bgColor: "#002b36",
    cardBg: "#073642",
    bgSecondary: "#001e26",
    text: "#839496",
    textSecondary: "#657b83",
    textDim: "#586e75",
    textTertiary: "#2aa198",
    border: "rgba(131, 148, 150, 0.3)",
    primary: "#268bd2",
    primaryHover: "#2aa198",
    secondary: "#859900",
    active: "#859900",
    activeBg: "rgba(133, 153, 0, 0.2)",
    accentGlow: "rgba(38, 139, 210, 0.25)",
    danger: "#dc322f",
    dangerHover: "#cb4b16",
    warning: "#b58900",
    warningHover: "#d33682",
    glassBg: "rgba(7, 54, 66, 0.75)",
    glassBgHover: "rgba(7, 54, 66, 0.88)",
    glassBorder: "rgba(147, 161, 161, 0.2)",
    overlayBg: "rgba(0, 43, 54, 0.93)",
    gridBorder: "rgba(147, 161, 161, 0.15)",
    gridCellBg: "#093e48",
    gridCellBgAlt: "#062f36",
    beatLine: "#268bd2",
  },
};

/**
 * Nord 主题
 * 来源: articicestudio/nord
 * 基于北极光的冷色调配色，宁静专注
 */
export const nordTheme: Theme = {
  name: "Nord",
  colors: {
    bgColor: "#2e3440",
    cardBg: "#3b4252",
    bgSecondary: "#242933",
    text: "#d8dee9",
    textSecondary: "#a3be8c",
    textDim: "#7b88a1",
    textTertiary: "#4c566a",
    border: "rgba(216, 222, 233, 0.2)",
    primary: "#88c0d0",
    primaryHover: "#8fbcbb",
    secondary: "#a3be8c",
    active: "#a3be8c",
    activeBg: "rgba(163, 190, 140, 0.2)",
    accentGlow: "rgba(136, 192, 208, 0.25)",
    danger: "#bf616a",
    dangerHover: "#d08770",
    warning: "#ebcb8b",
    warningHover: "#eacb8b",
    glassBg: "rgba(59, 66, 82, 0.7)",
    glassBgHover: "rgba(59, 66, 82, 0.85)",
    glassBorder: "rgba(129, 161, 193, 0.2)",
    overlayBg: "rgba(46, 52, 64, 0.92)",
    gridBorder: "rgba(129, 161, 193, 0.15)",
    gridCellBg: "#353b49",
    gridCellBgAlt: "#2d3340",
    beatLine: "#88c0d0",
  },
};

/**
 * Tokyo Night 主题
 * 来源: folke/tokyonight.nvim
 * 现代霓虹都市风格，模拟东京夜景
 */
export const tokyoNightTheme: Theme = {
  name: "Night",
  colors: {
    bgColor: "#1a1b26",
    cardBg: "#24283b",
    bgSecondary: "#16161e",
    text: "#c0caf5",
    textSecondary: "#a9b1d6",
    textDim: "#737aa2",
    textTertiary: "#565f89",
    border: "rgba(192, 202, 245, 0.2)",
    primary: "#7aa2f7",
    primaryHover: "#7dcfff",
    secondary: "#9ece6a",
    active: "#9ece6a",
    activeBg: "rgba(158, 206, 106, 0.2)",
    accentGlow: "rgba(122, 162, 247, 0.25)",
    danger: "#f7768e",
    dangerHover: "#db4b4b",
    warning: "#e0af68",
    warningHover: "#ff9e64",
    glassBg: "rgba(36, 40, 59, 0.75)",
    glassBgHover: "rgba(36, 40, 59, 0.88)",
    glassBorder: "rgba(187, 154, 247, 0.2)",
    overlayBg: "rgba(26, 27, 38, 0.93)",
    gridBorder: "rgba(169, 177, 214, 0.12)",
    gridCellBg: "#1f2335",
    gridCellBgAlt: "#1a1e2e",
    beatLine: "#7aa2f7",
  },
};

/**
 * Rose Pine 主题
 * 来源: rose-pine/rose-pine-theme
 * 优雅的低饱和度粉紫色调，极简主义设计
 */
export const rosePineTheme: Theme = {
  name: "Rose",
  colors: {
    bgColor: "#191724",
    cardBg: "#26233a",
    bgSecondary: "#131118",
    text: "#e0def4",
    textSecondary: "#c4a7e7",
    textDim: "#908caa",
    textTertiary: "#6e6a7e",
    border: "rgba(224, 222, 244, 0.2)",
    primary: "#c4a7e7",
    primaryHover: "#9ccfd8",
    secondary: "#3e8fb0",
    active: "#3e8fb0",
    activeBg: "rgba(62, 143, 176, 0.2)",
    accentGlow: "rgba(196, 167, 231, 0.2)",
    danger: "#eb6f92",
    dangerHover: "#f08ba3",
    warning: "#f6c177",
    warningHover: "#fad5a0",
    glassBg: "rgba(38, 35, 58, 0.75)",
    glassBgHover: "rgba(38, 35, 58, 0.88)",
    glassBorder: "rgba(196, 167, 231, 0.15)",
    overlayBg: "rgba(25, 23, 36, 0.93)",
    gridBorder: "rgba(156, 207, 216, 0.12)",
    gridCellBg: "#1f1d2e",
    gridCellBgAlt: "#171520",
    beatLine: "#c4a7e7",
  },
};

/**
 * Warm Yellow 主题
 * 来源: 柔和的暖色调设计
 * 模拟纸张的温暖色调，减少眼部疲劳
 */
export const warmYellowTheme: Theme = {
  name: "Yellow",
  colors: {
    bgColor: "#2b2620",
    cardBg: "#3a332a",
    bgSecondary: "#1f1b17",
    text: "#f2e6d4",
    textSecondary: "#d4c4b0",
    textDim: "#a89b8a",
    textTertiary: "#7a6f61",
    border: "rgba(242, 230, 212, 0.2)",
    primary: "#7fb3d5",
    primaryHover: "#5dade2",
    secondary: "#a5d6a7",
    active: "#a5d6a7",
    activeBg: "rgba(165, 214, 167, 0.2)",
    accentGlow: "rgba(127, 179, 213, 0.25)",
    danger: "#e67e22",
    dangerHover: "#f39c12",
    warning: "#f9d784",
    warningHover: "#ffe082",
    glassBg: "rgba(58, 51, 42, 0.75)",
    glassBgHover: "rgba(58, 51, 42, 0.88)",
    glassBorder: "rgba(242, 230, 212, 0.15)",
    overlayBg: "rgba(43, 38, 32, 0.93)",
    gridBorder: "rgba(242, 230, 212, 0.12)",
    gridCellBg: "#2e2822",
    gridCellBgAlt: "#26201b",
    beatLine: "#7fb3d5",
  },
};

/**
 * 所有主题列表
 */
export const themes: Theme[] = [
  draculaTheme,
  oneDarkTheme,
  gruvboxDarkTheme,
  monokaiTheme,
  campbellTheme,
  solarizedDarkTheme,
  nordTheme,
  tokyoNightTheme,
  rosePineTheme,
  warmYellowTheme,
];

/**
 * 应用主题到 CSS 变量
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const colors = theme.colors;

  root.style.setProperty("--bg-color", colors.bgColor);
  root.style.setProperty("--card-bg", colors.cardBg);
  root.style.setProperty("--color-bg-secondary", colors.bgSecondary);
  root.style.setProperty("--color-text", colors.text);
  root.style.setProperty("--color-text-secondary", colors.textSecondary);
  root.style.setProperty("--color-text-dim", colors.textDim);
  root.style.setProperty("--color-text-tertiary", colors.textTertiary);
  root.style.setProperty("--color-border", colors.border);
  root.style.setProperty("--color-primary", colors.primary);
  root.style.setProperty("--color-primary-hover", colors.primaryHover);
  root.style.setProperty("--color-secondary", colors.secondary);
  root.style.setProperty("--color-active", colors.active);
  root.style.setProperty("--color-active-bg", colors.activeBg);
  root.style.setProperty("--accent-glow", colors.accentGlow);
  root.style.setProperty("--color-danger", colors.danger);
  root.style.setProperty("--color-danger-hover", colors.dangerHover);
  root.style.setProperty("--color-warning", colors.warning);
  root.style.setProperty("--color-warning-hover", colors.warningHover);
  root.style.setProperty("--glass-bg", colors.glassBg);
  root.style.setProperty("--glass-bg-hover", colors.glassBgHover);
  root.style.setProperty("--glass-border", colors.glassBorder);
  root.style.setProperty("--overlay-bg", colors.overlayBg);
  root.style.setProperty("--grid-border", colors.gridBorder);
  root.style.setProperty("--grid-cell-bg", colors.gridCellBg);
  root.style.setProperty("--grid-cell-bg-alt", colors.gridCellBgAlt);
  root.style.setProperty("--color-beat-line", colors.beatLine);
  root.style.setProperty("--theme-color", colors.bgColor);
}
