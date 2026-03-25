import { describe, test, expect, afterEach, vi } from "vitest";

vi.mock("uuid", async (importOriginal) => {
  const actual = await importOriginal<typeof import("uuid")>();
  return { ...actual, v4: vi.fn(actual.v4) };
});
import {
  useAuth,
  type Account,
  AuthStoreData,
  getSelectedAccount,
} from "./auth";
import { getSite } from "@/test-utils/api";
import { renderHook, act } from "@testing-library/react";
import { faker } from "@faker-js/faker";
import { env } from "../env";

afterEach(() => {
  const { result } = renderHook(() => useAuth());
  act(() => {
    result.current.reset();
  });
});

describe("useAuthStore", () => {
  const { result } = renderHook(() => useAuth());

  const account1 = {
    instance: faker.internet.url().replace(/\/$/, ""),
    jwt: faker.string.uuid(),
    uuid: faker.string.uuid(),
  };

  const account2 = {
    instance: faker.internet.url().replace(/\/$/, ""),
    jwt: faker.string.uuid(),
    uuid: faker.string.uuid(),
  };

  const account3 = {
    instance: faker.internet.url().replace(/\/$/, ""),
    jwt: faker.string.uuid(),
    uuid: faker.string.uuid(),
  };

  test("default instance", () => {
    expect(result.current.getSelectedAccount().instance).toBe(
      env.defaultInstance,
    );
  });

  test("is logged in init false", () => {
    expect(result.current.isLoggedIn()).toBe(false);
  });

  test("login first account", () => {
    act(() => {
      result.current.updateSelectedAccount(account1);
    });
    expect(result.current.getSelectedAccount()).toEqual(account1);
  });

  test("add account single step", () => {
    act(() => {
      result.current.addAccount(account2);
    });
    expect(result.current.getSelectedAccount()).toEqual(account2);
  });

  test("add account two steps", () => {
    act(() => {
      result.current.addAccount();
      result.current.updateSelectedAccount(account3);
    });
    expect(result.current.getSelectedAccount()).toEqual(account3);
  });

  test("logout of account 3 of 3", () => {
    act(() => {
      result.current.updateSelectedAccount(account1);
      result.current.addAccount(account2);
      result.current.addAccount(account3);
    });
    expect(result.current.accounts).toHaveLength(3);
    act(() => {
      result.current.logout();
    });
    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.getSelectedAccount()).toEqual(account1);
  });

  test("change account selection", () => {
    act(() => {
      result.current.updateSelectedAccount(account1);
      result.current.addAccount(account2);
      result.current.addAccount(account3);
    });
    expect(result.current.getSelectedAccount()).toEqual(account3);
    let account: any;
    act(() => {
      account = result.current.selectAccount(account1.uuid);
    });
    expect(account).toEqual(account1);
    expect(result.current.getSelectedAccount()).toEqual(account1);
  });

  test("selectAccount protects against invalid account uuid", () => {
    act(() => {
      result.current.updateSelectedAccount(account1);
      result.current.addAccount(account2);
      result.current.addAccount(account3);
    });
    const fakeUuid = "random-string";
    act(() => {
      result.current.selectAccount(fakeUuid);
    });
    expect(result.current.selectedUuid).not.toBe(fakeUuid);
  });

  test("logout of account 1 of 2", () => {
    act(() => {
      result.current.updateSelectedAccount(account1);
      result.current.addAccount(account2);
    });
    expect(result.current.accounts).toHaveLength(2);
    act(() => {
      result.current.logout(account1.uuid);
    });
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.getSelectedAccount()).toEqual(account2);
  });

  test("logout of account 2 of 2", () => {
    act(() => {
      result.current.updateSelectedAccount(account1);
      result.current.addAccount(account2);
    });
    expect(result.current.accounts).toHaveLength(2);
    act(() => {
      result.current.logout(account2.uuid);
    });
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.getSelectedAccount()).toEqual(account1);
  });

  test("logout of last account", () => {
    act(() => {
      result.current.updateSelectedAccount(account1);
    });
    expect(result.current.accounts).toHaveLength(1);
    act(() => {
      result.current.logout();
    });
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.getSelectedAccount()).toMatchObject({
      instance: env.defaultInstance,
    });
  });

  test("normalizes instance", () => {
    act(() => {
      result.current.addAccount({
        instance: "https://fakelemmyinstance.com/",
      });
    });
    expect(result.current.getSelectedAccount()).toMatchObject({
      instance: "https://fakelemmyinstance.com",
    });
  });
});

describe("persisted state snapshot", () => {
  test("auth store shape", () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.reset();
      result.current.updateSelectedAccount({
        instance: "https://lemmy.zip",
        uuid: "uuid-1",
      });
      result.current.addAccount({
        instance: "https://lemmy.world",
        jwt: "test-jwt-token-2",
        uuid: "uuid-2",
      });
    });

    expect({
      accounts: result.current.accounts,
      selectedUuid: result.current.selectedUuid,
    }).toMatchSnapshot();
  });
});

describe("useAuthStore merge", () => {
  const merge = useAuth.persist.getOptions().merge!;

  function makeAccount(overrides?: Partial<Account>): Account {
    return {
      instance: faker.internet.url().replace(/\/$/, ""),
      jwt: faker.string.uuid(),
      uuid: faker.string.uuid(),
      ...overrides,
    };
  }

  function makeCurrent(accounts: Account[]) {
    return {
      ...useAuth.getState(),
      accounts,
      selectedUuid: accounts[0]?.uuid,
    } satisfies AuthStoreData;
  }

  test("in-memory account wins when siteUpdatedAt is newer (single-tab revert bug)", () => {
    const account = makeAccount();
    const persisted = {
      accounts: [
        {
          ...account,
          site: getSite({ description: "stale-persisted" }),
          siteUpdatedAt: 50,
        },
      ],
      selectedUuid: account.uuid,
    } satisfies AuthStoreData;
    const current = makeCurrent([
      {
        ...account,
        site: getSite({ description: "fresh-current" }),
        siteUpdatedAt: 100,
      } as Account,
    ]);
    const result = merge(persisted, current);
    expect(result.accounts[0]!.siteUpdatedAt).toBe(100);
    expect((result.accounts[0] as any).site?.description).toBe("fresh-current");
  });

  test("persisted account wins when siteUpdatedAt is newer (multi-tab sync)", () => {
    const account = makeAccount();
    const persisted = {
      accounts: [
        {
          ...account,
          site: getSite({ description: "fresh-persisted" }),
          siteUpdatedAt: 100,
        },
      ],
      selectedUuid: account.uuid,
    } satisfies AuthStoreData;
    const current = makeCurrent([
      {
        ...account,
        site: getSite({ description: "stale-current" }),
        siteUpdatedAt: 50,
      } as Account,
    ]);
    const result = merge(persisted, current);
    expect(result.accounts[0]!.siteUpdatedAt).toBe(100);
    expect((result.accounts[0] as any).site?.description).toBe(
      "fresh-persisted",
    );
  });

  test("new account from another tab is appended", () => {
    const account1 = makeAccount();
    const account2 = makeAccount();
    const persisted = {
      accounts: [account1, account2],
      selectedUuid: account1.uuid,
    } satisfies AuthStoreData;
    const current = makeCurrent([account1]);
    const result = merge(persisted, current);
    expect(result.accounts).toHaveLength(2);
    expect(result.accounts.map((a) => a.uuid)).toContain(account2.uuid);
  });

  test("account order from persisted is preserved", () => {
    const account1 = makeAccount();
    const account2 = makeAccount();
    const persisted = {
      accounts: [account2, account1],
      selectedUuid: account2.uuid,
    } satisfies AuthStoreData;
    const current = makeCurrent([account1, account2]);
    const result = merge(persisted, current);
    expect(result.accounts[0]!.uuid).toBe(account2.uuid);
    expect(result.accounts[1]!.uuid).toBe(account1.uuid);
  });

  test("mixed: each account uses the version with the newer siteUpdatedAt", () => {
    // account1: storage updated the site more recently
    const account1 = makeAccount();
    const account1Persisted = {
      ...account1,
      site: getSite({ description: "a1-fresh-persisted" }),
      siteUpdatedAt: 100,
    };
    const account1Current = {
      ...account1,
      site: getSite({ description: "a1-stale-current" }),
      siteUpdatedAt: 50,
    } as Account;
    // account2: current tab updated the site more recently
    const account2 = makeAccount();
    const account2Persisted = {
      ...account2,
      site: getSite({ description: "a2-stale-persisted" }),
      siteUpdatedAt: 50,
    };
    const account2Current = {
      ...account2,
      site: getSite({ description: "a2-fresh-current" }),
      siteUpdatedAt: 100,
    } as Account;

    const persisted = {
      accounts: [account1Persisted, account2Persisted],
      selectedUuid: account1Persisted.uuid,
    } satisfies AuthStoreData;
    const current = makeCurrent([account1Current, account2Current]);
    const result = merge(persisted, current);

    expect(result.accounts).toHaveLength(2);

    const r1 = result.accounts.find((a) => a.uuid === account1.uuid)!;
    const r2 = result.accounts.find((a) => a.uuid === account2.uuid)!;

    expect(r1.siteUpdatedAt).toBe(100);
    expect((r1 as any).site?.description).toBe("a1-fresh-persisted");

    expect(r2.siteUpdatedAt).toBe(100);
    expect((r2 as any).site?.description).toBe("a2-fresh-current");
  });

  test("account logged out in another tab is not re-added by current tab", () => {
    const account1 = makeAccount();
    const account2 = makeAccount();

    // another tab logged out of account2, so storage only has account1
    const persisted = {
      accounts: [account1],
      selectedUuid: account1.uuid,
      loggedOutUuids: [account2.uuid],
    } satisfies AuthStoreData;
    // current tab still has both accounts
    const current = makeCurrent([account1, account2]);

    const result = merge(persisted, current);

    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]!.uuid).toBe(account1.uuid);
  });

  test("current tab's loggedOutUuids prevents re-adding account from current", () => {
    const account1 = makeAccount();
    const account2 = makeAccount();

    // persisted doesn't have account2
    const persisted = {
      accounts: [account1],
      selectedUuid: account1.uuid,
    } satisfies AuthStoreData;
    // current tab still has account2 in memory but has marked it logged out
    const current = {
      ...useAuth.getState(),
      accounts: [account1, account2],
      selectedUuid: account1.uuid,
      loggedOutUuids: [account2.uuid],
    } satisfies AuthStoreData;

    const result = merge(persisted, current);

    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]!.uuid).toBe(account1.uuid);
  });

  test("merged result contains loggedOutUuids from both persisted and current", () => {
    const account1 = makeAccount();
    const oldLoggedOutUuid = faker.string.uuid();
    const newLoggedOutUuid = faker.string.uuid();

    const persisted = {
      accounts: [account1],
      selectedUuid: account1.uuid,
      loggedOutUuids: [oldLoggedOutUuid],
    } satisfies AuthStoreData;
    const current = {
      ...useAuth.getState(),
      accounts: [account1],
      selectedUuid: account1.uuid,
      loggedOutUuids: [newLoggedOutUuid],
    } satisfies AuthStoreData;

    const result = merge(persisted, current);

    expect(result.loggedOutUuids).toContain(oldLoggedOutUuid);
    expect(result.loggedOutUuids).toContain(newLoggedOutUuid);
  });

  test("new account in current tab is appended with jwt and uuid intact", () => {
    const existingAccount = makeAccount();
    const newAccount = makeAccount();
    const persisted = {
      accounts: [existingAccount],
      selectedUuid: existingAccount.uuid,
    } satisfies AuthStoreData;
    const current = makeCurrent([existingAccount, newAccount]);
    const result = merge(persisted, current);

    expect(result.accounts).toHaveLength(2);
    const appended = result.accounts.find((a) => a.uuid === newAccount.uuid)!;
    expect(appended).toBeDefined();
    expect(appended.uuid).toBe(newAccount.uuid);
    expect(appended.jwt).toBe(newAccount.jwt);
  });

  test("no duplicates when both sides have identical accounts", () => {
    const account1 = makeAccount();
    const account2 = makeAccount();

    const persisted = {
      accounts: [account1, account2],
      selectedUuid: account1.uuid,
    } satisfies AuthStoreData;
    const current = makeCurrent([account1, account2]);

    const result = merge(persisted, current);

    expect(result.accounts).toHaveLength(2);
  });

  // Should never happen in practice, but we want to be extra safe
  test("empty persisted accounts falls back to current", () => {
    const account = makeAccount();
    const current = makeCurrent([account]);
    const result = merge({ accounts: [], selectedUuid: undefined }, current);

    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]!.uuid).toBe(account.uuid);
  });

  test("invalid site data in persisted is stripped without losing the account", () => {
    const account = makeAccount();
    const persisted = {
      accounts: [{ ...account, site: { totally: "wrong", shape: true } }],
      selectedUuid: account.uuid,
    };
    const current = makeCurrent([account]);
    const result = merge(persisted, current);

    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]!.uuid).toBe(account.uuid);
    expect(result.accounts[0]!.jwt).toBe(account.jwt);
    expect("site" in result.accounts[0]!).toBe(false);
  });

  test("malformed persisted data falls back to current", () => {
    const account = makeAccount();
    const current = makeCurrent([account]);
    const result = merge({ accounts: "not-an-array" }, current);

    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]!.uuid).toBe(account.uuid);
  });

  test("null persisted falls back to current without dropping accounts", () => {
    const account1 = makeAccount();
    const account2 = makeAccount();
    const current = makeCurrent([account1, account2]);
    const result = merge(null, current);

    expect(result.accounts).toHaveLength(2);
    expect(result.accounts.map((a) => a.uuid)).toContain(account1.uuid);
    expect(result.accounts.map((a) => a.uuid)).toContain(account2.uuid);
  });

  describe("selected account after merge", () => {
    test("preserves selected account when accounts are reordered", () => {
      const account1 = makeAccount();
      const account2 = makeAccount();

      // current tab has account2 selected
      const current = {
        ...useAuth.getState(),
        accounts: [account1, account2],
        selectedUuid: account2.uuid,
      } satisfies AuthStoreData;
      // persisted has accounts in reverse order with a different selection
      const persisted = {
        accounts: [account2, account1],
        selectedUuid: account1.uuid,
      } satisfies AuthStoreData;

      const result = merge(persisted, current);

      expect(getSelectedAccount(result)?.uuid).toBe(
        getSelectedAccount(current)?.uuid,
      );
    });

    test("preserves selected account when the selected account is not yet in storage (login race)", () => {
      const existingAccount = makeAccount();
      const newAccount = makeAccount();

      // current tab just logged in as newAccount, not yet written to storage
      const current = {
        ...useAuth.getState(),
        accounts: [existingAccount, newAccount],
        selectedUuid: newAccount.uuid,
      } satisfies AuthStoreData;
      // persisted only knows about the existing account
      const persisted = {
        accounts: [existingAccount],
        selectedUuid: existingAccount.uuid,
      } satisfies AuthStoreData;

      const result = merge(persisted, current);

      expect(getSelectedAccount(result)?.uuid).toBe(
        getSelectedAccount(current)?.uuid,
      );
    });

    test("preserves selected account when another tab prepends a new account", () => {
      const account1 = makeAccount();
      const account2 = makeAccount();
      const newAccount = makeAccount();

      // current tab has account2 selected (index 1)
      const current = {
        ...useAuth.getState(),
        accounts: [account1, account2],
        selectedUuid: account2.uuid,
      } satisfies AuthStoreData;
      // another tab added newAccount at the front and has it selected
      const persisted = {
        accounts: [newAccount, account1, account2],
        selectedUuid: newAccount.uuid,
      } satisfies AuthStoreData;

      const result = merge(persisted, current);

      expect(getSelectedAccount(result)?.uuid).toBe(
        getSelectedAccount(current)?.uuid,
      );
    });

    test("selectedUuid does not point to account logged out in another tab", () => {
      const account1 = makeAccount();
      const account2 = makeAccount();

      // another tab logged out account2
      const persisted = {
        accounts: [account1],
        selectedUuid: account1.uuid,
        loggedOutUuids: [account2.uuid],
      } satisfies AuthStoreData;
      // current tab still has account2 selected
      const current = {
        ...useAuth.getState(),
        accounts: [account1, account2],
        selectedUuid: account2.uuid,
      } satisfies AuthStoreData;

      const result = merge(persisted, current);

      // account2 was logged out — selectedUuid must not point to it
      expect(
        result.accounts.find((a) => a.uuid === result.selectedUuid),
      ).toBeDefined();
    });

    // Guest selection is not preserved across merges. This is a known
    // tradeoff: the merge excludes in-memory guests to prevent a new
    // guest account from being appended every time a tab opens.
    test("persisted selectedUuid wins over in-memory guest selection", () => {
      const account1 = makeAccount();
      const account2 = makeAccount();
      const account3 = makeAccount();
      const guest = makeAccount({ jwt: undefined });

      // storage has 3 real accounts with account2 (middle) selected
      const persisted = {
        accounts: [account1, account2, account3],
        selectedUuid: account2.uuid,
      } satisfies AuthStoreData;
      // in-memory has only a guest account, and it is selected
      const current = {
        ...useAuth.getState(),
        accounts: [guest],
        selectedUuid: guest.uuid,
      } satisfies AuthStoreData;

      const result = merge(persisted, current);

      expect(getSelectedAccount(result)?.uuid).toBe(account2.uuid);
    });
  });

  // Guest accounts have a uuid but no jwt.
  describe("guest accounts (no jwt)", () => {
    function makeGuest(): Account {
      return makeAccount({ jwt: undefined });
    }

    test("default guest is preserved when persisted is empty (first launch)", () => {
      // On first launch there is nothing in storage, so persisted is null.
      // The store always initialises with at least one guest account, and we
      // must not lose it — otherwise the app would have zero accounts.
      const guest = makeGuest();
      const current = makeCurrent([guest]);
      const result = merge(null, current);

      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0]!.uuid).toBe(guest.uuid);
    });

    test("guest in persisted is kept", () => {
      const guest = makeGuest();
      const persisted = {
        accounts: [guest],
        selectedUuid: guest.uuid,
      } satisfies AuthStoreData;
      const current = makeCurrent([]);
      const result = merge(persisted, current);

      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0]!.uuid).toBe(guest.uuid);
    });

    test("persisted mix of logged-in and guest accounts is preserved intact", () => {
      // Users can have both logged-in and guest accounts persisted together.
      // The guest accounts must survive the merge undisturbed.
      const loggedIn = makeAccount();
      const guest = makeGuest();
      const persisted = {
        accounts: [loggedIn, guest],
        selectedUuid: loggedIn.uuid,
      } satisfies AuthStoreData;
      const current = makeCurrent([loggedIn]);
      const result = merge(persisted, current);

      expect(result.accounts).toHaveLength(2);
      const resultGuest = result.accounts.find((a) => a.uuid === guest.uuid)!;
      expect(resultGuest).toBeDefined();
      expect(resultGuest.uuid).toBe(guest.uuid);
      expect(resultGuest.instance).toBe(guest.instance);
    });

    test("guest in both uses persisted version", () => {
      // Guest accounts are excluded from currentByUuid (no jwt filter),
      // so the current version is never consulted — persisted always wins.
      const guest = makeGuest();
      const guestWithUpdatedInstance = {
        ...guest,
        instance: faker.internet.url().replace(/\/$/, ""),
      };
      const persisted = {
        accounts: [guest],
        selectedUuid: guest.uuid,
      } satisfies AuthStoreData;
      const current = makeCurrent([guestWithUpdatedInstance]);
      const result = merge(persisted, current);

      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0]!.instance).toBe(guest.instance);
    });

    test("guest only in current is dropped", () => {
      // currentLoggedIn filters to jwt-bearing accounts only, so a guest
      // that hasn't reached storage yet is not appended to newAccounts.
      const loggedIn = makeAccount();
      const guest = makeGuest();
      const persisted = {
        accounts: [loggedIn],
        selectedUuid: loggedIn.uuid,
      } satisfies AuthStoreData;
      const current = makeCurrent([loggedIn, guest]);
      const result = merge(persisted, current);

      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0]!.uuid).toBe(loggedIn.uuid);
    });
  });
});

describe("useAuthStore migrate", () => {
  const migrate = useAuth.persist.getOptions().migrate!;

  test("stamps uuid onto an account that is missing one", () => {
    const accountWithoutUuid = {
      instance: "https://lemmy.world",
      jwt: "some-jwt-token",
    };
    const state = { accounts: [accountWithoutUuid], accountIndex: 0 };
    const result = migrate(state, 4) as ReturnType<typeof useAuth.getState>;
    expect(typeof result.accounts[0]!.uuid).toBe("string");
    expect(result.accounts[0]!.uuid.length).toBeGreaterThan(0);
  });

  test("preserves existing uuid on account that already has one", () => {
    const existingUuid = "existing-uuid-should-survive";
    const state = {
      accounts: [
        {
          instance: "https://lemmy.world",
          jwt: "some-jwt",
          uuid: existingUuid,
        },
      ],
      accountIndex: 0,
    };
    const result = migrate(state, 4) as ReturnType<typeof useAuth.getState>;
    expect(result.accounts[0]!.uuid).toBe(existingUuid);
  });

  test("drops site data that no longer matches siteSchema", () => {
    const state = {
      accounts: [
        {
          instance: "https://lemmy.world",
          jwt: "some-jwt",
          uuid: "existing-uuid",
          site: { totally: "wrong", shape: true },
        },
      ],
      accountIndex: 0,
    };
    const result = migrate(state, 4) as ReturnType<typeof useAuth.getState>;
    expect(result.accounts[0]!.uuid).toBe("existing-uuid");
    expect("site" in result.accounts[0]!).toBe(false);
  });

  test("does not throw on pre-v4 state missing accountIndex", () => {
    const state = {
      accounts: [{ instance: "https://lemmy.world", jwt: "some-jwt-token" }],
    };
    expect(() => migrate(state, 3)).not.toThrow();
    const result = migrate(state, 3) as ReturnType<typeof useAuth.getState>;
    expect(result.accounts).toHaveLength(1);
    expect(typeof result.accounts[0]!.uuid).toBe("string");
  });
});

describe("logoutMultiple", () => {
  afterEach(() => {
    const { result } = renderHook(() => useAuth());
    act(() => {
      result.current.reset();
    });
  });

  test("removes multiple accounts and keeps the rest", () => {
    const { result } = renderHook(() => useAuth());

    const account1 = {
      instance: faker.internet.url().replace(/\/$/, ""),
      jwt: faker.string.uuid(),
      uuid: faker.string.uuid(),
    };
    const account2 = {
      instance: faker.internet.url().replace(/\/$/, ""),
      jwt: faker.string.uuid(),
      uuid: faker.string.uuid(),
    };
    const account3 = {
      instance: faker.internet.url().replace(/\/$/, ""),
      jwt: faker.string.uuid(),
      uuid: faker.string.uuid(),
    };

    act(() => {
      result.current.updateSelectedAccount(account1);
      result.current.addAccount(account2);
      result.current.addAccount(account3);
    });
    expect(result.current.accounts).toHaveLength(3);

    act(() => {
      result.current.logoutMultiple([account2.uuid, account3.uuid]);
    });

    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0]!.uuid).toBe(account1.uuid);
  });

  test("falls back to guest when all accounts are logged out", () => {
    const { result } = renderHook(() => useAuth());

    const account1 = {
      instance: faker.internet.url().replace(/\/$/, ""),
      jwt: faker.string.uuid(),
      uuid: faker.string.uuid(),
    };
    const account2 = {
      instance: faker.internet.url().replace(/\/$/, ""),
      jwt: faker.string.uuid(),
      uuid: faker.string.uuid(),
    };

    act(() => {
      result.current.updateSelectedAccount(account1);
      result.current.addAccount(account2);
    });

    act(() => {
      result.current.logoutMultiple([account1.uuid, account2.uuid]);
    });

    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.getSelectedAccount()).toMatchObject({
      instance: env.defaultInstance,
    });
    expect(result.current.isLoggedIn()).toBe(false);
  });

  test("tracks loggedOutUuids", () => {
    const { result } = renderHook(() => useAuth());

    const account1 = {
      instance: faker.internet.url().replace(/\/$/, ""),
      jwt: faker.string.uuid(),
      uuid: faker.string.uuid(),
    };
    const account2 = {
      instance: faker.internet.url().replace(/\/$/, ""),
      jwt: faker.string.uuid(),
      uuid: faker.string.uuid(),
    };
    const account3 = {
      instance: faker.internet.url().replace(/\/$/, ""),
      jwt: faker.string.uuid(),
      uuid: faker.string.uuid(),
    };

    act(() => {
      result.current.updateSelectedAccount(account1);
      result.current.addAccount(account2);
      result.current.addAccount(account3);
    });

    act(() => {
      result.current.logoutMultiple([account2.uuid, account3.uuid]);
    });

    expect(result.current.loggedOutUuids).toContain(account2.uuid);
    expect(result.current.loggedOutUuids).toContain(account3.uuid);
  });

  test("selected account falls back when current selection is logged out", () => {
    const { result } = renderHook(() => useAuth());

    const account1 = {
      instance: faker.internet.url().replace(/\/$/, ""),
      jwt: faker.string.uuid(),
      uuid: faker.string.uuid(),
    };
    const account2 = {
      instance: faker.internet.url().replace(/\/$/, ""),
      jwt: faker.string.uuid(),
      uuid: faker.string.uuid(),
    };

    act(() => {
      result.current.updateSelectedAccount(account1);
      result.current.addAccount(account2);
      result.current.selectAccount(account2.uuid);
    });
    expect(result.current.getSelectedAccount().uuid).toBe(account2.uuid);

    act(() => {
      result.current.logoutMultiple([account2.uuid]);
    });

    expect(result.current.getSelectedAccount().uuid).toBe(account1.uuid);
  });
});

describe("updateAccountSite", () => {
  afterEach(() => {
    const { result } = renderHook(() => useAuth());
    act(() => {
      result.current.reset();
    });
  });

  test("sets site and siteUpdatedAt on the matching account", () => {
    const { result } = renderHook(() => useAuth());

    const account = {
      instance: faker.internet.url().replace(/\/$/, ""),
      jwt: faker.string.uuid(),
      uuid: faker.string.uuid(),
    };

    act(() => {
      result.current.updateSelectedAccount(account);
    });

    const site = getSite({ description: "test-site" });
    const before = Date.now();
    act(() => {
      result.current.updateAccountSite(account.uuid, site);
    });
    const after = Date.now();

    const updated = result.current.accounts.find(
      (a) => a.uuid === account.uuid,
    )!;
    expect("site" in updated && updated.site?.description).toBe("test-site");
    expect(updated.siteUpdatedAt).toBeGreaterThanOrEqual(before);
    expect(updated.siteUpdatedAt).toBeLessThanOrEqual(after);
  });
});
