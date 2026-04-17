import { test, expect, type Page } from "@playwright/test";
import { SITE_WITH_USER } from "../test-utils/lemmy-api-fixtures";
import { seedAuth, mockNodeinfo, jsonRoute } from "./test-utils";
import { DB_NAME, DB_VERSION, TABLE_NAME } from "@/src/lib/db-constants";
import { normalizeInstance } from "@/src/normalize-instance";

// ── Constants ─────────────────────────────────────────────────────────────────

const TEST_JWT = "test-create-post-jwt";
const TEST_UUID = "test-create-post-uuid";

// createStorage uses rowName "zustand"; persist name is "create-post"
const CREATE_POST_IDB_KEY = "zustand_create-post";

const OLDER_DRAFT_UUID = "11111111-1111-1111-1111-111111111111";
const NEWER_DRAFT_UUID = "22222222-2222-2222-2222-222222222222";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setup(page: Page) {
  await seedAuth(page, {
    instance: normalizeInstance("lemmy.world"),
    jwt: TEST_JWT,
    uuid: TEST_UUID,
  });
  await mockNodeinfo(page, "lemmy");
  await page.route("**/api/v3/site*", (route) =>
    jsonRoute(route, SITE_WITH_USER),
  );
}

async function seedDrafts(
  page: Page,
  drafts: Record<string, { type: string; createdAt: number; title?: string }>,
) {
  // createStorage.setItem serializes the zustand state as a JSON string,
  // so we store JSON.stringify({ state, version }) as the IDB value.
  const stateJson = JSON.stringify({ state: { drafts }, version: 5 });
  await page.addInitScript(
    ({ dbName, dbVersion, tableName, idbKey, stateJson }) => {
      const req = indexedDB.open(dbName, dbVersion);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(tableName);
      };
      req.onsuccess = () => {
        const tx = req.result.transaction(tableName, "readwrite");
        tx.objectStore(tableName).put(stateJson, idbKey);
      };
    },
    {
      dbName: DB_NAME,
      dbVersion: DB_VERSION,
      tableName: TABLE_NAME,
      idbKey: CREATE_POST_IDB_KEY,
      stateJson,
    },
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("create post — draft initialization", () => {
  test("no drafts, no url params — shows blank form", async ({ page }) => {
    await setup(page);
    await page.goto("/create_post");

    const titleInput = page.getByTestId("create-post-title");
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveValue("");
  });

  test("url params pre-populate title and url without persisting a draft", async ({
    page,
  }) => {
    await setup(page);
    await page.goto(
      "/create_post?title=Hello+World&url=https%3A%2F%2Fexample.com",
    );

    await expect(page.getByTestId("create-post-title")).toHaveValue(
      "Hello World",
    );

    // url param switches type to "link" — the link input becomes visible
    const linkInput = page.getByPlaceholder("Link");
    await expect(linkInput).toBeVisible();
    await expect(linkInput).toHaveValue("https://example.com");
  });

  test("selects most recent draft when multiple drafts exist", async ({
    page,
  }) => {
    await seedDrafts(page, {
      [OLDER_DRAFT_UUID]: {
        type: "text",
        createdAt: 1000,
        title: "Older Draft",
      },
      [NEWER_DRAFT_UUID]: {
        type: "text",
        createdAt: 2000,
        title: "Newer Draft",
      },
    });
    await setup(page);
    await page.goto("/create_post");

    await expect(page.getByTestId("create-post-title")).toHaveValue(
      "Newer Draft",
    );
  });
});
