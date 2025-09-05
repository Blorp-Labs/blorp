import { describe, test, expect, afterEach } from "vitest";
import { useAuth } from "./auth";
import _ from "lodash";
import { renderHook, act } from "@testing-library/react";
import { faker } from "@faker-js/faker";
import { env, defaultInstance } from "../env";

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
    expect(result.current.getSelectedAccount().instance).toBe(defaultInstance);
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
      instance: defaultInstance,
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
