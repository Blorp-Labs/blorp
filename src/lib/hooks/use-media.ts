import { useSyncExternalStore } from "react";
import _ from "lodash";

// mediaStore.ts
type Breakpoints = {
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
  xxl: boolean;
  maxSm: boolean;
  maxMd: boolean;
  maxLg: boolean;
  maxXl: boolean;
  maxXxl: boolean;
};

// 1) define your queries
const queries = {
  sm: "(min-width: 40rem)",
  md: "(min-width: 48rem)",
  lg: "(min-width: 64rem)",
  xl: "(min-width: 80rem)",
  xxl: "(min-width: 96rem)",
} as const;

const NO_MATCH = {
  matches: false,
};

// 2) create the MediaQueryList objects once
const mqls: Record<
  keyof typeof queries,
  Partial<MediaQueryList> & { matches: boolean }
> = {
  sm: _.isFunction(window.matchMedia)
    ? window.matchMedia(queries.sm)
    : NO_MATCH,
  md: _.isFunction(window.matchMedia)
    ? window.matchMedia(queries.md)
    : NO_MATCH,
  lg: _.isFunction(window.matchMedia)
    ? window.matchMedia(queries.lg)
    : NO_MATCH,
  xl: _.isFunction(window.matchMedia)
    ? window.matchMedia(queries.xl)
    : NO_MATCH,
  xxl: _.isFunction(window.matchMedia)
    ? window.matchMedia(queries.xxl)
    : NO_MATCH,
};

// 3) compute the full snapshot
function computeSnapshot(): Breakpoints {
  const bp = {
    sm: mqls.sm.matches,
    md: mqls.md.matches,
    lg: mqls.lg.matches,
    xl: mqls.xl.matches,
    xxl: mqls.xxl.matches,
  };
  return {
    ...bp,
    maxSm: !bp.sm,
    maxMd: !bp.md,
    maxLg: !bp.lg,
    maxXl: !bp.xl,
    maxXxl: !bp.xxl,
  };
}

// 4) keep one cached copy
let currentSnapshot = computeSnapshot();

// 5) listeners set
const listeners = new Set<() => void>();

// 7) attach all MQL change handlers once
for (const mql of Object.values(mqls)) {
  const onChange = () => {
    const next = computeSnapshot();
    // use lodash's deep-equal instead of your own shallowEqual
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
}

// 8) export subscribe & snapshot
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): Breakpoints {
  return currentSnapshot;
}

/**
 * useMedia
 *
 * A custom React hook that returns a set of boolean flags for responsive breakpoints,
 * based on the following widths:
 *   • sm   = viewport ≥ 40rem
 *   • md   = viewport ≥ 48rem
 *   • lg   = viewport ≥ 64rem
 *   • xl   = viewport ≥ 80rem
 *   • xxl  = viewport ≥ 96rem
 *
 * In addition to the “min-width” flags above, it also exposes their inverse:
 *   • maxSm   = viewport < 40rem
 *   • maxMd   = viewport < 48rem
 *   • maxLg   = viewport < 64rem
 *   • maxXl   = viewport < 80rem
 *   • maxXxl  = viewport < 96rem
 *
 * Under the hood this uses React’s `useSyncExternalStore` to:
 *   1. Register one global set of `matchMedia` listeners (no re-registration per component).
 *   2. Share a single snapshot object so components only re-render on real breakpoint flips.
 *
 * @example
 * function ResponsiveText() {
 *   const { sm, md, lg } = useMedia();
 *
 *   if (lg) {
 *     return <h1>Viewing on a large screen!</h1>;
 *   } else if (md) {
 *     return <h2>Medium-sized viewport detected.</h2>;
 *   } else if (sm) {
 *     return <h3>Small screen—mobile or tablet.</h3>;
 *   } else {
 *     return <p>Extra-small viewport.</p>;
 *   }
 * }
 *
 * @example
 * function LayoutSwitcher() {
 *   const { maxLg } = useMedia();
 *
 *   return (
 *     <div>
 *       {maxLg ? <MobileNavbar /> : <DesktopNavbar />}
 *       <MainContent />
 *     </div>
 *   );
 * }
 *
 * @example
 * // dynamic styling via inline styles or styled-components
 * function Card() {
 *   const { md } = useMedia();
 *   return (
 *     <div style={{ padding: md ? '2rem' : '1rem' }}>
 *       Responsive card padding!
 *     </div>
 *   );
 * }
 */
export function useMedia() {
  // React will call getSnapshot() once on mount, then re-call whenever subscribe fires
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
