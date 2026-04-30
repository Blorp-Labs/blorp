import { Bench } from "tinybench";
import { render } from "@testing-library/react";
import { expect } from "vitest";
import _ from "lodash";
import type React from "react";

export interface PerfThresholds {
  /** Median per-render duration in ms. Test fails if exceeded. */
  medianMs: number;
  /** Optional p99 cap in ms. Test fails if exceeded. */
  p99Ms?: number;
}

export interface PerfOptions {
  /** Total ms tinybench spends on the task (default 1000). */
  timeMs?: number;
  /** Warmup iterations (default 5). */
  warmupIterations?: number;
  /** Warmup time in ms (default 100). */
  warmupTimeMs?: number;
}

function median(samples: number[]): number {
  if (samples.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  const sorted = _.sortBy(samples);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? _.mean([sorted[mid - 1]!, sorted[mid]!])
    : sorted[mid]!;
}

/**
 * Renders `factory()` repeatedly via tinybench, then asserts the median (and
 * optionally p99) per-render duration is under the supplied thresholds.
 *
 * Set `BLORP_PERF_LOG=1` to print per-test stats — useful for calibrating
 * thresholds against a known-good baseline.
 */
export async function expectRenderUnder(
  name: string,
  factory: () => React.ReactElement,
  thresholds: PerfThresholds,
  options: PerfOptions = {},
): Promise<void> {
  const bench = new Bench({
    time: options.timeMs ?? 1000,
    warmupTime: options.warmupTimeMs ?? 100,
    warmupIterations: options.warmupIterations ?? 5,
    throws: true,
  });

  bench.add(name, () => {
    const handle = render(factory());
    handle.unmount();
  });

  await bench.run();

  const result = bench.tasks[0]?.result;
  if (!result) {
    throw new Error(`tinybench produced no result for "${name}"`);
  }
  const med = median(result.samples);

  if (process.env["BLORP_PERF_LOG"] === "1") {
    const fmt = (n: number) => n.toFixed(3);
    console.log(
      `[perf] ${name.padEnd(28)} median=${fmt(med)}ms ` +
        `mean=${fmt(result.mean)}ms p99=${fmt(result.p99)}ms ` +
        `samples=${result.samples.length} ` +
        `threshold(median)=${thresholds.medianMs}ms` +
        (thresholds.p99Ms ? ` threshold(p99)=${thresholds.p99Ms}ms` : ""),
    );
  }

  expect(
    med,
    `${name}: median render time ${med.toFixed(2)}ms exceeded threshold ${thresholds.medianMs}ms`,
  ).toBeLessThan(thresholds.medianMs);

  if (thresholds.p99Ms !== undefined) {
    expect(
      result.p99,
      `${name}: p99 render time ${result.p99.toFixed(2)}ms exceeded threshold ${thresholds.p99Ms}ms`,
    ).toBeLessThan(thresholds.p99Ms);
  }
}
