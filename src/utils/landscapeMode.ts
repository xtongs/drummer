const PHONE_MAX_WIDTH = 960;

let isLandscapeMode = false;
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

function evaluateLandscapeMode(): boolean {
  return getIsLandscape() && getIsPhoneWidth() && getIsTouchDevice();
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function setLandscapeMode(nextValue: boolean) {
  if (isLandscapeMode === nextValue) return;
  isLandscapeMode = nextValue;
  notifyListeners();
}

function handleViewportChange() {
  setLandscapeMode(evaluateLandscapeMode());
}

function ensureInitialized() {
  if (isInitialized || typeof window === "undefined") return;

  isLandscapeMode = evaluateLandscapeMode();

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

export function getLandscapeMode(): boolean {
  ensureInitialized();
  return isLandscapeMode;
}

export function subscribeLandscapeMode(listener: () => void): () => void {
  ensureInitialized();
  listeners.add(listener);
  setLandscapeMode(evaluateLandscapeMode());
  return () => listeners.delete(listener);
}
