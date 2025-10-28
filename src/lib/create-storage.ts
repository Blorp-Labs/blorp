import { openDB } from "idb";
import { load } from "@tauri-apps/plugin-store";
import { isTauri } from "./device";
import _ from "lodash";
import pRetry from "p-retry";
import { AsyncThrottler } from "@tanstack/pacer";

const DB_VERSION = 1;
const DB_NAME = "lemmy-db";
const TABLE_NAME = "lemmy-store";

export const runTauriSecurityFix = () => {
  if (isTauri()) {
    console.log("Running tauri security fix...");
    pRetry(
      async () => {
        const store = await load(DB_NAME);

        const idb = await openDB(DB_NAME, DB_VERSION, {
          upgrade(db) {
            // Check if the store exists, and create it if not
            if (!db.objectStoreNames.contains(TABLE_NAME)) {
              db.createObjectStore(TABLE_NAME);
            }
          },
        });

        let migrated = false;

        try {
          for (const key of await store.keys()) {
            const value = await store.get(key);
            if (value) {
              idb.put(TABLE_NAME, value, key);
              migrated = true;
            }
          }
        } finally {
          await store.reset();
          await store.save();
          if (migrated) {
            location.reload();
          }
        }
      },
      {
        retries: 10,
      },
    );
  }
};

function createIdb(rowName: string) {
  function getDb() {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Check if the store exists, and create it if not
        if (!db.objectStoreNames.contains(TABLE_NAME)) {
          db.createObjectStore(TABLE_NAME);
        }
      },
    });
  }

  const getThrottledSet = _.memoize((key: string) => {
    return new AsyncThrottler(
      async (value: string) => {
        const db = await getDb();
        await db.put(TABLE_NAME, value, `${rowName}_${key}`);
      },
      {
        wait: 2000,
        leading: true,
      },
    );
  });

  return {
    async getItem(key: string): Promise<string | null> {
      const db = await getDb();
      return await db.get(TABLE_NAME, `${rowName}_${key}`);
    },

    async setItem(key: string, value: string): Promise<void> {
      const set = getThrottledSet(key);
      await set.maybeExecute(value);
    },

    async removeItem(key: string): Promise<void> {
      const set = getThrottledSet(key);
      set.cancel();
      const db = await getDb();
      await db.delete(TABLE_NAME, `${rowName}_${key}`);
    },

    async getRowSize(): Promise<number> {
      const db = await getDb();
      const tx = db.transaction(TABLE_NAME, "readonly");
      const store = tx.objectStore(TABLE_NAME);
      const keys = await store.getAllKeys(); // Get all keys

      let totalSize = 0;

      for (const key of keys) {
        if (typeof key === "string" && key.startsWith(`${rowName}_`)) {
          const value = await store.get(key);
          if (value) {
            const size = new Blob([JSON.stringify(value)]).size; // Estimate size in bytes
            totalSize += size;
          }
        }
      }

      return totalSize; // Size in bytes
    },
  };
}

export function createDb(rowName: string) {
  return createIdb(rowName);
}

function processDbSizes(db: [string, number][], totalSize: number) {
  return _.entries(
    db.reduce(
      (acc, [key, size]) => {
        if (size / totalSize <= 0.01) {
          acc["Other"] = acc["Other"] ?? 0;
          acc["Other"] += size;
        } else {
          const prettyKey = _.capitalize(
            key.split("_")[1]?.replaceAll("-", " ") ?? key,
          );
          acc[prettyKey] = size;
        }
        return acc;
      },
      {} as Record<string, number>,
    ),
  ).sort(([_aKey, aSize], [_bKey, bSize]) => {
    return bSize - aSize;
  });
}

export async function getDbSizes() {
  const sizes: [string, number][] = [];
  let totalSize = 0;

  const db = await openDB(DB_NAME, DB_VERSION);
  const keys = await db.getAllKeys(TABLE_NAME);

  for (const key of keys) {
    const value = await db.get(TABLE_NAME, key);
    const size = new Blob([JSON.stringify(value)]).size; // Estimate size in bytes
    totalSize += size;
    sizes.push([key.toString(), size]);
  }

  return processDbSizes(sizes, totalSize);
}
