// Custom ESLint rule for enforcing safe usage of Zustand's persist middleware.
//
//   zustand-persist-migrate — persist stores with version > 0 must define a migrate function
//
// Zustand's persist middleware stores a version number alongside the serialized state.
// When the version bumps, Zustand calls the `migrate` function to transform old state
// into the new shape. Without it, Zustand silently discards the stored data (or worse,
// passes incompatible state to the store). Every time you bump `version`, you must also
// provide a `migrate` function that handles all prior versions.

/**
 * Rule: zustand-persist-migrate
 *
 * Requires a `migrate` function whenever a Zustand persist store declares `version > 0`.
 * Version 0 is the initial state — there is nothing to migrate from yet — so it is exempt.
 *
 * @example
 * // ✅ OK — version 0 has no prior versions to migrate from
 * persist(creator, { name: "store", version: 0 })
 *
 * // ✅ OK — migration function is provided
 * persist(creator, { name: "store", version: 2, migrate: (state, from) => { ... } })
 *
 * // ❌ Error — version bumped without a migrate function
 * persist(creator, { name: "store", version: 2 })
 */
export const zustandPersistMigrate = {
  meta: {
    type: "problem",
    docs: {
      description:
        'Zustand persist stores with version > 0 must define a "migrate" function',
    },
    messages: {
      missingMigrate:
        'persist store "{{name}}" is at version {{version}} but has no "migrate" function. ' +
        "Add a migrate function that transforms stored state from each prior version into the current shape. " +
        "Without it, Zustand will silently discard any data stored by older versions of the app.",
    },
  },
  create(context) {
    // Track which local names refer to `persist` imported from zustand/middleware.
    // This prevents false positives when other libraries export a function also
    // named `persist` (e.g. a caching lib, an ORM, etc.).
    const zustandPersistNames = new Set();

    return {
      ImportDeclaration(node) {
        if (node.source.value !== "zustand/middleware") return;
        for (const specifier of node.specifiers) {
          if (
            specifier.type === "ImportSpecifier" &&
            specifier.imported.name === "persist"
          ) {
            zustandPersistNames.add(specifier.local.name);
          }
        }
      },

      CallExpression(node) {
        // Only care about calls that resolve to zustand's `persist`
        if (
          node.callee.type !== "Identifier" ||
          !zustandPersistNames.has(node.callee.name)
        ) {
          return;
        }

        // Second argument must be an object literal (the options bag)
        const options = node.arguments[1];
        if (!options || options.type !== "ObjectExpression") {
          return;
        }

        const properties = options.properties.filter(
          (p) => p.type === "Property" && p.key.type === "Identifier",
        );

        // Require a numeric version > 0 to trigger the rule
        const versionProp = properties.find((p) => p.key.name === "version");
        if (!versionProp) {
          return;
        }
        const versionValue = versionProp.value;
        if (
          versionValue.type !== "Literal" ||
          typeof versionValue.value !== "number" ||
          versionValue.value <= 0
        ) {
          return;
        }

        // Check that a `migrate` key is present in the options
        const hasMigrate = properties.some((p) => p.key.name === "migrate");
        if (hasMigrate) {
          return;
        }

        // Grab the store name for a more useful error message
        const nameProp = properties.find((p) => p.key.name === "name");
        const storeName =
          nameProp?.value?.type === "Literal" &&
          typeof nameProp.value.value === "string"
            ? nameProp.value.value
            : "<unknown>";

        context.report({
          node,
          messageId: "missingMigrate",
          data: { name: storeName, version: versionValue.value },
        });
      },
    };
  },
};
