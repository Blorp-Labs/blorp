import { useSyncExternalStore } from "react";
import _ from "lodash";
import { useSettingsStore } from "@/src/stores/settings";

/**
 * Reduce Motion media query
 */
const QUERY = "(prefers-reduced-motion: reduce)";

const NO_MATCH = {
  matches: false,
};

// 1) Create MediaQueryList once
const mql: Partial<MediaQueryList> & { matches: boolean } = _.isFunction(
  window.matchMedia,
)
  ? window.matchMedia(QUERY)
  : NO_MATCH;

// 2) Snapshot type
type ReducedMotionSnapshot = {
  reduceMotion: boolean;
};

// 3) Compute snapshot
function computeSnapshot(): ReducedMotionSnapshot {
  return {
    reduceMotion: mql.matches,
  };
}

// 4) Cached snapshot
let currentSnapshot = computeSnapshot();

// 5) Listeners
const listeners = new Set<() => void>();

// 6) Attach listener once
const onChange = () => {
  const next = computeSnapshot();
  if (!_.isEqual(next, currentSnapshot)) {
    currentSnapshot = next;
    listeners.forEach((cb) => cb());
  }
};

if (mql.addEventListener) {
  mql.addEventListener("change", onChange);
} else if (_.isFunction(mql.addListener)) {
  mql.addListener(onChange);
}

// 7) Subscribe API
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// 8) Snapshot getter
function getSnapshot(): ReducedMotionSnapshot {
  return currentSnapshot;
}

/**
 * useReducedMotion
 *
 * React hook that returns whether the user has enabled
 * “Reduce Motion” at the OS / accessibility level.
 *
 * Works in:
 *  • iOS (Settings → Accessibility → Reduce Motion)
 *  • Android (Remove animations)
 *  • Web / Desktop OS
 *
 * @example
 * const { reduceMotion } = useReducedMotion();
 *
 * if (reduceMotion) {
 *   disableAnimations();
 * }
 */
export function useReducedMotionSystemSetting(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).reduceMotion;
}

export function useReducedMotion(): boolean {
  const fromSystem = useReducedMotionSystemSetting();
  const fromSettings = useSettingsStore((s) => s.reduceMotion);
  return fromSettings || fromSystem;
}
