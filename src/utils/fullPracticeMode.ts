const PHONE_MAX_WIDTH = 960;

let isFullPracticeMode = false;
const listeners = new Set<() => void>();
let isInitialized = false;

function getIsLandscape(): boolean {
  if (typeof window === "undefined") return false;

  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(orientation: landscape)").matches;
  }

  return window.innerWidth > window.innerHeight;
}

function getIsPhoneWidth(): boolean {
  if (typeof window === "undefined") return false;

  if (typeof window.matchMedia === "function") {
    return window.matchMedia(`(max-width: ${PHONE_MAX_WIDTH}px)`).matches;
  }

  return window.innerWidth <= PHONE_MAX_WIDTH;
}

function getIsTouchDevice(): boolean {
  if (typeof window === "undefined") return false;

  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(pointer: coarse)").matches;
  }

  if (typeof navigator !== "undefined") {
    return (navigator as Navigator).maxTouchPoints > 0;
  }

  return false;
}

function evaluateFullPracticeMode(): boolean {
  return getIsLandscape() && getIsPhoneWidth() && getIsTouchDevice();
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function setFullPracticeMode(nextValue: boolean) {
  if (isFullPracticeMode === nextValue) return;
  isFullPracticeMode = nextValue;
  notifyListeners();
}

function handleViewportChange() {
  setFullPracticeMode(evaluateFullPracticeMode());
}

function ensureInitialized() {
  if (isInitialized || typeof window === "undefined") return;

  isFullPracticeMode = evaluateFullPracticeMode();

  window.addEventListener("resize", handleViewportChange);
  window.addEventListener("orientationchange", handleViewportChange);

  if (typeof window.matchMedia === "function") {
    const mediaQuery = window.matchMedia(
      `(max-width: ${PHONE_MAX_WIDTH}px) and (orientation: landscape)`,
    );
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleViewportChange);
    } else {
      const legacyMediaQuery = mediaQuery as MediaQueryList & {
        addListener?: (listener: () => void) => void;
      };
      legacyMediaQuery.addListener?.(handleViewportChange);
    }
  }

  isInitialized = true;
}

export function getFullPracticeMode(): boolean {
  ensureInitialized();
  return isFullPracticeMode;
}

export function subscribeFullPracticeMode(listener: () => void): () => void {
  ensureInitialized();
  listeners.add(listener);
  setFullPracticeMode(evaluateFullPracticeMode());
  return () => listeners.delete(listener);
}
