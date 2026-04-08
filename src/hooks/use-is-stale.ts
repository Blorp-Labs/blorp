import { useEffect, useState } from "react";

/**
 * Returns true when the given dataUpdatedAt timestamp is older than staleMs,
 * and schedules a state update to flip to true once the threshold is reached.
 * When dataUpdatedAt is 0 (never fetched), it is considered stale immediately.
 */
export function useIsStale(
  // WARNING: do not spread or destructure the query object at the call site —
  // TanStack Query warns against it. We destructure only dataUpdatedAt here,
  // which is safe because useIsStale owns that read.
  query: { dataUpdatedAt: number },
  staleMs: number,
): boolean {
  const dataUpdatedAt = query?.dataUpdatedAt ?? 0;

  const [isStale, setIsStale] = useState(
    () => dataUpdatedAt === 0 || Date.now() - dataUpdatedAt >= staleMs,
  );

  useEffect(() => {
    if (dataUpdatedAt === 0) {
      setIsStale(true);
      return;
    }
    const elapsed = Date.now() - dataUpdatedAt;
    if (elapsed >= staleMs) {
      setIsStale(true);
      return;
    }
    setIsStale(false);
    const timer = setTimeout(() => setIsStale(true), staleMs - elapsed);
    return () => clearTimeout(timer);
  }, [dataUpdatedAt, staleMs]);

  return isStale;
}
