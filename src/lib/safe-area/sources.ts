import { SafeArea, SafeAreaInsets } from "capacitor-plugin-safe-area";
import { isIos } from "../device";

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
  let probe: HTMLDivElement | null = null;

  const ensureProbe = () => {
    if (probe && probe.isConnected) {
      return probe;
    }
    probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = [
      "position: fixed",
      "top: 0",
      "left: 0",
      "width: 0",
      "height: 0",
      "visibility: hidden",
      "pointer-events: none",
      "padding-top: env(safe-area-inset-top)",
      "padding-right: env(safe-area-inset-right)",
      "padding-bottom: env(safe-area-inset-bottom)",
      "padding-left: env(safe-area-inset-left)",
    ].join(";");
    document.body.appendChild(probe);
    return probe;
  };

  const toPx = (raw: string) => {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  };

  const read = (): Insets => {
    const el = ensureProbe();
    const cs = getComputedStyle(el);
    return {
      top: toPx(cs.paddingTop),
      right: toPx(cs.paddingRight),
      bottom: toPx(cs.paddingBottom),
      left: toPx(cs.paddingLeft),
    };
  };

  return {
    get: () => Promise.resolve(read()),
    subscribe: (cb) => {
      const fire = () => cb(read());
      window.addEventListener("resize", fire);
      let vvCleanup: (() => void) | undefined;
      const vv = window.visualViewport;
      if (isIos() && vv) {
        vv.addEventListener("resize", fire);
        vv.addEventListener("scroll", fire);
        vvCleanup = () => {
          vv.removeEventListener("resize", fire);
          vv.removeEventListener("scroll", fire);
        };
      }
      return () => {
        window.removeEventListener("resize", fire);
        vvCleanup?.();
      };
    },
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
