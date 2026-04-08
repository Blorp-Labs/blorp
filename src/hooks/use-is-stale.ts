import { useEffect, useState } from "react";

/**
 * Returns true when the given dataUpdatedAt timestamp is older than staleMs,
 * and schedules a state update to flip to true once the threshold is reached.
 * When dataUpdatedAt is 0 (never fetched), it is considered stale immediately.
 *
 * Staleness is computed synchronously on every render rather than via useState
 * to avoid a one-render-cycle lag: if useState held the stale flag, it would
 * remain true for one extra render after dataUpdatedAt updates (posts just
 * loaded) because useEffect runs after paint. The [, setTick] state exists
 * solely to trigger a re-render when the timer fires.
 */
export function useIsStale(
  // WARNING: do not spread or destructure the query object at the call site —
  // TanStack Query warns against it. We destructure only dataUpdatedAt here,
  // which is safe because useIsStale owns that read.
  query: { dataUpdatedAt: number },
  staleMs: number,
): boolean {
  const dataUpdatedAt = query?.dataUpdatedAt ?? 0;

  // Unused beyond triggering a re-render when the timer fires.
  const [, setTick] = useState(0);

  useEffect(() => {
    if (dataUpdatedAt === 0) {
      return;
    }
    const elapsed = Date.now() - dataUpdatedAt;
    if (elapsed >= staleMs) {
      return;
    }
    const timer = setTimeout(() => setTick((n) => n + 1), staleMs - elapsed);
    return () => clearTimeout(timer);
  }, [dataUpdatedAt, staleMs]);

  return dataUpdatedAt === 0 || Date.now() - dataUpdatedAt >= staleMs;
}
