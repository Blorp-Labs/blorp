import { usePathname } from "@/src/routing/hooks";
import { RoutePath } from "@/src/routing/routes";
import { useCallback, useEffect, useRef } from "react";

function normalizePath(p: string) {
  return p.replace(/\/$/, "");
}

export function useIsActiveRoute(route?: RoutePath) {
  const pathname = usePathname();
  const snapshot = useRef(pathname);
  if (route) {
    return normalizePath(route) === normalizePath(pathname);
  }
  return normalizePath(snapshot.current) === normalizePath(pathname);
}

/**
 * Returns a stable function that checks whether the route is active
 * at call time. Useful inside timeouts/callbacks where a reactive
 * boolean would be stale.
 */
export function useGetIsActiveRoute() {
  const pathname = usePathname();
  const snapshotRef = useRef(pathname);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  return useCallback(
    () =>
      normalizePath(snapshotRef.current) === normalizePath(pathnameRef.current),
    [],
  );
}

export function useHideTabBarOnMount() {
  const isActive = useIsActiveRoute();
  useEffect(() => {
    if (isActive) {
      const tabBar = () => document.querySelector("ion-tab-bar");
      // add a CSS class to the root element
      tabBar()?.classList.add("hidden");
      return () => {
        // clean up when this component unmounts
        tabBar()?.classList.remove("hidden");
      };
    }
  }, [isActive]);
}
