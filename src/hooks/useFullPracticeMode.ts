import { useSyncExternalStore } from "react";
import {
  subscribeFullPracticeMode,
  getFullPracticeMode,
} from "../utils/fullPracticeMode";

export function useFullPracticeMode(): boolean {
  return useSyncExternalStore(
    subscribeFullPracticeMode,
    getFullPracticeMode,
    () => false,
  );
}
