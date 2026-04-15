interface PersistedStore {
  persist: {
    rehydrate(): Promise<void> | void;
  };
}

/**
 * Triggers rehydration on all given Zustand persisted stores and waits for
 * them to settle. Use this in story loaders before writing store data so that
 * the loader's writes happen after any IndexedDB read, not before — which
 * would cause the read to overwrite them.
 *
 * Uses rehydrate() rather than onFinishHydration() because some stores have
 * merge functions that throw on empty storage, which causes onFinishHydration
 * to never fire. rehydrate() always resolves because Zustand's hydrate()
 * catches errors internally.
 */
export function waitForHydration(...stores: PersistedStore[]): Promise<void> {
  return Promise.all(stores.map((store) => store.persist.rehydrate())).then(
    () => undefined,
  );
}
