// Custom ESLint rules for enforcing query/mutation naming conventions.
// These three rules work together as a system:
//
//   1. query-hook-naming    — useQuery may only be called inside a hook ending in "Query"
//   2. mutation-hook-naming — useMutation may only be called inside a hook ending in "Mutation"
//   3. no-query-hooks-in-components — components cannot import hooks ending in "Query"
//
// The goal is to make "does this touch the network?" visible in the name of every hook,
// and to prevent data-fetching hooks from creeping into the components folder (where they
// can cause silent extra API calls on mount).

/**
 * Walk up the AST from `node` and return the name of the nearest enclosing
 * function. Returns an empty string if the nearest function is anonymous,
 * and null if there is no enclosing function at all.
 */
function getEnclosingFunctionName(node) {
  let current = node.parent;
  while (current) {
    if (
      current.type === "FunctionDeclaration" ||
      current.type === "FunctionExpression" ||
      current.type === "ArrowFunctionExpression"
    ) {
      // function foo() {}
      if (current.id?.name) return current.id.name;

      // const foo = () => {}  or  const foo = function() {}
      if (
        current.parent?.type === "VariableDeclarator" &&
        current.parent.id?.type === "Identifier"
      ) {
        return current.parent.id.name;
      }

      // Unnamed function expression — stop searching, don't climb further.
      return "";
    }
    current = current.parent;
  }
  return null;
}

/**
 * Rule 1: useQuery may only be called inside a hook whose name ends in "Query".
 *
 * This makes it immediately obvious from the call site that a hook fetches data,
 * and prevents useQuery from being called directly inside components or
 * arbitrarily-named helpers where it is easy to miss.
 *
 * @example
 * // ✅ OK
 * function usePostsQuery() { return useQuery({...}); }
 *
 * // ❌ Error
 * function usePosts() { return useQuery({...}); }
 */
export const queryHookNaming = {
  meta: {
    type: "problem",
    docs: {
      description:
        'useQuery may only be called inside a hook whose name ends in "Query"',
    },
    messages: {
      badName:
        'useQuery can only be called inside a hook ending in "Query" (e.g. usePostsQuery). ' +
        "Rename this hook or extract a dedicated query hook.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type !== "Identifier" ||
          node.callee.name !== "useQuery"
        ) {
          return;
        }
        const name = getEnclosingFunctionName(node);
        if (name === null || !name.endsWith("Query")) {
          context.report({ node, messageId: "badName" });
        }
      },
    };
  },
};

/**
 * Rule 2: useMutation may only be called inside a hook whose name ends in "Mutation".
 *
 * Symmetric to queryHookNaming. Keeps mutation hooks clearly labelled and
 * prevents useMutation from being embedded in components or generic helpers.
 *
 * @example
 * // ✅ OK
 * function useLikeCommentMutation() { return useMutation({...}); }
 *
 * // ❌ Error
 * function useLikeComment() { return useMutation({...}); }
 */
export const mutationHookNaming = {
  meta: {
    type: "problem",
    docs: {
      description:
        'useMutation may only be called inside a hook whose name ends in "Mutation"',
    },
    messages: {
      badName:
        'useMutation can only be called inside a hook ending in "Mutation" (e.g. useLikeCommentMutation). ' +
        "Rename this hook or extract a dedicated mutation hook.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type !== "Identifier" ||
          node.callee.name !== "useMutation"
        ) {
          return;
        }
        const name = getEnclosingFunctionName(node);
        if (name === null || !name.endsWith("Mutation")) {
          context.report({ node, messageId: "badName" });
        }
      },
    };
  },
};

/**
 * Rule 3: Files in src/components may not import hooks ending in "Query".
 *
 * "Query" hooks fetch data and re-run on mount, which causes silent extra API
 * calls when a component is used in contexts where the data is already loaded.
 * Components should receive data via props or read it from a store.
 *
 * Apply this rule only to src/components/** via the `files` config option.
 * Use an eslint-disable comment (with a brief explanation) for the rare
 * legitimate exceptions such as hover-card components that own their own fetch.
 *
 * @example
 * // ❌ Error (in src/components/*)
 * import { usePostsQuery } from "@/src/queries";
 *
 * // ✅ OK — read from the store instead
 * import { usePostFromStore } from "@/src/stores/posts";
 */
export const noQueryHooksInComponents = {
  meta: {
    type: "problem",
    docs: {
      description:
        'Hooks ending in "Query" cannot be imported inside the components folder',
    },
    messages: {
      forbidden:
        '"{{name}}" is a query hook (ends in "Query") and cannot be imported in the components folder. ' +
        "Read from the store or receive data as a prop instead. " +
        "If this component genuinely owns its own fetch (e.g. a hover card), " +
        "add an eslint-disable-next-line comment with a brief explanation.",
    },
  },
  create(context) {
    return {
      ImportSpecifier(node) {
        const name = node.imported.name;
        if (name.endsWith("Query")) {
          context.report({ node, messageId: "forbidden", data: { name } });
        }
      },
    };
  },
};
