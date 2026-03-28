// Shared IndexedDB constants used by the app and e2e tests.
// This file must have no imports so it is safe to load in both browser and
// Node.js (Playwright) contexts.
export const DB_NAME = "lemmy-db";
export const DB_VERSION = 1;
export const TABLE_NAME = "lemmy-store";
