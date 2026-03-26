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
  selector: 'MemberExpression[property.name="accountIndex"]',
  message: "accountIndex is deprecated. Use getSelectedAccount() instead.",
};

export const restrictions = [noDirectSelectedUuid, noAccountIndex];
