import { describe, test, expect, vi } from "vitest";

vi.useFakeTimers();

function mockPromise() {
  const fn = vi.fn();
  return {
    promise: async () => fn(),
    viFn: fn,
  };
}

describe("PriorityThrottleQueue", () => {
  test("enqueue multiple functons", async () => {
    const interval = 5000;
    const { PriorityThrottledQueue } = await import("./throttle-queue");
    const queue = new PriorityThrottledQueue(interval);
    queue.start();

    const fn1 = mockPromise();
    queue.enqueue(fn1.promise);

    const fn2 = mockPromise();
    queue.enqueue(fn2.promise);

    const fn3 = mockPromise();
    queue.enqueue(fn3.promise);

    await vi.advanceTimersByTime(queue.tickTime);
    await vi.runAllTicks();
    expect(fn1.viFn).toHaveBeenCalledTimes(1);
    expect(fn2.viFn).toHaveBeenCalledTimes(0);
    expect(fn3.viFn).toHaveBeenCalledTimes(0);

    await vi.advanceTimersByTime(interval);
    await vi.runAllTicks();
    expect(fn1.viFn).toHaveBeenCalledTimes(1);
    expect(fn2.viFn).toHaveBeenCalledTimes(1);
    expect(fn3.viFn).toHaveBeenCalledTimes(0);

    await vi.advanceTimersByTime(interval);
    await vi.runAllTicks();
    expect(fn1.viFn).toHaveBeenCalledTimes(1);
    expect(fn2.viFn).toHaveBeenCalledTimes(1);
    expect(fn3.viFn).toHaveBeenCalledTimes(1);
  });

  test("clear", async () => {
    const interval = 5000;
    const { PriorityThrottledQueue } = await import("./throttle-queue");
    const queue = new PriorityThrottledQueue(interval);
    queue.start();

    const fn1 = mockPromise();
    queue.enqueue(fn1.promise).catch(() => {});

    const fn2 = mockPromise();
    queue.enqueue(fn2.promise).catch(() => {});

    const fn3 = mockPromise();
    queue.enqueue(fn3.promise).catch(() => {});

    expect(queue.getQueueLength()).toBe(3);

    queue.clear();
    expect(queue.getQueueLength()).toBe(0);

    await vi.runAllTicks();
    expect(fn1.viFn).toBeCalledTimes(0);
    expect(fn2.viFn).toBeCalledTimes(0);
    expect(fn3.viFn).toBeCalledTimes(0);
  });

  test("flush", async () => {
    const interval = 5000;
    const { PriorityThrottledQueue } = await import("./throttle-queue");
    const queue = new PriorityThrottledQueue(interval);
    queue.start();

    const fn1 = mockPromise();
    queue.enqueue(fn1.promise);
    const fn2 = mockPromise();
    queue.enqueue(fn2.promise);
    const fn3 = mockPromise();
    queue.enqueue(fn3.promise);

    expect(fn1.viFn).toHaveBeenCalledTimes(0);
    expect(fn2.viFn).toHaveBeenCalledTimes(0);
    expect(fn3.viFn).toHaveBeenCalledTimes(0);

    await queue.flush();
    expect(fn1.viFn).toHaveBeenCalledTimes(1);
    expect(fn2.viFn).toHaveBeenCalledTimes(1);
    expect(fn3.viFn).toHaveBeenCalledTimes(1);
  });

  test.each([50, 100, 200, 500, 1000, 1500, 2000, 3000, 5000])(
    "rate of throttle queue at %sms",
    async (interval) => {
      const { PriorityThrottledQueue } = await import("./throttle-queue");
      const queue = new PriorityThrottledQueue(interval);
      queue.start();

      const REPEAT = 100;

      const fn1 = mockPromise();

      for (let i = 0; i < REPEAT; i++) {
        queue.enqueue(fn1.promise);
      }

      await vi.advanceTimersByTime(queue.tickTime);
      expect(fn1.viFn).toHaveBeenCalledTimes(1);

      for (let i = 0; i < REPEAT - 1; i++) {
        await vi.advanceTimersByTime(interval);
        expect(fn1.viFn).toHaveBeenCalledTimes(i + 2);
      }
    },
  );

  test("queue does not auto start", async () => {
    const interval = 5000;
    const { PriorityThrottledQueue } = await import("./throttle-queue");
    const queue = new PriorityThrottledQueue(interval);

    const fn1 = mockPromise();
    queue.enqueue(fn1.promise);

    await vi.advanceTimersByTime(queue.tickTime + interval);

    expect(fn1.viFn).toHaveBeenCalledTimes(0);

    queue.start();
    await vi.advanceTimersByTime(interval);
    expect(fn1.viFn).toHaveBeenCalledTimes(1);
  });

  test("runs task immediately after clear+restart within throttle interval", async () => {
    const interval = 5000;
    const { PriorityThrottledQueue } = await import("./throttle-queue");
    const queue = new PriorityThrottledQueue(interval);
    queue.start();

    const fn1 = mockPromise();
    queue.enqueue(fn1.promise);
    await vi.advanceTimersByTime(queue.tickTime);
    await vi.runAllTicks();
    expect(fn1.viFn).toHaveBeenCalledTimes(1);

    // Simulate navigating away within the throttle window, then back
    await vi.advanceTimersByTime(1000);
    queue.clear();
    queue.start();

    const fn2 = mockPromise();
    queue.enqueue(fn2.promise);

    // Should fire after just tickTime — clear() resets the throttle window
    await vi.advanceTimersByTime(queue.tickTime);
    await vi.runAllTicks();
    expect(fn2.viFn).toHaveBeenCalledTimes(1);
  });
});
