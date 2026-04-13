import { describe, test, expect } from "vitest";
import { Deferred } from "./deferred";

describe("Deferred", () => {
  test("resolves with a value", async () => {
    const deferred = new Deferred<number>();
    deferred.resolve(42);
    await expect(deferred.promise).resolves.toBe(42);
  });

  test("resolves with no value for void type", async () => {
    const deferred = new Deferred();
    deferred.resolve();
    await expect(deferred.promise).resolves.toBeUndefined();
  });

  test("rejects with a reason", async () => {
    const deferred = new Deferred<string>();
    const error = new Error("something went wrong");
    deferred.reject(error);
    await expect(deferred.promise).rejects.toThrow("something went wrong");
  });

  test("rejects with no reason", async () => {
    const deferred = new Deferred();
    deferred.reject();
    await expect(deferred.promise).rejects.toBeUndefined();
  });

  test("promise is pending until resolved", async () => {
    const deferred = new Deferred<number>();
    let resolved = false;

    deferred.promise.then(() => {
      resolved = true;
    });

    await Promise.resolve(); // flush microtasks
    expect(resolved).toBe(false);

    deferred.resolve(1);
    await deferred.promise;
    expect(resolved).toBe(true);
  });

  test("promise is pending until rejected", async () => {
    const deferred = new Deferred();
    let rejected = false;

    deferred.promise.catch(() => {
      rejected = true;
    });

    await Promise.resolve();
    expect(rejected).toBe(false);

    deferred.reject(new Error("fail"));
    await deferred.promise.catch(() => {});
    expect(rejected).toBe(true);
  });
});
