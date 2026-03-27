import type { Page, Route } from "@playwright/test";
import type { AuthStoreData } from "@/src/stores/auth";
import { DB_NAME, DB_VERSION, TABLE_NAME } from "@/src/lib/db-constants";

// The zustand persist middleware stores keys as `${rowName}_${persistName}`.
// createStorage() uses rowName "zustand" and the auth store uses name "auth".
const AUTH_IDB_KEY = "zustand_auth";

/**
 * Seeds the Zustand auth store's IndexedDB entry before the app initialises,
 * so that isLoggedIn() returns true on first render.
 */
/** Fulfills a route with a JSON response and permissive CORS headers. */
export async function jsonRoute(
  route: Route,
  body: unknown,
  status = 200,
): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

/** Mocks the nodeinfo endpoint so the app detects the instance as piefed. */
export async function mockNodeinfo(page: Page) {
  await page.route("**/nodeinfo/2.1*", (route) =>
    jsonRoute(route, { software: { name: "piefed", version: "1.6.0" } }),
  );
}

export async function seedAuth(
  page: Page,
  account: AuthStoreData["accounts"][number],
) {
  const authState = {
    state: {
      accounts: [account],
      selectedUuid: account.uuid,
    } satisfies AuthStoreData,
    version: 0,
  };

  await page.addInitScript(
    ({ dbName, dbVersion, tableName, idbKey, authStateJson }) => {
      const req = indexedDB.open(dbName, dbVersion);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(tableName);
      };
      req.onsuccess = () => {
        const tx = req.result.transaction(tableName, "readwrite");
        tx.objectStore(tableName).put(authStateJson, idbKey);
      };
    },
    {
      dbName: DB_NAME,
      dbVersion: DB_VERSION,
      tableName: TABLE_NAME,
      idbKey: AUTH_IDB_KEY,
      authStateJson: JSON.stringify(authState),
    },
  );
}
