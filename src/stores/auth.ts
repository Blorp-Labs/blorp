import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import _ from "lodash";
import { env } from "../env";
import z from "zod";
import { siteSchema } from "../lib/api/adapters/api-blueprint";
import { v4 as uuid } from "uuid";
import { isTest } from "../lib/device";
import { normalizeInstance } from "../lib/utils";

export type CacheKey = `cache_${string}`;
export type CachePrefixer = (cacheKey: string | number) => CacheKey;

export function getCachePrefixer(account?: Account): CachePrefixer {
  let prefix = "";
  if (account?.instance) {
    prefix += `${account.instance}_`;
  }
  if (account?.jwt) {
    prefix += "authed_";
  }
  return (cacheKey) => {
    if (_.isString(cacheKey)) {
      cacheKey = cacheKey.toLowerCase();
    }
    return (prefix + cacheKey) as CacheKey;
  };
}

const accountSchema = z.union([
  z.object({
    instance: z.string(),
    jwt: z.string().optional(),
    site: siteSchema,
    uuid: z.string(),
    siteUpdatedAt: z.number().optional(),
  }),
  z.object({
    instance: z.string(),
    jwt: z.string().optional(),
    uuid: z.string(),
    siteUpdatedAt: z.number().optional(),
  }),
]);

export type Account = z.infer<typeof accountSchema>;

const storeSchema = z.object({
  accounts: z.array(accountSchema),
  selectedUuid: z.string().optional(),
});

type Uuid = string;

type AuthStore = {
  getSelectedAccount: () => Account;
  isLoggedIn: () => boolean;
  updateSelectedAccount: (patch: Partial<Account>) => any;
  updateAccount: (uuid: Uuid, patch: Partial<Account>) => any;
  addAccount: (patch?: Partial<Account>) => any;
  setAccountIndex: (uuid: Uuid) => Account | null;
  logout: (uuid?: Uuid) => any;
  logoutMultiple: (uuids: Uuid[]) => any;
  getCachePrefixer: (account?: Account) => CachePrefixer;
  reset: () => void;
} & z.infer<typeof storeSchema>;

export function getSelectedAccount(state: {
  accounts: Account[];
  selectedUuid?: string;
}): Account | undefined {
  const fallback = state.accounts[0];
  return state.selectedUuid
    ? (state.accounts.find((a) => a.uuid === state.selectedUuid) ?? fallback)
    : fallback;
}

export function getAccountSite(account: Account) {
  return "site" in account ? account.site : undefined;
}

export function getAccountActorId(account: Account) {
  return "site" in account ? account.site?.me?.apId : undefined;
}

export function parseAccountInfo(account: Account) {
  const site = "site" in account ? account.site : undefined;
  const instance = normalizeInstance(site?.instance ?? account.instance);
  try {
    const url = new URL(instance);
    return {
      person: site?.me,
      instance: url.host,
    };
  } catch {
    return {
      instance: "",
    };
  }
}

function getNewAccount(): Account {
  return {
    uuid: uuid(),
    instance: env.defaultInstance,
  };
}

const INIT_STATE = {
  accounts: [getNewAccount()],
};

export const useAuth = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...INIT_STATE,
      getSelectedAccount: () => {
        const state = get();
        const account = getSelectedAccount(state);
        // We shouldn't ever hit this case,
        // but just to be safe, this function can
        // recover from an account that isn't found
        if (!account) {
          const firstAccount = _.first(state.accounts);
          if (firstAccount) {
            set((prev) => {
              return {
                ...prev,
                selectedUuid: firstAccount.uuid,
              };
            });
            return firstAccount;
          } else {
            const newAccount = getNewAccount();
            set((prev) => {
              return {
                ...prev,
                accounts: [newAccount],
              };
            });
            return newAccount;
          }
        }
        return account;
      },
      isLoggedIn: () => {
        const state = get();
        const account = getSelectedAccount(state);
        return !!account && !!account.jwt;
      },
      accountIndex: 0,
      addAccount: (patch) => {
        const instance = patch?.instance ?? env.defaultInstance;
        const newAccount = {
          uuid: uuid(),
          ...patch,
          instance: normalizeInstance(instance),
        };
        const accounts = [...get().accounts, newAccount];
        set({
          accounts,
          selectedUuid: newAccount.uuid,
        });
      },
      logout: (selectedUuid) => {
        const state = get();
        const { accounts } = state;
        const logoutUuid = selectedUuid ?? getSelectedAccount(state)?.uuid;
        const account = logoutUuid
          ? accounts.find((a) => a.uuid === logoutUuid)
          : undefined;
        if (account) {
          const newAccounts = accounts.filter((a) => a.uuid !== logoutUuid);
          if (newAccounts.length === 0) {
            const newAccount = getNewAccount();
            set({
              accounts: [newAccount],
              selectedUuid: newAccount.uuid,
            });
          } else {
            set({
              accounts: newAccounts,
              selectedUuid: _.last(newAccounts)?.uuid,
            });
          }
        }
      },
      logoutMultiple: (selectedUuids: string[]) => {
        const { accounts } = get();
        const newAccounts = accounts.filter(
          (a) => !selectedUuids.includes(a.uuid),
        );
        if (newAccounts.length === 0) {
          const newAccount = getNewAccount();
          set({
            accounts: [newAccount],
            selectedUuid: newAccount.uuid,
          });
        } else {
          set({
            accounts: newAccounts,
            // accountIndex: _.clamp(accountIndex, 0, newAccounts.length - 1),
            // TODO: clamp uuid
            selectedUuid: undefined,
          });
        }
      },
      setAccountIndex: (uuid: string) => {
        const account = get().accounts.find((a) => a.uuid === uuid);
        if (!account) {
          return null;
        }
        set({
          selectedUuid: uuid,
        });
        return account;
      },
      updateAccount: (selectedUuid, patch) => {
        const state = get();
        let { accounts } = state;
        accounts = accounts.map((a) =>
          a.uuid === selectedUuid
            ? {
                ...a,
                uuid: patch.jwt ? uuid() : (a.uuid ?? uuid()),
                ...patch,
                ...("site" in patch && patch.site
                  ? { siteUpdatedAt: Date.now() }
                  : null),
                ...(patch.instance
                  ? {
                      instance: normalizeInstance(patch.instance),
                    }
                  : null),
              }
            : a,
        );
        set({
          accounts,
        });
      },
      updateSelectedAccount: (patch) => {
        const state = get();
        let { accounts } = state;
        const selectedAccount = getSelectedAccount(state);
        accounts = accounts.map((a) =>
          a.uuid === selectedAccount?.uuid
            ? {
                ...a,
                ...patch,
                ...("site" in patch && patch.site
                  ? { siteUpdatedAt: Date.now() }
                  : null),
              }
            : a,
        );
        if (patch.uuid) {
          set({
            accounts,
            selectedUuid: patch.uuid,
          });
        } else {
          set({
            accounts,
          });
        }
      },
      getCachePrefixer: (accountSelector) => {
        const state = get();
        const { accounts } = state;
        const account =
          accounts.find((a) => a.uuid === accountSelector?.uuid) ??
          getSelectedAccount(state);
        return getCachePrefixer(account);
      },
      reset: () => {
        if (isTest()) {
          set(INIT_STATE);
        }
      },
    }),
    {
      name: "auth",
      storage: createStorage<z.infer<typeof storeSchema>>(),
      version: 5,
      migrate: (state) => {
        // Parse raw stored data permissively — accounts from old versions may
        // not have uuid. Stamp one onto any account missing it before
        // validating against the current schema.
        const rawSchema = z.object({
          accounts: z.array(z.record(z.unknown())),
          accountIndex: z.number(),
        });
        const raw = rawSchema.parse(state);
        return storeSchema.parse({
          ...raw,
          accounts: raw.accounts.map((a) => ({
            ...a,
            uuid: typeof a["uuid"] === "string" ? a["uuid"] : uuid(),
          })),
        });
      },
      merge: (persisted, current) => {
        const persistedData = storeSchema.safeParse(persisted).data;
        // No persisted accounts means first launch — keep current as-is so the
        // default guest account (always present on init) is not discarded.
        if (!persistedData?.accounts) {
          return { ...current };
        }
        // Only logged-in accounts from the current tab participate in the
        // uuid-based merge below. Guest accounts (no jwt) in the current tab
        // are intentionally excluded: a new tab always initialises with a
        // default guest, but that auto-created guest should not override the
        // guest already in storage. Guest accounts in persisted are NOT
        // excluded — they pass through mergedAccounts unchanged.
        const currentLoggedIn = current.accounts.filter((a) => !!a.jwt);
        const currentByUuid = _.keyBy(currentLoggedIn, "uuid");
        const persistedByUuid = _.keyBy(persistedData.accounts, "uuid");
        // Preserve the account order from persisted (canonical source of order
        // for accountIndex). For each account, pick the version with the newer
        // siteUpdatedAt so that both single-tab (in-memory wins when IndexedDB
        // lags) and multi-tab (storage wins when another tab updated the site)
        // cases resolve correctly.
        const mergedAccounts = persistedData.accounts.map(
          (persistedAccount) => {
            if (!persistedAccount.uuid) {
              return persistedAccount;
            }
            const currentAccount = currentByUuid[persistedAccount.uuid];
            if (!currentAccount) {
              return persistedAccount;
            }
            const persistedTime = persistedAccount.siteUpdatedAt ?? 0;
            const currentTime = currentAccount.siteUpdatedAt ?? 0;
            return currentTime >= persistedTime
              ? currentAccount
              : persistedAccount;
          },
        );
        // Append logged-in accounts not present in persisted (e.g. a login
        // that raced with a rehydrate before the write reached IndexedDB).
        const newAccounts = currentLoggedIn.filter(
          (a) => a.uuid && !persistedByUuid[a.uuid],
        );
        const allAccounts = [...mergedAccounts, ...newAccounts];
        // The current tab's selected account always wins. Find it in the merged
        // list by UUID so that account order differences and new accounts
        // appended at the end don't cause the selection to silently shift.
        const selectedUuid = getSelectedAccount(current)?.uuid;
        return {
          ...current,
          ...persistedData,
          accounts: allAccounts,
          selectedUuid,
        };
      },
    },
  ),
);

sync(useAuth);

export function useIsPersonBlocked(apId?: string | null) {
  return useAuth((s) => {
    const account = s.getSelectedAccount();
    const site = getAccountSite(account);
    const personBlocks = site?.personBlocks;
    if (!apId || !personBlocks || personBlocks.length === 0) {
      return false;
    }
    return !!personBlocks.find((p) => p === apId);
  });
}

export function useIsCommunityBlocked(slug?: string | null) {
  return useAuth((s) => {
    const account = s.getSelectedAccount();
    const site = getAccountSite(account);
    const communityBlocks = site?.communityBlocks;
    if (!slug || !communityBlocks || communityBlocks.length === 0) {
      return false;
    }
    return !!communityBlocks.find((c) => c === slug);
  });
}

export function useIsInstanceBlocked(instanceId?: number | null) {
  return useAuth((s) => {
    const account = s.getSelectedAccount();
    const site = getAccountSite(account);
    if (!instanceId || !site?.instanceBlocks?.length) {
      return false;
    }
    return !!site.instanceBlocks.find((b) => b.id === instanceId);
  });
}

export function useIsAdmin(apId?: string) {
  const adminApIds = useAuth(
    (s) => getAccountSite(s.getSelectedAccount())?.admins,
  );
  return apId ? (adminApIds?.includes(apId) ?? false) : false;
}

export function useAmIAdmin() {
  return useAuth((s) => {
    const account = s.getSelectedAccount();
    const site = getAccountSite(account);
    return site?.me?.apId && site?.admins?.includes(site.me?.apId);
  });
}

export function useShouldShowNsfw() {
  return (
    useAuth((s) => getAccountSite(s.getSelectedAccount())?.showNsfw) ?? false
  );
}

export function useShouldBlurNsfw() {
  return (
    useAuth((s) => getAccountSite(s.getSelectedAccount())?.blurNsfw) ?? true
  );
}
