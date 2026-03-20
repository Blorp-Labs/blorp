import { describe, test, expect, afterEach, vi } from "vitest";

vi.mock("uuid", () => ({ v4: () => "fixed-uuid-value" }));
import { useAuth, type Account } from "./auth";
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
      result.current.updateAccount(0, account1);
      result.current.addAccount(account2);
      result.current.addAccount(account3);
    });
    expect(result.current.accounts).toHaveLength(3);
    act(() => {
      result.current.logout();
    });
    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.getSelectedAccount()).toEqual(account2);
  });

  test("change account selection", () => {
    act(() => {
      result.current.updateAccount(0, account1);
      result.current.addAccount(account2);
      result.current.addAccount(account3);
    });
    expect(result.current.getSelectedAccount()).toEqual(account3);
    let account: any;
    act(() => {
      account = result.current.setAccountIndex(0);
    });
    expect(account).toEqual(account1);
    expect(result.current.getSelectedAccount()).toEqual(account1);
  });

  test("setAccountIndex protects against invalid account index", () => {
    act(() => {
      result.current.updateAccount(0, account1);
      result.current.addAccount(account2);
      result.current.addAccount(account3);
    });
    const newAccountIndex = result.current.accounts.length * 2;
    act(() => {
      result.current.setAccountIndex(newAccountIndex);
    });
    expect(result.current.accountIndex).not.toBe(newAccountIndex);
  });

  test("logout of account 1 of 2", () => {
    act(() => {
      result.current.updateAccount(0, account1);
      result.current.addAccount(account2);
    });
    expect(result.current.accounts).toHaveLength(2);
    act(() => {
      result.current.logout(0);
    });
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.getSelectedAccount()).toEqual(account2);
  });

  test("logout of account 2 of 2", () => {
    act(() => {
      result.current.updateAccount(0, account1);
      result.current.addAccount(account2);
    });
    expect(result.current.accounts).toHaveLength(2);
    act(() => {
      result.current.logout(1);
    });
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.getSelectedAccount()).toEqual(account1);
  });

  test("logout of last account", () => {
    act(() => {
      result.current.updateAccount(0, account1);
    });
    expect(result.current.accounts).toHaveLength(1);
    act(() => {
      result.current.logout();
    });
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.getSelectedAccount()).toEqual({
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
      result.current.addAccount({
        instance: "https://lemmy.world",
        jwt: "test-jwt-token",
      });
      result.current.setAccountIndex(0);
    });

    expect({
      accounts: result.current.accounts,
      accountIndex: result.current.accountIndex,
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
    return { ...useAuth.getState(), accounts, accountIndex: 0 };
  }

  test("in-memory account wins when siteUpdatedAt is newer (single-tab revert bug)", () => {
    const account = makeAccount();
    const persisted = {
      accounts: [{ ...account, siteUpdatedAt: 50 }],
      accountIndex: 0,
    };
    const current = makeCurrent([{ ...account, siteUpdatedAt: 100 }]);
    const result = merge(persisted, current);
    expect(result.accounts[0]!.siteUpdatedAt).toBe(100);
  });

  test("persisted account wins when siteUpdatedAt is newer (multi-tab sync)", () => {
    const account = makeAccount();
    const persisted = {
      accounts: [{ ...account, siteUpdatedAt: 100 }],
      accountIndex: 0,
    };
    const current = makeCurrent([{ ...account, siteUpdatedAt: 50 }]);
    const result = merge(persisted, current);
    expect(result.accounts[0]!.siteUpdatedAt).toBe(100);
  });

  test("new account from another tab is appended", () => {
    const account1 = makeAccount();
    const account2 = makeAccount();
    const persisted = {
      accounts: [account1, account2],
      accountIndex: 0,
    };
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
      accountIndex: 0,
    };
    const current = makeCurrent([account1, account2]);
    const result = merge(persisted, current);
    expect(result.accounts[0]!.uuid).toBe(account2.uuid);
    expect(result.accounts[1]!.uuid).toBe(account1.uuid);
  });
});
