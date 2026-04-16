// vitest.config.ts
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
    coverage: {
      reporter: ["text", "json-summary", "json", "html"],
      include: ["src/**"],
    },
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "**/visual/**"],
  },
});
