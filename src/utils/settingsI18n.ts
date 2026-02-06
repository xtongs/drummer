import type { DrumType } from "../types";
import settingsCopyTranslations from "./settingsCopyTranslations.json";
import settingsDrumLabels from "./settingsDrumLabels.json";
import settingsGuideTranslations from "./settingsGuideTranslations.json";
import settingsLanguageOptions from "./settingsLanguageOptions.json";

export const SETTINGS_LANGUAGE_CODES = [
  "en",
  "zh-CN",
  "zh-TW",
  "ja",
  "ko",
  "fr",
  "de",
  "es",
  "pt",
  "it",
  "ru",
  "ar",
  "hi",
  "th",
  "vi",
  "id",
  "ms",
  "tr",
  "pl",
  "nl",
  "sv",
  "da",
  "fi",
  "no",
] as const;

export type SettingsLanguageCode = (typeof SETTINGS_LANGUAGE_CODES)[number];
export type SettingsLanguagePreference = "auto" | SettingsLanguageCode;

export interface SettingsCopy {
  modalTitle: string;
  tapHintShowSettings: string;
  languageLabel: string;
  autoLabel: string;
  introTitle: string;
  introDescription: string;
  privacyTitle: string;
  privacyItems: string[];
  termsTitle: string;
  termsItems: string[];
  sampleSelectionTitle: string;
  sampleSelectionDescription: string;
  statusChecking: string;
  statusDownloading: string;
  statusInstalling: string;
  statusActivating: string;
  statusLatestVersion: string;
}

export interface SettingsLanguageOption {
  code: SettingsLanguageCode;
  label: string;
}

export const SETTINGS_LANGUAGE_OPTIONS =
  settingsLanguageOptions as SettingsLanguageOption[];

const SETTINGS_COPY_DATA = settingsCopyTranslations as {
  default: SettingsCopy;
  translations: Record<SettingsLanguageCode, Partial<SettingsCopy>>;
};

const DEFAULT_SETTINGS_COPY = SETTINGS_COPY_DATA.default;
const SETTINGS_COPY = SETTINGS_COPY_DATA.translations;

const LANGUAGE_SET = new Set<SettingsLanguageCode>(SETTINGS_LANGUAGE_CODES);

export function isValidSettingsLanguage(
  value: string,
): value is SettingsLanguageCode {
  return LANGUAGE_SET.has(value as SettingsLanguageCode);
}

export function resolveSystemLanguage(
  systemLanguage: string,
): SettingsLanguageCode {
  const normalized = systemLanguage.trim().toLowerCase();

  if (normalized.startsWith("zh")) {
    if (
      normalized.includes("-tw") ||
      normalized.includes("-hk") ||
      normalized.includes("-mo") ||
      normalized.includes("hant")
    ) {
      return "zh-TW";
    }
    return "zh-CN";
  }

  if (normalized.startsWith("nb") || normalized.startsWith("nn")) {
    return "no";
  }

  const base = normalized.split("-")[0];
  if (isValidSettingsLanguage(base)) {
    return base;
  }

  return "en";
}

export function getResolvedLanguage(
  preference: SettingsLanguagePreference,
  systemLanguage = navigator.language,
): SettingsLanguageCode {
  return preference === "auto"
    ? resolveSystemLanguage(systemLanguage)
    : preference;
}

export function getSettingsCopy(
  preference: SettingsLanguagePreference,
  systemLanguage = navigator.language,
): SettingsCopy {
  const resolvedLanguage = getResolvedLanguage(preference, systemLanguage);
  return {
    ...DEFAULT_SETTINGS_COPY,
    ...(SETTINGS_COPY[resolvedLanguage] ?? SETTINGS_COPY.en),
  };
}

export function getLanguageLabel(code: SettingsLanguageCode): string {
  const option = SETTINGS_LANGUAGE_OPTIONS.find((item) => item.code === code);
  return option?.label ?? code;
}

export type SettingsGuideKey = keyof (typeof settingsGuideTranslations)["en"];

const GUIDE_TRANSLATIONS = settingsGuideTranslations as Record<
  SettingsLanguageCode,
  Partial<Record<SettingsGuideKey, string>>
>;

export function getSettingsGuideMap(
  preference: SettingsLanguagePreference,
  systemLanguage = navigator.language,
): Record<SettingsGuideKey, string> {
  const resolvedLanguage = getResolvedLanguage(preference, systemLanguage);
  return {
    ...GUIDE_TRANSLATIONS.en,
    ...(GUIDE_TRANSLATIONS[resolvedLanguage] ?? {}),
  } as Record<SettingsGuideKey, string>;
}

export function getSettingsGuideText(
  key: SettingsGuideKey,
  preference: SettingsLanguagePreference,
  systemLanguage = navigator.language,
): string {
  const guideMap = getSettingsGuideMap(preference, systemLanguage);
  return guideMap[key] ?? key;
}

const SETTINGS_DRUM_LABELS = settingsDrumLabels as {
  default: Record<DrumType, string>;
  translations: Partial<
    Record<SettingsLanguageCode, Partial<Record<DrumType, string>>>
  >;
};

const DEFAULT_DRUM_LABELS = SETTINGS_DRUM_LABELS.default;
const DRUM_LABELS_BY_LANGUAGE = SETTINGS_DRUM_LABELS.translations;

export function getLocalizedDrumLabel(
  drumType: DrumType,
  preference: SettingsLanguagePreference,
  systemLanguage = navigator.language,
): string {
  const resolvedLanguage = getResolvedLanguage(preference, systemLanguage);
  return (
    DRUM_LABELS_BY_LANGUAGE[resolvedLanguage]?.[drumType] ??
    DEFAULT_DRUM_LABELS[drumType]
  );
}
