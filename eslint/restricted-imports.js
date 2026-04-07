// Restricted import patterns for no-restricted-imports rule.
// Each entry explains *why* the import is banned so reviewers
// can judge edge cases without digging through git history.

/**
 * getCachePrefixer imported directly is unbounded — it has no knowledge of
 * the currently selected account and will silently write to the wrong cache
 * if called without an explicit account argument.
 *
 * The hook-bound version via useAuth((s) => s.getCachePrefixer) is
 * automatically scoped to the selected account and should be used in
 * all React contexts.
 *
 * The only legitimate use of the raw import is when explicitly iterating
 * over multiple accounts (e.g. useRefreshAuth), where each cache write
 * must be scoped to a specific account passed as an argument. Those sites
 * should carry an eslint-disable-next-line comment explaining the intent.
 */
const noDirectGetCachePrefixer = {
  patterns: [
    {
      group: ["**/stores/auth"],
      importNames: ["getCachePrefixer"],
      message:
        "Don't import getCachePrefixer directly. Use useAuth((s) => s.getCachePrefixer) instead — the hook-bound version is scoped to the selected account automatically.",
    },
  ],
};

/**
 * Bare-dot imports (`from "."`) resolve through a barrel index file, which
 * makes it easy to accidentally import across folder-boundary rules and creates
 * ambiguity about which module is actually being used. Import the specific
 * file directly instead.
 */
const noBarrelDotImport = {
  paths: [
    {
      name: ".",
      message: 'Import from the specific file instead of the barrel ".".',
    },
  ],
};

export const importRestrictions = {
  paths: [...noBarrelDotImport.paths],
  patterns: [...noDirectGetCachePrefixer.patterns],
};
