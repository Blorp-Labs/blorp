import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createStorage, sync } from "./storage";
import _ from "lodash";
import { env, getDefaultInstace } from "../env";
import z from "zod";
import { siteSchema } from "../lib/api/adapters/api-blueprint";
import { v4 as uuid } from "uuid";
import { isTest } from "../lib/device";
import { normalizeInstance } from "../lib/utils";

export type CacheKey = `cache_${string}`;
export type CachePrefixer = (cacheKey: string) => CacheKey;

export function getCachePrefixer(account?: Account): CachePrefixer {
  let prefix = "";
  if (account?.instance) {
    prefix += `${account.instance}_`;
  }
  if (account?.jwt) {
    prefix += "authed_";
  }
  return (cacheKey) => {
    return (prefix + cacheKey) as CacheKey;
  };
}

const accountSchema = z.union([
  z.object({
    instance: z.string(),
    jwt: z.string().optional(),
    site: siteSchema,
    uuid: z.string().optional(),
  }),
  z.object({
    instance: z.string(),
    jwt: z.string().optional(),
    uuid: z.string().optional(),
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
  getCachePrefixer: () => CachePrefixer;
  reset: () => void;
} & z.infer<typeof storeSchema>;

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
    instance: getDefaultInstace(),
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
        const account = state.accounts[state.accountIndex];
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
        const instance = patch?.instance ?? getDefaultInstace();
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
              accounts: [
                {
                  instance: getDefaultInstace(),
                },
              ],
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
            accounts: [
              {
                instance: getDefaultInstace(),
              },
            ],
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
              }
            : a,
        );
        set({
          accounts,
        });
      },
      getCachePrefixer: () => {
        let { accounts, accountIndex } = get();
        const selectedAccount = accounts[accountIndex];
        return getCachePrefixer(selectedAccount);
      },
      reset: () => {
        if (isTest()) {
          set(INIT_STATE);
        }
      },
    }),
    {
      name: "auth",
      storage: createStorage<AuthStore>(),
      version: 3,
      migrate: (state) => {
        const parsed = storeSchema.parse(state) as AuthStore;
        return {
          ...parsed,
          accounts: parsed.accounts.map(
            (a) =>
              ({
                uuid: uuid(),
                ...a,
              }) satisfies Account,
          ),
        };
      },
      merge: (persisted, current) => {
        const persistedData = storeSchema.safeParse(persisted).data;
        const currentLoggedIn = current.accounts.filter((a) => !!a.jwt);
        return {
          ...current,
          ...persistedData,
          accounts: persistedData?.accounts
            ? _.uniqBy(
                [...persistedData.accounts, ...currentLoggedIn],
                (a) => a.uuid,
              )
            : current.accounts,
        };
      },
    },
  ),
);

sync(useAuth);
