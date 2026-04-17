import { useCallback, useLayoutEffect, useRef } from "react";

// Potentially we might want to replace this with
// https://reactuse.com, which has this and a bunth of
// other helpful hooks
export function useEvent<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: Parameters<T>) => ref.current(...args), []) as T;
}
