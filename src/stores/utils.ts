import { getAccountSite, useAuth } from "./auth";
import z from "zod";
import {
  useSettingsStore,
  type ScoreDisplay,
  type ThresholdSetting,
  type VoteDisplaySetting,
} from "./settings";
import _ from "lodash";
import { type Schemas } from "../apis/api-blueprint";

// ─── Pure logic (exported for testing) ──────────────────────────────────────

const MERGE_CACHE_SAMPLE_SIZE = 10;
export function mergeCacheObject<TSchema extends z.ZodType>(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined,
  schema: TSchema,
): Record<string, z.infer<TSchema>> {
  type T = z.infer<TSchema>;
  let result: Record<string, T> = {};

  try {
    const aKeys = Object.keys(a ?? {});
    const success = _.every(
      _.compact([
        _.first(aKeys),
        _.last(aKeys),
        ..._.sampleSize(aKeys, MERGE_CACHE_SAMPLE_SIZE),
      ]).map((key) => schema.safeParse(a?.[key]).success),
    );
    if (success) {
      result = { ...result, ...(a as Record<string, T>) };
    }
  } catch {}

  try {
    const bKeys = Object.keys(b ?? {});
    const success = _.every(
      _.compact([
        _.first(bKeys),
        _.last(bKeys),
        ..._.sampleSize(bKeys, MERGE_CACHE_SAMPLE_SIZE),
      ]).map((key) => schema.safeParse(b?.[key]).success),
    );
    if (success) {
      result = { ...result, ...(b as Record<string, T>) };
    }
  } catch {}

  return result;
}

export function mergeCacheArray<TSchema extends z.ZodType>(
  a: unknown[] | undefined,
  b: unknown[] | undefined,
  schema: TSchema,
): z.infer<TSchema>[] {
  type T = z.infer<TSchema>;
  let aItems: T[] = [];
  let bItems: T[] = [];

  try {
    if (a && a.length > 0 && schema.safeParse(a[0]).success) {
      aItems = a as T[];
    }
  } catch {}

  try {
    if (b && b.length > 0 && schema.safeParse(b[0]).success) {
      bItems = b as T[];
    }
  } catch {}

  return [...aItems, ...bItems];
}

/**
 * Resolve user score preference with what the server allows
 *
 * Exported for testing
 */
export function scoreDisplayPreference(
  voteDisplayAppSetting: VoteDisplaySetting,
  site: Schemas.Site | undefined,
): ScoreDisplay {
  if (voteDisplayAppSetting !== "account") {
    return voteDisplayAppSetting;
  }

  // "account" mode — derive from account/server settings.
  // When both showUpvotes and showDownvotes are enabled Lemmy ignores
  // showScores and shows separate counts; we treat that as combined score
  // since the visual result is equivalent.
  const showUpvotes = site?.showUpvotes ?? true;
  const showDownvotes = site?.showDownvotes ?? true;
  const showScores = site?.showScores ?? true;

  if (showUpvotes && showDownvotes) {
    return "score";
  }
  if (showUpvotes) {
    return "upvotes";
  }
  if (showDownvotes) {
    return "downvotes";
  }
  if (showScores) {
    return "score";
  }
  return "none";
}

export function resolveThreshold(
  setting: ThresholdSetting,
  accountThreshold: number | undefined,
): number | null {
  if (setting === "account") {
    return accountThreshold ?? null;
  }
  return setting;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useScoreDisplayPreference(): ScoreDisplay {
  const voteDisplaySetting = useSettingsStore((s) => s.voteDisplaySetting);
  const site = useAuth((s) => getAccountSite(s.getSelectedAccount()));
  return scoreDisplayPreference(voteDisplaySetting, site);
}

export function useServerEnablesDownvotes(
  serverCapabilityKey: "enablePostDownvotes" | "enableCommentDownvotes",
): boolean {
  const serverAllowsDownvotes =
    useAuth(
      (s) => getAccountSite(s.getSelectedAccount())?.[serverCapabilityKey],
    ) ?? true;
  return serverAllowsDownvotes;
}

export function useCommentCollapseThreshold(): number | null {
  const setting = useSettingsStore((s) => s.collapseThresholdSetting);
  const accountThreshold = useAuth(
    (s) => getAccountSite(s.getSelectedAccount())?.replyCollapseThreshold,
  );
  return resolveThreshold(setting, accountThreshold);
}

export function useCommentHideThreshold(): number | null {
  const setting = useSettingsStore((s) => s.hideThresholdSetting);
  const accountThreshold = useAuth(
    (s) => getAccountSite(s.getSelectedAccount())?.replyHideThreshold,
  );
  return resolveThreshold(setting, accountThreshold);
}

// Re-export so consumers don't need to import from two places.
export type { ScoreDisplay, VoteDisplaySetting };
