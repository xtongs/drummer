import { useSyncExternalStore } from "react";
import {
  subscribeLandscapeMode,
  getLandscapeMode,
} from "../utils/landscapeMode";

export function useLandscapeMode(): boolean {
  return useSyncExternalStore(
    subscribeLandscapeMode,
    getLandscapeMode,
    () => false,
  );
}
