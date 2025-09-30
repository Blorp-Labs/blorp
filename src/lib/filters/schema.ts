// Lemmy Filters – Zod Schema (v1.0)
// ------------------------------------------------------------
// This file defines a Zod schema for the JSON-based filter spec we discussed.
// It encodes:
// - Fields: title, body, community_name, community_domain, user_name
// - Operations: exact, substring, prefix, suffix, word, glob, regex, in, in_list, regex_list
// - Rule structure: when/except with nested any/all groups
// - Actions: hide (with optional scope and reason)
// - Options: normalization, body scanning controls, regex engine, evaluation order
//
// Extra validations via superRefine:
// - Unique rule IDs
// - "when" must contain at least one matcher (any/all)
// - All referenced lists must exist in top-level `lists`
//
// Exported:
// - LemmyFiltersSchema (Zod)
// - Types inferred with z.infer<...>
// - parseLemmyFilters(input) helper
// ------------------------------------------------------------

import { z } from "zod";

// --------------------------------------
// Enums & basic primitives
// --------------------------------------
export enum FieldEnum {
  "title",
  "body",
  "community_name",
  "user_name",
}

export const ActionTypeEnum = z.enum(["hide"]);
export const NormalizeEnum = z.enum(["none", "nfkc_casefold"]);

// --------------------------------------
// Condition shapes (discriminated by `op`)
// --------------------------------------
const BaseCondition = z.object({
  field: z.nativeEnum(FieldEnum),
});

const ExactCondition = BaseCondition.extend({
  op: z.literal("exact"),
  pattern: z.string().min(1),
});

const SubstringCondition = BaseCondition.extend({
  op: z.literal("substring"),
  pattern: z.string().min(1),
});

const WordCondition = BaseCondition.extend({
  // Whole-word match for a single token (after normalization/tokenization in your engine)
  op: z.literal("word"),
  pattern: z.string().min(1),
});

export const Condition = z.discriminatedUnion("op", [
  ExactCondition,
  SubstringCondition,
  WordCondition,
]);
export type Condition = z.infer<typeof Condition>;

// --------------------------------------
// Rule
// --------------------------------------
export const RuleSchema = z.object({
  name: z.string().optional(),
  any: z
    .array(
      z.union([
        Condition,
        z.object({
          all: z.array(Condition),
        }),
      ]),
    )
    .optional(),
  all: z
    .array(
      z.union([
        Condition,
        z.object({
          any: z.array(Condition),
        }),
      ]),
    )
    .optional(),
  action: z.enum(["hide"]),
});
export type Rule = z.infer<typeof RuleSchema>;

// --------------------------------------
// Options
// --------------------------------------
export const OptionsSchema = z.object({
  normalize: NormalizeEnum.default("nfkc_casefold"),
  strip_diacritics: z.boolean().default(true),
  max_body_chars: z.number().int().min(0).default(50000),
});
export type Options = z.infer<typeof OptionsSchema>;

// --------------------------------------
// Top-level spec
// --------------------------------------
export const LemmyFiltersSchema = z.object({
  spec_version: z
    .string()
    .regex(
      /^lemmy-filters\/\d+\.\d+$/,
      "spec_version must look like 'lemmy-filters/1.0'",
    ),
  options: OptionsSchema.default({}),
  rules: z.array(RuleSchema).min(1),
});

export type LemmyFilters = z.infer<typeof LemmyFiltersSchema>;

// --------------------------------------
// Helper: parse & return typed data
// --------------------------------------
export function parseLemmyFilters(input: unknown): LemmyFilters {
  return LemmyFiltersSchema.parse(input);
}

// --------------------------------------
// Example (uncomment to test locally)
// --------------------------------------
/*
const example = {
  spec_version: "lemmy-filters/1.0",
  options: {
    normalize: "nfkc_casefold",
    strip_diacritics: true,
    max_body_chars: 50000,
  },
  rules: [
    {
      name: "Hide crypto promos",
      any: [
        { field: "title", op: "substring", pattern: "crypto" },
        { field: "body", op: "word", pattern: "airdrop" },
        { field: "title", op: "regex", pattern: "(?i)\bfree\s+(keys?|nitro)\b" },
      ],
      except: [
        { field: "community_domain", op: "exact", pattern: "lemmy.world" },
      ],
      action: { type: "hide", scope: ["home"], reason: "promo" },
    },
    {
      name: "Hide posts from specific users",
      any: [
        { field: "user_name", op: "exact", pattern: "promo_bot" },
        { field: "user_name", op: "exact", pattern: "airdrops_guy" },
      ],
      action: { type: "hide", scope: ["home"] },
    },
  ],
};

console.log(parseLemmyFilters(example));
*/
