const FULL_PRACTICE_MODE_KEY = "drummer-full-practice-mode";

let isFullPracticeMode = false;
const listeners = new Set<() => void>();
let isInitialized = false;

function loadStoredValue(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(FULL_PRACTICE_MODE_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "boolean" ? parsed : false;
  } catch {
    return false;
  }
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function setFullPracticeMode(nextValue: boolean) {
  ensureInitialized();
  if (isFullPracticeMode === nextValue) return;
  isFullPracticeMode = nextValue;
  if (typeof window !== "undefined") {
    localStorage.setItem(FULL_PRACTICE_MODE_KEY, JSON.stringify(nextValue));
  }
  notifyListeners();
}

function ensureInitialized() {
  if (isInitialized || typeof window === "undefined") return;

  isFullPracticeMode = loadStoredValue();

  isInitialized = true;
}

export function getFullPracticeMode(): boolean {
  ensureInitialized();
  return isFullPracticeMode;
}

export function toggleFullPracticeMode(): void {
  setFullPracticeMode(!isFullPracticeMode);
}

export function subscribeFullPracticeMode(listener: () => void): () => void {
  ensureInitialized();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
