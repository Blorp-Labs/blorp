import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import {
  queryHookNaming,
  mutationHookNaming,
  noQueryHooksInComponents,
} from "./rules.js";

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2020, sourceType: "module" },
});

// ─── queryHookNaming ──────────────────────────────────────────────────────────

tester.run("query-hook-naming", queryHookNaming, {
  valid: [
    // function declaration ending in Query
    {
      code: `function usePostsQuery() { return useQuery({}); }`,
    },
    // arrow function assigned to a variable ending in Query
    {
      code: `const usePostsQuery = () => useQuery({});`,
    },
    // function expression assigned to a variable ending in Query
    {
      code: `const usePostsQuery = function() { return useQuery({}); };`,
    },
    // useThrottledInfiniteQuery is also covered
    {
      code: `function usePostsQuery() { return useThrottledInfiniteQuery({}); }`,
    },
    // nested — inner function ends in Query, that's what encloses the call
    {
      code: `
        function useOuter() {
          const useInnerQuery = () => useQuery({});
          return useInnerQuery;
        }
      `,
    },
    // unrelated call — rule only fires on useQuery / useThrottledInfiniteQuery
    {
      code: `function usePosts() { return useSomethingElse({}); }`,
    },
  ],

  invalid: [
    // function name doesn't end in Query
    {
      code: `function usePosts() { return useQuery({}); }`,
      errors: [{ messageId: "badName" }],
    },
    // arrow function variable name doesn't end in Query
    {
      code: `const usePosts = () => useQuery({});`,
      errors: [{ messageId: "badName" }],
    },
    // called at module level — no enclosing function
    {
      code: `useQuery({});`,
      errors: [{ messageId: "badName" }],
    },
    // inside an immediately-invoked anonymous arrow — no name
    {
      code: `const result = (() => useQuery({}))();`,
      errors: [{ messageId: "badName" }],
    },
    // useThrottledInfiniteQuery also requires the Query suffix
    {
      code: `function usePosts() { return useThrottledInfiniteQuery({}); }`,
      errors: [{ messageId: "badName" }],
    },
  ],
});

// ─── mutationHookNaming ───────────────────────────────────────────────────────

tester.run("mutation-hook-naming", mutationHookNaming, {
  valid: [
    // function declaration ending in Mutation
    {
      code: `function useLikePostMutation() { return useMutation({}); }`,
    },
    // arrow function ending in Mutation
    {
      code: `const useLikePostMutation = () => useMutation({});`,
    },
    // factory variable correctly named
    {
      code: `const useLikePostMutation = createLikePostMutation();`,
    },
    // factory callee doesn't match the create.*Mutation pattern — not checked
    {
      code: `const useLikePost = buildLikePost();`,
    },
  ],

  invalid: [
    // function name doesn't end in Mutation
    {
      code: `function useLikePost() { return useMutation({}); }`,
      errors: [{ messageId: "badName" }],
    },
    // arrow function variable name doesn't end in Mutation
    {
      code: `const useLikePost = () => useMutation({});`,
      errors: [{ messageId: "badName" }],
    },
    // called at module level
    {
      code: `useMutation({});`,
      errors: [{ messageId: "badName" }],
    },
    // factory variable doesn't end in Mutation
    {
      code: `const useLikePost = createLikePostMutation();`,
      errors: [{ messageId: "badFactoryName", data: { name: "useLikePost" } }],
    },
    // factory variable has no hook prefix at all
    {
      code: `const likePost = createLikePostMutation();`,
      errors: [{ messageId: "badFactoryName", data: { name: "likePost" } }],
    },
  ],
});

// ─── noQueryHooksInComponents ─────────────────────────────────────────────────

tester.run("no-query-hooks-in-components", noQueryHooksInComponents, {
  valid: [
    // importing a hook that doesn't end in Query — fine
    {
      code: `import { usePostsStore } from "@/src/stores/posts";`,
    },
    // mutation hooks are fine
    {
      code: `import { useLikePostMutation } from "@/src/queries";`,
    },
    // default imports are not checked (rule only looks at ImportSpecifier)
    {
      code: `import usePostsQuery from "@/src/queries";`,
    },
  ],

  invalid: [
    // named import ending in Query
    {
      code: `import { usePostsQuery } from "@/src/queries";`,
      errors: [{ messageId: "forbidden", data: { name: "usePostsQuery" } }],
    },
    // multiple specifiers — only the Query one is flagged
    {
      code: `import { usePostsQuery, usePostsStore } from "@/src/queries";`,
      errors: [{ messageId: "forbidden", data: { name: "usePostsQuery" } }],
    },
    // multiple Query imports — both flagged
    {
      code: `import { usePostsQuery, useCommentsQuery } from "@/src/queries";`,
      errors: [
        { messageId: "forbidden", data: { name: "usePostsQuery" } },
        { messageId: "forbidden", data: { name: "useCommentsQuery" } },
      ],
    },
  ],
});
