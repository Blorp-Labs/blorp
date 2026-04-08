import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import tanstackQuery from "@tanstack/eslint-plugin-query";
import unusedImports from "eslint-plugin-unused-imports";
import importX from "eslint-plugin-import-x";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import { restrictions } from "./eslint/restricted-syntax.js";
import { importRestrictions } from "./eslint/restricted-imports.js";
import {
  queryHookNaming,
  mutationHookNaming,
  noQueryHooksInComponents,
} from "./eslint/rules.js";

const SRC_FOLDERS = [
  "apis",
  "components",
  "features",
  "hooks",
  "lib",
  "queries",
  "routing",
  "stores",
  "styles",
  "tanstack-query",
];

function buildRestrictedSrcZone(target, from) {
  if (!SRC_FOLDERS.includes(target)) {
    throw new Error(`Invalid src target folder "${target}"`);
  }
  for (const folder of from) {
    if (!SRC_FOLDERS.includes(folder)) {
      throw new Error(`Invalid src folder "${folder}"`);
    }
  }
  return {
    target: `./src/${target}`,
    from: SRC_FOLDERS.filter((f) => !from.includes(f) && f !== target).map(
      (f) => `./src/${f}`,
    ),
  };
}

const local = {
  rules: {
    "query-hook-naming": queryHookNaming,
    "mutation-hook-naming": mutationHookNaming,
    "no-query-hooks-in-components": noQueryHooksInComponents,
  },
};

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
    plugins: { local },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-namespace": "off",
      "no-empty": "warn",
      "prefer-const": "warn",
      "no-useless-assignment": "warn",
      curly: ["warn", "all"],
      "no-restricted-syntax": ["error", ...restrictions],
      "no-restricted-imports": ["error", importRestrictions],
      "local/query-hook-naming": "error",
      "local/mutation-hook-naming": "error",
    },
  },
  {
    files: ["src/components/**/*.ts", "src/components/**/*.tsx"],
    plugins: { local },
    rules: {
      "local/no-query-hooks-in-components": "error",
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
            buildRestrictedSrcZone("lib", []),
            buildRestrictedSrcZone("apis", ["lib"]),
            buildRestrictedSrcZone("stores", ["lib", "apis"]),
            buildRestrictedSrcZone("tanstack-query", ["lib", "apis", "stores"]),
            buildRestrictedSrcZone("hooks", [
              "lib",
              "apis",
              "stores",
              "tanstack-query",
              "routing",
            ]),
            buildRestrictedSrcZone("queries", [
              "lib",
              "apis",
              "stores",
              "tanstack-query",
              "hooks",
              "routing",
            ]),
            buildRestrictedSrcZone("components", [
              "lib",
              "apis",
              "stores",
              "tanstack-query",
              "hooks",
              // "queries",
              "routing",
            ]),
            buildRestrictedSrcZone("features", [
              "lib",
              "apis",
              "stores",
              "tanstack-query",
              "hooks",
              "queries",
              "components",
              "routing",
            ]),
            buildRestrictedSrcZone("routing", [
              "lib",
              "apis",
              "stores",
              "tanstack-query",
              "queries",
              "components",
              "features",
            ]),
            buildRestrictedSrcZone("styles", []),
          ],
        },
      ],
    },
  },
);
