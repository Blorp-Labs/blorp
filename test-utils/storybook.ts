interface PersistedStore {
  persist: {
    hasHydrated(): boolean;
    onFinishHydration(fn: (state: unknown) => void): () => void;
  };
}

/**
 * Waits for all given Zustand persisted stores to finish rehydrating from
 * storage before resolving. Use this in story loaders to avoid the race where
 * the async IndexedDB read completes after the loader has written data and
 * overwrites it.
 */
export function waitForHydration(...stores: PersistedStore[]): Promise<void> {
  return Promise.all(
    stores.map(
      (store) =>
        new Promise<void>((resolve) => {
          if (store.persist.hasHydrated()) {
            resolve();
          } else {
            const unsub = store.persist.onFinishHydration(() => {
              unsub();
              resolve();
            });
          }
        }),
    ),
  ).then(() => undefined);
}
