import { describe, expect, it } from "vitest";
import settingsCopyTranslations from "./settingsCopyTranslations.json";
import settingsDrumLabels from "./settingsDrumLabels.json";
import settingsGuideTranslations from "./settingsGuideTranslations.json";
import settingsLanguageOptions from "./settingsLanguageOptions.json";
import { SETTINGS_LANGUAGE_CODES } from "./settingsI18n";

describe("settingsI18n consistency", () => {
  it("language options should match supported language codes", () => {
    const optionCodes = settingsLanguageOptions.map((item) => item.code).sort();
    const supportedCodes = [...SETTINGS_LANGUAGE_CODES].sort();
    expect(optionCodes).toEqual(supportedCodes);
  });

  it("guide translations should include all supported languages and complete keys", () => {
    const guide = settingsGuideTranslations as Record<
      string,
      Record<string, string>
    >;
    const guideLanguages = Object.keys(guide).sort();
    const supportedCodes = [...SETTINGS_LANGUAGE_CODES].sort();

    expect(guideLanguages).toEqual(supportedCodes);

    const enKeys = Object.keys(guide.en);
    supportedCodes.forEach((code) => {
      enKeys.forEach((key) => {
        expect(guide[code][key]).toBeDefined();
      });
    });
  });

  it("settings copy translations should include all supported languages and complete keys", () => {
    const copy = settingsCopyTranslations as {
      default: Record<string, string | string[]>;
      translations: Record<string, Record<string, string | string[]>>;
    };
    const translationLanguages = Object.keys(copy.translations).sort();
    const supportedCodes = [...SETTINGS_LANGUAGE_CODES].sort();

    expect(translationLanguages).toEqual(supportedCodes);

    const requiredKeys = Object.keys(copy.default);
    supportedCodes.forEach((code) => {
      const merged = { ...copy.default, ...(copy.translations[code] ?? {}) };
      requiredKeys.forEach((key) => {
        expect(merged[key]).toBeDefined();
      });
    });
  });

  it("drum label translations should be valid and keyed by supported languages", () => {
    const drumLabels = settingsDrumLabels as {
      default: Record<string, string>;
      translations: Record<string, Record<string, string>>;
    };

    const defaultDrumKeys = Object.keys(drumLabels.default);
    const supported = new Set(SETTINGS_LANGUAGE_CODES);

    Object.keys(drumLabels.translations).forEach((code) => {
      expect(
        supported.has(code as (typeof SETTINGS_LANGUAGE_CODES)[number]),
      ).toBe(true);
      Object.keys(drumLabels.translations[code]).forEach((drumKey) => {
        expect(defaultDrumKeys.includes(drumKey)).toBe(true);
      });
    });
  });
});
