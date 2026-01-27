import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "./useTheme";
import { themes } from "../styles/themes";

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset CSS variables
    document.documentElement.style.removeProperty("--bg-color");
    document.documentElement.style.removeProperty("--card-bg");
    document.documentElement.style.removeProperty("--color-text");
    document.documentElement.style.removeProperty("--color-primary");
    document.documentElement.style.removeProperty("--theme-color");
  });

  it("loads default theme when no saved theme exists", () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.currentTheme.name).toBe("Dracula");
    expect(result.current.themes).toEqual(themes);
  });

  it("loads saved theme from localStorage", () => {
    localStorage.setItem("drummer-theme", "One");

    const { result } = renderHook(() => useTheme());

    expect(result.current.currentTheme.name).toBe("One");
  });

  it("applies theme to CSS variables on initial load", () => {
    const { result } = renderHook(() => useTheme());

    const theme = result.current.currentTheme;
    expect(document.documentElement.style.getPropertyValue("--bg-color")).toBe(
      theme.colors.bgColor,
    );
    expect(document.documentElement.style.getPropertyValue("--color-text")).toBe(
      theme.colors.text,
    );
  });

  it("applies theme to CSS variables when theme changes", () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.currentTheme.name).toBe("Dracula");

    act(() => {
      result.current.cycleTheme();
    });

    expect(result.current.currentTheme.name).toBe("One");
    expect(document.documentElement.style.getPropertyValue("--bg-color")).toBe(
      themes[1].colors.bgColor,
    );
  });

  it("cycles through all themes", () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.currentTheme.name).toBe("Dracula");

    // Cycle to second theme
    act(() => {
      result.current.cycleTheme();
    });
    expect(result.current.currentTheme.name).toBe("One");

    // Cycle to third theme
    act(() => {
      result.current.cycleTheme();
    });
    expect(result.current.currentTheme.name).toBe("Gruvbox");

    // Cycle to fourth theme
    act(() => {
      result.current.cycleTheme();
    });
    expect(result.current.currentTheme.name).toBe("Monokai");

    // Cycle to fifth theme
    act(() => {
      result.current.cycleTheme();
    });
    expect(result.current.currentTheme.name).toBe("Campbell");

    // Continue cycling through remaining themes
    act(() => {
      result.current.cycleTheme();
    });
    expect(result.current.currentTheme.name).toBe("Solarized");

    act(() => {
      result.current.cycleTheme();
    });
    expect(result.current.currentTheme.name).toBe("Nord");

    act(() => {
      result.current.cycleTheme();
    });
    expect(result.current.currentTheme.name).toBe("Night");

    act(() => {
      result.current.cycleTheme();
    });
    expect(result.current.currentTheme.name).toBe("Rose");

    act(() => {
      result.current.cycleTheme();
    });
    expect(result.current.currentTheme.name).toBe("Yellow");

    // Cycle back to first theme
    act(() => {
      result.current.cycleTheme();
    });
    expect(result.current.currentTheme.name).toBe("Dracula");
  });

  it("saves selected theme to localStorage", () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.cycleTheme();
    });

    expect(localStorage.getItem("drummer-theme")).toBe("One");

    act(() => {
      result.current.cycleTheme();
    });

    expect(localStorage.getItem("drummer-theme")).toBe("Gruvbox");
  });

  it("handles localStorage errors gracefully", () => {
    // Mock localStorage.getItem to throw error
    const originalGetItem = localStorage.getItem;
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    localStorage.getItem = vi.fn(() => {
      throw new Error("localStorage access denied");
    });

    const { result } = renderHook(() => useTheme());

    // Should fall back to default theme
    expect(result.current.currentTheme.name).toBe("Dracula");
    expect(consoleWarnSpy).toHaveBeenCalled();

    // Restore original
    localStorage.getItem = originalGetItem;
    consoleWarnSpy.mockRestore();
  });

  it("handles invalid saved theme name", () => {
    localStorage.setItem("drummer-theme", "NonexistentTheme");

    const { result } = renderHook(() => useTheme());

    // Should fall back to default theme
    expect(result.current.currentTheme.name).toBe("Dracula");
  });

  it("sets theme-color meta tag", () => {
    const { result } = renderHook(() => useTheme());

    const themeColor = document.documentElement.style.getPropertyValue(
      "--theme-color",
    );

    expect(themeColor).toBe(result.current.currentTheme.colors.bgColor);
  });

  it("applies all theme color CSS variables", () => {
    const { result } = renderHook(() => useTheme());

    const colors = result.current.currentTheme.colors;

    // Check primary colors
    expect(document.documentElement.style.getPropertyValue("--bg-color")).toBe(
      colors.bgColor,
    );
    expect(document.documentElement.style.getPropertyValue("--card-bg")).toBe(
      colors.cardBg,
    );
    expect(document.documentElement.style.getPropertyValue("--color-text")).toBe(
      colors.text,
    );

    // Check functional colors
    expect(document.documentElement.style.getPropertyValue("--color-primary")).toBe(
      colors.primary,
    );
    expect(document.documentElement.style.getPropertyValue("--color-secondary")).toBe(
      colors.secondary,
    );
    expect(document.documentElement.style.getPropertyValue("--color-danger")).toBe(
      colors.danger,
    );

    // Check special effects
    expect(document.documentElement.style.getPropertyValue("--glass-bg")).toBe(
      colors.glassBg,
    );
    expect(document.documentElement.style.getPropertyValue("--grid-border")).toBe(
      colors.gridBorder,
    );
    expect(document.documentElement.style.getPropertyValue("--color-beat-line")).toBe(
      colors.beatLine,
    );
  });
});
