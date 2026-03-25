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

export const restrictions = [noDirectSelectedUuid];
