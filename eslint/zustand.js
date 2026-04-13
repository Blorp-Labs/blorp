// Custom ESLint rule for enforcing safe usage of Zustand's persist middleware.
//
//   zustand-persist-migrate — every persist store must define a migrate function
//
// The purpose of migrate here is not step-by-step schema transformation — it is
// defensive rollback protection. If a user ran a newer version of the app and then
// downgraded, Zustand will load state written by the newer version. Without migrate,
// Zustand silently discards that state. With migrate (using passthrough().parse()),
// known fields are validated and unknown fields from the newer schema are kept harmlessly.

/**
 * Rule: zustand-persist-migrate
 *
 * Requires a `migrate` function on every Zustand persist store, regardless of version.
 * Purpose: rollback protection — if a user ran a newer app version and downgraded, Zustand
 * will encounter state written by the newer version. Without migrate, it discards it silently.
 *
 * @example
 * // ✅ OK
 * persist(creator, { name: "store", migrate: (state) => schema.passthrough().parse(state) })
 *
 * // ✅ OK
 * persist(creator, { name: "store", version: 2, migrate: (state) => schema.passthrough().parse(state) })
 *
 * // ❌ Error — no migrate function
 * persist(creator, { name: "store", version: 0 })
 *
 * // ❌ Error — no migrate function even without a version key
 * persist(creator, { name: "store" })
 */
export const zustandPersistMigrate = {
  meta: {
    type: "problem",
    docs: {
      description:
        'Every Zustand persist store must define a "migrate" function',
    },
    messages: {
      missingMigrate:
        'persist store "{{name}}" has no "migrate" function. ' +
        "Add a migrate function (e.g. persistedSchema.passthrough().parse(state)) so that state " +
        "written by a newer app version survives a rollback instead of being silently discarded.",
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

        // Every persist store needs migrate — even without an explicit version
        // key, or at version 0. A user who ran a newer version and then rolled
        // back will have state written by that newer version, and without
        // migrate Zustand discards it on load.
        //
        // Skip only if version is explicitly a non-numeric value (dynamic),
        // since we can't statically reason about that case.
        const versionProp = properties.find((p) => p.key.name === "version");
        if (
          versionProp &&
          (versionProp.value.type !== "Literal" ||
            typeof versionProp.value.value !== "number")
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
          data: { name: storeName },
        });
      },
    };
  },
};
