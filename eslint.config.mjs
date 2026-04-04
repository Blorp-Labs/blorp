import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import tanstackQuery from "@tanstack/eslint-plugin-query";
import unusedImports from "eslint-plugin-unused-imports";
import importX from "eslint-plugin-import-x";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import { restrictions } from "./eslint/restricted-syntax.js";
import { importRestrictions } from "./eslint/restricted-imports.js";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "android/**",
      "ios/**",
      "src-tauri/**",
      "public/**",
      ".dependency-cruiser.cjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  ...tanstackQuery.configs["flat/recommended"],
  {
    rules: {
      "@tanstack/query/exhaustive-deps": "off",
    },
  },
  {
    plugins: { "unused-imports": unusedImports },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-namespace": "off",
      "no-empty": "warn",
      "prefer-const": "warn",
      "no-useless-assignment": "warn",
      curly: ["warn", "all"],
      "no-restricted-syntax": ["error", ...restrictions],
      "no-restricted-imports": ["error", importRestrictions],
    },
  },
  {
    files: ["src/stores/**", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    files: ["scripts/**"],
    languageOptions: {
      globals: { process: "readonly" },
    },
  },
  {
    plugins: { "import-x": importX },
    settings: {
      "import-x/resolver-next": [
        createTypeScriptImportResolver({ alwaysTryTypes: true }),
      ],
    },
    rules: {
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            // api-blueprint: allow []
            {
              target: "./src/api-blueprint.ts",
              from: [
                "./src/lib",
                "./src/stores",
                "./src/tanstack-query",
                "./src/hooks",
                "./src/api",
                "./src/components",
                "./src/features",
                "./src/routing",
                "./src/styles",
              ],
            },
            // lib: allow [api-blueprint]
            {
              target: "./src/lib",
              from: [
                "./src/stores",
                "./src/tanstack-query",
                "./src/hooks",
                "./src/api",
                "./src/components",
                "./src/features",
                "./src/routing",
                "./src/styles",
              ],
            },
            // stores: allow [api-blueprint, lib]
            {
              target: "./src/stores",
              from: [
                "./src/tanstack-query",
                "./src/hooks",
                "./src/api",
                "./src/components",
                "./src/features",
                "./src/routing",
                "./src/styles",
              ],
            },
            // tanstack-query: allow [api-blueprint, lib, stores]
            {
              target: "./src/tanstack-query",
              from: [
                "./src/hooks",
                "./src/api",
                "./src/components",
                "./src/features",
                "./src/routing",
                "./src/styles",
              ],
            },
            // hooks: allow [api-blueprint, lib, stores, tanstack-query]
            {
              target: "./src/hooks",
              from: [
                "./src/api",
                "./src/components",
                "./src/features",
                "./src/routing",
                "./src/styles",
              ],
            },
            // api: allow [api-blueprint, lib, stores, tanstack-query, hooks, routing]
            {
              target: "./src/api",
              from: ["./src/components", "./src/features", "./src/styles"],
            },
            // components: allow [api-blueprint, lib, stores, tanstack-query, hooks, api, components, routing]
            {
              target: "./src/components",
              from: ["./src/features", "./src/styles"],
            },
            // features: allow [api-blueprint, lib, stores, tanstack-query, hooks, api, components, features, routing]
            {
              target: "./src/features",
              from: ["./src/styles"],
            },
            // routing: allow [api-blueprint, lib, stores, tanstack-query, hooks, api, components, features]
            {
              target: "./src/routing",
              from: ["./src/routing", "./src/styles"],
            },
            // styles: allow []
            {
              target: "./src/styles",
              from: [
                "./src/lib",
                "./src/stores",
                "./src/tanstack-query",
                "./src/hooks",
                "./src/api",
                "./src/components",
                "./src/features",
                "./src/routing",
              ],
            },
          ],
        },
      ],
    },
  },
);
