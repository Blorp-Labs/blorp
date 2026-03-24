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
  accountIndex: z.number(),
});

type AuthStore = {
  getSelectedAccount: () => Account;
  isLoggedIn: () => boolean;
  updateSelectedAccount: (patch: Partial<Account>) => any;
  updateAccount: (index: number | Account, patch: Partial<Account>) => any;
  addAccount: (patch?: Partial<Account>) => any;
  setAccountIndex: (index: number) => Account | null;
  logout: (index?: number | Account) => any;
  logoutMultiple: (index: number[]) => any;
  getCachePrefixer: (index?: number | Account) => CachePrefixer;
  reset: () => void;
} & z.infer<typeof storeSchema>;

export function getSelectedAccount(state: {
  accounts: Account[];
  accountIndex: number;
}): Account | undefined {
  return state.accounts[state.accountIndex];
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
        // but just to be save, this function can
        // recover from an account that isn't found
        if (!account) {
          const newAccount = getNewAccount();
          set((prev) => {
            const newAccounts = prev.accounts;
            newAccounts[state.accountIndex] = newAccount;
            return {
              ...prev,
              accounts: newAccounts,
            };
          });
          return newAccount;
        }
        return account;
      },
      isLoggedIn: () => {
        const state = get();
        const account = state.accounts[state.accountIndex];
        return !!account && !!account.jwt;
      },
      accountIndex: 0,
      addAccount: (patch) => {
        const instance = patch?.instance ?? env.defaultInstance;
        const accounts = [
          ...get().accounts,
          {
            uuid: uuid(),
            ...patch,
            instance: normalizeInstance(instance),
          },
        ];
        set({
          accounts,
          accountIndex: accounts.length - 1,
        });
      },
      logout: (accountSelector) => {
        const { accounts, accountIndex } = get();
        const index = _.isObject(accountSelector)
          ? accounts.findIndex(({ jwt }) => jwt && jwt === accountSelector.jwt)
          : accountSelector;
        const account = accounts[index ?? accountIndex];
        if (account) {
          delete accounts[index ?? accountIndex];
          const newAccounts = accounts.filter(Boolean);
          if (newAccounts.length === 0) {
            set({
              accounts: [getNewAccount()],
              accountIndex: 0,
            });
          } else {
            set({
              accounts: newAccounts,
              accountIndex: _.clamp(accountIndex, 0, newAccounts.length - 1),
            });
          }
        }
      },
      logoutMultiple: (indicies: number[]) => {
        const { accounts, accountIndex } = get();
        const newAccounts = accounts.filter((_a, i) => !indicies.includes(i));
        if (newAccounts.length === 0) {
          set({
            accounts: [getNewAccount()],
            accountIndex: 0,
          });
        } else {
          set({
            accounts: newAccounts,
            accountIndex: _.clamp(accountIndex, 0, newAccounts.length - 1),
          });
        }
      },
      setAccountIndex: (index) => {
        const account = get().accounts[index];
        if (!account) {
          return null;
        }
        set({
          accountIndex: index,
        });
        return account;
      },
      updateAccount: (accountSelector, patch) => {
        let { accounts } = get();
        const index = _.isObject(accountSelector)
          ? accounts.findIndex(({ jwt }) => jwt && jwt === accountSelector.jwt)
          : accountSelector;
        accounts = accounts.map((a, i) =>
          i === index
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
        let { accounts, accountIndex } = get();
        accounts = accounts.map((a, i) =>
          i === accountIndex
            ? {
                ...a,
                uuid: patch.jwt ? uuid() : (a.uuid ?? uuid()),
                ...patch,
                ...("site" in patch && patch.site
                  ? { siteUpdatedAt: Date.now() }
                  : null),
              }
            : a,
        );
        set({
          accounts,
        });
      },
      getCachePrefixer: (accountSelector) => {
        const { accounts, accountIndex } = get();
        const index = _.isObject(accountSelector)
          ? accounts.findIndex(({ jwt }) => jwt && jwt === accountSelector.jwt)
          : accountSelector;
        const account = accounts[index ?? accountIndex];
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
        return {
          ...current,
          ...persistedData,
          accounts: [...mergedAccounts, ...newAccounts],
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
