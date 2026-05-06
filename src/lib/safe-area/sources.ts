import { SafeArea, SafeAreaInsets } from "capacitor-plugin-safe-area";

export type Insets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export const ZERO_INSETS: Insets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

export type InsetSource = {
  get: () => Promise<Insets>;
  subscribe: (cb: (insets: Insets) => void) => () => void;
};

export function createNativeSource(): InsetSource {
  return {
    get: () =>
      SafeArea.getSafeAreaInsets().then((r: SafeAreaInsets) => r.insets),
    subscribe: (cb) => {
      const handle = SafeArea.addListener(
        "safeAreaChanged",
        (r: SafeAreaInsets) => cb(r.insets),
      );
      return () => {
        handle.then((h) => h.remove());
      };
    },
  };
}

export function createWebEnvSource(): InsetSource {
  // PR1 will replace this with a hidden-div + getComputedStyle reader.
  return {
    get: () => Promise.resolve(ZERO_INSETS),
    subscribe: () => () => {},
  };
}

export function createManualSource(
  initial: Insets = ZERO_INSETS,
): InsetSource & {
  set: (insets: Insets) => void;
} {
  let current = initial;
  const subs = new Set<(insets: Insets) => void>();
  return {
    get: () => Promise.resolve(current),
    subscribe: (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    set: (insets) => {
      current = insets;
      for (const cb of subs) {
        cb(insets);
      }
    },
  };
}
