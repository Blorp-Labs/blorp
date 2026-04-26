# Visual Snapshot Regression Investigation

## Affected Stories

Five Darwin (and Linux) visual snapshots changed in this PR:

- `visual-snapshots/darwin/components-posts-post--nsfw-red-gif.png`
- `visual-snapshots/darwin/components-posts-post--you-tube.png`
- `visual-snapshots/darwin/components-posts-post-overflow--long-cross-post-community.png`
- `visual-snapshots/darwin/components-posts-post-overflow--many-cross-posts.png`
- `visual-snapshots/darwin/components-virtual-list--small-post-feed.png`

Each changed from showing a dark circle with "0" text (community avatar fallback) to a solid light-gray circle (placeholder image).

---

## Root Cause

### The cache prefix mechanism

`getCachePrefixer()` in `src/stores/auth.ts` builds a prefix from the current account:

```ts
let prefix = "";
if (account?.uuid) prefix += `${account.uuid}_`;
if (account?.instance) prefix += `${account.instance}_`;
if (account?.jwt) prefix += "authed_";
```

Community data is stored in and retrieved from the Zustand communities store using this prefixed key. A community cached under prefix X is invisible to a lookup using prefix Y.

### How community data gets into the store

`src/components/communities/community-banner.stories.tsx` and `community-card.stories.tsx` both call:

```ts
await waitForHydration(useAuth, useCommunitiesStore);
const prefixer = useAuth.getState().getCachePrefixer();
useCommunitiesStore
  .getState()
  .cacheCommunity(prefixer, { communityView: COMMUNITY });
```

`COMMUNITY = api.getCommunity()` — which returns `handle: "0@blorpblorp.xyz"` and `icon: "https://picsum.photos/id/12/200/200"`.

They do **not** call `updateSelectedAccount`. They use whatever auth state is currently in IndexedDB.

### Before this PR

Story execution order (alphabetical by file path):

1. `community-banner.stories.tsx` — **first story**, no prior auth state
2. `community-card.stories.tsx`
3. `post-*.stories.tsx`

Community-banner ran with a fresh account from `INIT_STATE`: uuid set, instance set, **but no JWT**. Prefix = `{uuid}_{instance}_` (no `"authed_"`).

Community "0@blorpblorp.xyz" was cached at `{uuid}_{instance}_0@blorpblorp.xyz`.

Post stories then called `updateSelectedAccount({ jwt: "123" })`, making the prefix `{uuid}_{instance}_authed_`. Lookup key = `{uuid}_{instance}_authed_0@blorpblorp.xyz` — **no match**. Community not found → `AvatarImage src={undefined}` → `AvatarFallback` shows "0".

### After this PR

New comment stories were added under `src/components/comments/`, which sorts **before** `src/components/communities/`. New execution order:

1. `post-comment-overflow.stories.tsx` ← NEW
2. `post-comment-state.stories.tsx` ← NEW
3. `post-comment.stories.tsx` ← NEW
4. `community-banner.stories.tsx`
5. `community-card.stories.tsx`
6. `post-*.stories.tsx`

The comment stories call `updateSelectedAccount({ site: api.getSite(), jwt: "story-jwt" })`. This persists auth with a JWT to IndexedDB before community stories run.

Community-banner then calls `waitForHydration(useAuth, ...)`, loading **the auth set by the comment stories** — uuid, instance, and `jwt="story-jwt"`. Prefix = `{uuid}_{instance}_authed_`.

Community "0@blorpblorp.xyz" is now cached at `{uuid}_{instance}_authed_0@blorpblorp.xyz`.

Post stories call `updateSelectedAccount({ jwt: "123" })`. Same uuid, same instance, JWT changes but still truthy — prefix is still `{uuid}_{instance}_authed_`. Lookup **matches**. Community found.

### Why the avatar changes

`post-byline.tsx` reads:

```tsx
const community = useCommunityFromStore(post.communityHandle);
// ...
<AvatarImage src={community?.communityView.icon ?? undefined} />
<AvatarFallback>{communityName?.substring(0, 1).toUpperCase()}</AvatarFallback>
```

When `community` is found (icon = picsum URL), `AvatarImage` loads the image. `visual.spec.ts` intercepts all non-localhost image requests and serves a solid light-gray PNG. Image loads successfully → `AvatarFallback` is hidden.

When community is not found, `src={undefined}` → `AvatarFallback` shows "0".

---

## Why Only 5 Stories

Post story `loadData` functions call `waitForHydration(useAuth, usePostsStore, useProfilesStore, useFlairsStore)` but **not** `useCommunitiesStore`. So communities store starts fresh in memory on each `page.goto()` and auto-hydrates from IndexedDB asynchronously when first accessed.

For most stories (simple text/image posts), the initial render completes before the async IndexedDB read finishes. `storyRendered` fires, screenshot is taken, community is still `undefined` → "0" shown.

For the 5 affected stories, rendering takes slightly longer due to extra work:

| Story                    | Extra work                                        |
| ------------------------ | ------------------------------------------------- |
| `YouTube`                | YouTube embed component rendering                 |
| `NsfwRedGif`             | RedGif embed + NSFW blur logic                    |
| `LongCrossPostCommunity` | `detailView: true` → cross-posts row rendered     |
| `ManyCrossPosts`         | `detailView: true` → 10 cross-post rows rendered  |
| `SmallPostFeed`          | Virtual list rendering many `PostCard` components |

By the time these stories finish their initial render, the IndexedDB hydration has already completed. The component gets the community on first access → image loads → "0" hidden.

This is consistent (not flaky) because the rendering complexity reliably exceeds the IndexedDB read time.

---

## Fix

Set `icon: null` in `getCommunity()` in `test-utils/api.ts`:

```ts
export function getCommunity(overrides?: ...): Schemas.Community {
  return {
    // ...
    icon: null,  // was: 'https://picsum.photos/id/12/200/200'
    // ...
  };
}
```

No external icon URL → `AvatarImage src={undefined}` always → `AvatarFallback` always shows "0" regardless of whether the community is in the store. Snapshots stabilize.

# Manually recreate bug

ANY post story (not just the 5), because there's no async hydration race — it's already in memory.

Steps:

1. Open any comment story — e.g. Comments / PostComment / ParentMissingMiddleChild

- This calls updateSelectedAccount({ jwt: "story-jwt" }) → auth now has a JWT

2. Open Communities / CommunityCard / Card

- This calls cacheCommunity(prefixer, ...) with the now-authed prefix
- Community "0@blorpblorp.xyz" with picsum icon is now in the store

3. Open any post story — e.g. Posts / Post / TextLarge

- useCommunityFromStore("0@blorpblorp.xyz") finds the community (already in memory)
- Avatar shows light-gray circle instead of "0"

Contrast: If you skip step 1 and go straight to step 2, the community gets cached WITHOUT the authed* prefix. Step 3 then calls updateSelectedAccount which adds authed* to the prefix →
mismatch → community not found → "0" shows correctly.
