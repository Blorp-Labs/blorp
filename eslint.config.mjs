import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import tanstackQuery from "@tanstack/eslint-plugin-query";
import unusedImports from "eslint-plugin-unused-imports";
import boundaries from "eslint-plugin-boundaries";
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
    plugins: { boundaries },
    settings: {
      "boundaries/elements": [
        { type: "api-blueprint", pattern: "src/api-blueprint*" },
        { type: "lib", pattern: "src/lib/**/*" },
        { type: "stores", pattern: "src/stores/**/*" },
        { type: "tanstack-query", pattern: "src/tanstack-query/**/*" },
        { type: "hooks", pattern: "src/hooks/**/*" },
        { type: "api", pattern: "src/api/**/*" },
        { type: "components", pattern: "src/components/**/*" },
        { type: "features", pattern: "src/features/**/*" },
        { type: "routing", pattern: "src/routing/**/*" },
        { type: "styles", pattern: "src/styles/**/*" },
      ],
      "boundaries/ignore": ["src/*.{ts,tsx}", "test-utils/**/*"],
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "api-blueprint", allow: [] },
            { from: "lib", allow: ["api-blueprint"] },
            { from: "stores", allow: ["api-blueprint", "lib"] },
            {
              from: "tanstack-query",
              allow: ["api-blueprint", "lib", "stores"],
            },
            {
              from: "hooks",
              allow: ["api-blueprint", "lib", "stores", "tanstack-query"],
            },
            {
              from: "api",
              allow: [
                "api-blueprint",
                "lib",
                "stores",
                "tanstack-query",
                "hooks",
                "routing",
              ],
            },
            {
              from: "components",
              allow: [
                "api-blueprint",
                "lib",
                "stores",
                "tanstack-query",
                "hooks",
                "api",
                "components",
                "routing",
              ],
            },
            {
              from: "features",
              allow: [
                "api-blueprint",
                "lib",
                "stores",
                "tanstack-query",
                "hooks",
                "api",
                "components",
                "features",
                "routing",
              ],
            },
            {
              from: "routing",
              allow: [
                "api-blueprint",
                "lib",
                "stores",
                "tanstack-query",
                "hooks",
                "api",
                "components",
                "features",
              ],
            },
            { from: "styles", allow: [] },
          ],
        },
      ],
    },
  },
);
