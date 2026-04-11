import { getAccountSite, useAuth } from "./auth";
import z from "zod";
import {
  useSettingsStore,
  type ScoreDisplay,
  type ThresholdSetting,
  type VoteDisplaySetting,
} from "./settings";
import { type Schemas } from "../apis/api-blueprint";

// ─── Pure logic (exported for testing) ──────────────────────────────────────

export function mergeCacheObject<TSchema extends z.ZodType>(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined,
  schema: TSchema,
): Record<string, z.infer<TSchema>> {
  type T = z.infer<TSchema>;
  let result: Record<string, T> = {};

  try {
    const firstKey = Object.keys(a ?? {})[0];
    if (firstKey && schema.safeParse(a?.[firstKey]).success) {
      result = { ...result, ...(a as Record<string, T>) };
    }
  } catch {}

  try {
    const firstKey = Object.keys(b ?? {})[0];
    if (firstKey && schema.safeParse(b?.[firstKey]).success) {
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

export function scoreDisplayFromSite(
  voteDisplaySetting: VoteDisplaySetting,
  site: Schemas.Site | undefined,
): ScoreDisplay {
  if (voteDisplaySetting !== "account") {
    return voteDisplaySetting;
  }

  // "account" mode — derive from account/server settings.
  // When both showUpvotes and showDownvotes are enabled Lemmy ignores
  // showScores and shows separate counts; we treat that as combined score
  // since the visual result is equivalent.
  const serverEnablesDownvotes = site?.enableCommentDownvotes ?? true;
  const showUpvotes = site?.showUpvotes ?? true;
  // Treat showDownvotes as false when the server has disabled downvotes entirely.
  const showDownvotes = (site?.showDownvotes ?? true) && serverEnablesDownvotes;
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

export function shouldShowDownvotes(
  voteDisplaySetting: VoteDisplaySetting,
  serverCapability: boolean,
  scoreDisplay: ScoreDisplay,
): boolean {
  if (voteDisplaySetting === "none") {
    return false;
  }
  if (voteDisplaySetting === "account") {
    // Use the resolved display mode rather than site.showDownvotes directly.
    // e.g. "score" mode has showDownvotes=false on the account but the
    // downvote button should still appear when the server supports it.
    return scoreDisplay !== "none" && serverCapability;
  }
  // Any explicit display mode still shows the downvote button if the server allows it.
  return serverCapability;
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

export function useScoreDisplay(): ScoreDisplay {
  const voteDisplaySetting = useSettingsStore((s) => s.voteDisplaySetting);
  const site = useAuth((s) => getAccountSite(s.getSelectedAccount()));
  return scoreDisplayFromSite(voteDisplaySetting, site);
}

export function useShouldShowDownvotes(
  serverCapabilityKey: "enablePostDownvotes" | "enableCommentDownvotes",
): boolean {
  const voteDisplaySetting = useSettingsStore((s) => s.voteDisplaySetting);
  const serverCapability =
    useAuth(
      (s) => getAccountSite(s.getSelectedAccount())?.[serverCapabilityKey],
    ) ?? true;
  const scoreDisplay = useScoreDisplay();
  return shouldShowDownvotes(
    voteDisplaySetting,
    serverCapability,
    scoreDisplay,
  );
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
