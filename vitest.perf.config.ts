// vitest.perf.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      idb: path.resolve(__dirname, "./test-utils/mocks/idb.js"),
    },
  },
  test: {
    environment: "jsdom",
    watch: false,
    setupFiles: ["./test-utils/jsdom-setup.ts"],
    include: ["**/*.perf-test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "**/visual/**"],
    // Reassure-measure reads `expect.getState().currentTestName` as a global,
    // following Jest convention.
    globals: true,
    // Reassure needs measurements written sequentially to a single file.
    fileParallelism: false,
  },
});
