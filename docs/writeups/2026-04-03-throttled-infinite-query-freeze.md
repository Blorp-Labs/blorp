# Throttled Infinite Query Freeze

## Problem

Users reported that comments on post pages would appear frozen — showing nothing until a hard refresh.

## Root Causes

### Bug 1 (Primary — comments freeze): Stale `lastResolvedAt` after navigation

`PriorityThrottledQueue` initializes `lastResolvedAt = Date.now() - interval` in its constructor so the first task runs immediately. But `clear()` — called on component unmount — never reset it.

When a user navigated away from a post and came back within 5 seconds, the queue restarted with a stale `lastResolvedAt`. The comments query task would sit in the queue silently waiting out the remainder of the throttle window (up to ~5 seconds) before executing. From the user's perspective, the page appeared frozen.

**Fix:** Reset `lastResolvedAt = Date.now() - interval` inside `clear()` so each new mount starts fresh.

---

### Bug 2 (Secondary — posts feed freeze): `addWarmedKey` called before `await queryFn`

`useThrottledInfiniteQuery` with `reduceAutomaticRefetch: true` tracks whether a key has been fetched via a Zustand `warmedKeys` store. Once warmed, `refetchOnMount` is set to `false` to prevent jarring feed refreshes.

The bug: `addWarmedKey(queryKeyStr)` was called **before** `await queryFn(ctx)`. If the fetch failed or was aborted mid-flight (e.g., navigating away), the key was permanently marked as warmed. On the next mount, `refetchOnMount: false` suppressed the auto-refetch entirely — the feed froze.

**Fix:** Move `addWarmedKey` to after `await queryFn(ctx)` succeeds, so only completed fetches mark a key as warmed.

## Changes

| File                                             | Change                                        |
| ------------------------------------------------ | --------------------------------------------- |
| `src/lib/throttle-queue.ts`                      | `clear()` now resets `lastResolvedAt`         |
| `src/tanstack-query/throttled-infinite-query.ts` | `addWarmedKey` moved to after `await queryFn` |
