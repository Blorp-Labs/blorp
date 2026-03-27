// Restricted syntax patterns for no-restricted-syntax rule.
// Each entry explains *why* the pattern is banned so reviewers
// can judge edge cases without digging through git history.

/**
 * selectedUuid is internal to the auth store. External consumers should
 * use getSelectedAccount() which handles fallback logic when selectedUuid
 * is stale (e.g. after another tab logs out the selected account).
 *
 * See docs/decisions/2026-03-24-auth-store-persistence-and-multi-tab-sync.md
 */
const noDirectSelectedUuid = {
  selector: 'MemberExpression[property.name="selectedUuid"]',
  message:
    "Don't access selectedUuid directly. Use getSelectedAccount() instead — " +
    "it handles fallback when selectedUuid points to a removed account.",
};

/**
 * accountIndex is deprecated — it is kept in the v5 store schema only so that
 * a v4 app can still parse the persisted data without throwing on downgrade.
 * All selection logic uses selectedUuid / getSelectedAccount() instead.
 */
const noAccountIndex = {
  selector: 'MemberExpression[computed=false][property.name="accountIndex"]',
  message: "accountIndex is deprecated. Use getSelectedAccount() instead.",
};

/**
 * Direct computed lookups into store cache maps bypass the selector hooks that
 * encapsulate getCachePrefixer() and should not be used outside of the store
 * files themselves.
 *
 * Pattern banned: usePostsStore(s => s.posts[anything])
 * Use usePostFromStore() instead.
 */
const noDirectPostsLookup = {
  selector:
    "CallExpression[callee.name='usePostsStore'] MemberExpression[computed=true][object.property.name='posts']",
  message: "Don't index into s.posts directly. Use usePostFromStore() instead.",
};

/**
 * Pattern banned: useCommentsStore(s => s.comments[anything])
 * Use useCommentsByPaths() instead.
 */
const noDirectCommentsLookup = {
  selector:
    "CallExpression[callee.name='useCommentsStore'] MemberExpression[computed=true][object.property.name='comments']",
  message:
    "Don't index into s.comments directly. Use useCommentsByPaths() instead.",
};

/**
 * Pattern banned: useCommunitiesStore(s => s.communities[anything])
 * Use useCommunityFromStore() or useCommunitiesFromStore() instead.
 */
const noDirectCommunitiesLookup = {
  selector:
    "CallExpression[callee.name='useCommunitiesStore'] MemberExpression[computed=true][object.property.name='communities']",
  message:
    "Don't index into s.communities directly. Use useCommunityFromStore() or useCommunitiesFromStore() instead.",
};

/**
 * Pattern banned: useProfilesStore(s => s.profiles[anything])
 * Use useProfileFromStore() instead.
 */
const noDirectProfilesLookup = {
  selector:
    "CallExpression[callee.name='useProfilesStore'] MemberExpression[computed=true][object.property.name='profiles']",
  message:
    "Don't index into s.profiles directly. Use useProfileFromStore() instead.",
};

/**
 * Pattern banned: useFlairsStore(s => s.flairs[anything])
 * Use useFlairs() instead.
 */
const noDirectFlairsLookup = {
  selector:
    "CallExpression[callee.name='useFlairsStore'] MemberExpression[computed=true][object.property.name='flairs']",
  message: "Don't index into s.flairs directly. Use useFlairs() instead.",
};

/**
 * Pattern banned: useMultiCommunityFeedStore(s => s.feeds[anything])
 * Use useMultiCommunityFeedFromStore() or useMultiCommunityFeedsFromStore() instead.
 */
const noDirectFeedsLookup = {
  selector:
    "CallExpression[callee.name='useMultiCommunityFeedStore'] MemberExpression[computed=true][object.property.name='feeds']",
  message:
    "Don't index into s.feeds directly. Use useMultiCommunityFeedFromStore() or useMultiCommunityFeedsFromStore() instead.",
};

export const restrictions = [
  noDirectSelectedUuid,
  noAccountIndex,
  noDirectPostsLookup,
  noDirectCommentsLookup,
  noDirectCommunitiesLookup,
  noDirectProfilesLookup,
  noDirectFlairsLookup,
  noDirectFeedsLookup,
];
