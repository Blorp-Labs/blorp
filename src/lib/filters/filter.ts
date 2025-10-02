import { FilterFile, Condition, FilterCtx } from "./schema";
import _ from "lodash";

function nfkcCasefold(input: string) {
  input = input.toLowerCase();
  try {
    return input.normalize("NFKD");
  } catch {
    return input;
  }
}

function removeDiacritics(input: string) {
  return input.replace(/[\u0300-\u036f]/g, "");
}

// Are Unicode property escapes supported? (Node 10+, modern browsers)
const HAS_U_PROPERTY = (() => {
  try {
    new RegExp("\\p{L}", "u");
    return true;
  } catch {
    return false;
  }
})();

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build a fast "whole word" regex for a given word.
 * - Unicode-aware when supported (letters/numbers/marks/underscore are word chars).
 * - Falls back to ASCII word boundaries (\b) otherwise.
 */
export function buildWordRegex(word: string, { caseInsensitive = true } = {}) {
  if (!word) throw new Error("word must be non-empty");
  const w = escapeRegExp(word);

  if (HAS_U_PROPERTY) {
    // Word chars = letters, numbers, combining marks, connector punctuation (e.g. _)
    const WORD = "\\p{L}\\p{N}\\p{M}\\p{Pc}";
    // Start: start-of-string or NOT a word char
    // End: end-of-string or NOT a word char
    const pattern = `(?:^|[^${WORD}])${w}(?=$|[^${WORD}])`;
    return new RegExp(pattern, caseInsensitive ? "iu" : "u");
  }

  // ASCII fallback: \b is fine for [A-Za-z0-9_]
  const pattern = `\\b${w}\\b`;
  return new RegExp(pattern, caseInsensitive ? "i" : "");
}

/** One-shot helper */
export function containsWholeWord(
  text: string,
  word: string,
  opts?: { caseInsensitive?: boolean },
) {
  return buildWordRegex(word, opts).test(text);
}

/**
 * All is applied in order, so if there is a less expensive
 * filter in the list, we should apply that one first.
 */
export function optimizeFilterFile(file: FilterFile) {
  file = _.cloneDeep(file);
  for (const rule of file.rules) {
    rule.all?.sort((a, b) => {
      const aIsAny = "any" in a;
      const bIsAny = "any" in b;
      if (aIsAny && !bIsAny) {
        return 1;
      }
      if (bIsAny && !aIsAny) {
        return -1;
      }
      if (aIsAny && bIsAny) {
        return a.any.length - b.any.length;
      }
      return 0;
    });
  }
  return file;
}

function applyAll(all: (Condition | { any: Condition[] })[], ctx: FilterCtx) {
  for (const cond of all ?? []) {
    if ("any" in cond) {
      if (!applyAny(cond.any, ctx)) {
        return false;
      }
      continue;
    }

    const fields: (keyof FilterCtx)[] = [];
    if (cond.title) {
      fields.push("title");
    }
    if (cond.body) {
      fields.push("body");
    }
    if (cond.communityName) {
      fields.push("communityName");
    }
    if (cond.userName) {
      fields.push("userName");
    }

    for (const field of fields) {
      const text = ctx[field];

      if (_.isNil(text)) {
        continue;
      }

      switch (cond.op) {
        case "exact":
          if (text !== cond.pattern) {
            return false;
          }
          break;
        case "substring":
          if (!text.includes(cond.pattern)) {
            return false;
          }
          break;
        case "word":
          if (!containsWholeWord(text, cond.pattern)) {
            return false;
          }
          break;
      }
    }
  }
  return true;
}

function applyAny(any: (Condition | { all: Condition[] })[], ctx: FilterCtx) {
  for (const cond of any ?? []) {
    if ("all" in cond) {
      if (applyAny(cond.all, ctx)) {
        return true;
      }
      continue;
    }

    const fields: (keyof FilterCtx)[] = [];
    if (cond.title) {
      fields.push("title");
    }
    if (cond.body) {
      fields.push("body");
    }
    if (cond.communityName) {
      fields.push("communityName");
    }
    if (cond.userName) {
      fields.push("userName");
    }

    for (const field of fields) {
      const text = ctx[field];

      if (_.isNil(text)) {
        continue;
      }

      switch (cond.op) {
        case "exact":
          if (text === cond.pattern) {
            return true;
          }
          break;
        case "substring":
          if (text.includes(cond.pattern)) {
            return true;
          }
          break;
        case "word":
          if (containsWholeWord(text, cond.pattern)) {
            return true;
          }
          break;
      }
    }
  }

  return false;
}

export function applyFilters(input: FilterCtx, filter: FilterFile) {
  let { title, body, userName, communityName } = input;

  if (filter.options.strip_diacritics) {
    title = title ? removeDiacritics(title) : title;
    body = body ? removeDiacritics(body) : body;
    userName = userName ? removeDiacritics(userName) : userName;
    communityName = communityName
      ? removeDiacritics(communityName)
      : communityName;
  }

  switch (filter.options.normalize) {
    case "nfkc_casefold": {
      title = title ? nfkcCasefold(title) : title;
      body = body ? nfkcCasefold(body) : body;
      userName = userName ? nfkcCasefold(userName) : userName;
      communityName = communityName
        ? nfkcCasefold(communityName)
        : communityName;
    }
  }

  const normalizedInput = {
    title,
    body,
    communityName,
    userName,
  };

  for (const rule of filter.rules) {
    if (rule.any) {
      if (applyAny(rule.any, normalizedInput)) {
        return rule;
      }
    }

    if (rule.all) {
      if (applyAll(rule.all, normalizedInput)) {
        return rule;
      }
    }
  }
}
