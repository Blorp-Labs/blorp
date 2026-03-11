import { getAccountSite, useAuth } from "./auth";
import {
  useSettingsStore,
  type ScoreDisplay,
  type VoteDisplaySetting,
} from "./settings";

export function useShouldShowDownvotes(
  serverCapabilityKey: "enablePostDownvotes" | "enableCommentDownvotes",
): boolean {
  const voteDisplaySetting = useSettingsStore((s) => s.voteDisplaySetting);
  const serverCapability =
    useAuth(
      (s) => getAccountSite(s.getSelectedAccount())?.[serverCapabilityKey],
    ) ?? true;
  const scoreDisplay = useScoreDisplay();

  if (voteDisplaySetting === "none") return false;
  if (voteDisplaySetting === "account") {
    // Use the resolved display mode rather than site.showDownvotes directly.
    // e.g. "score" mode has showDownvotes=false on the account but the
    // downvote button should still appear when the server supports it.
    return scoreDisplay !== "none" && serverCapability;
  }
  // Any explicit display mode still shows the downvote button if the server allows it.
  return serverCapability;
}

export function useScoreDisplay(): ScoreDisplay {
  const voteDisplaySetting = useSettingsStore((s) => s.voteDisplaySetting);
  const site = useAuth((s) => getAccountSite(s.getSelectedAccount()));

  if (voteDisplaySetting !== "account") return voteDisplaySetting;

  // "account" mode — derive from account/server settings.
  // When both showUpvotes and showDownvotes are enabled Lemmy ignores
  // showScores and shows separate counts; we treat that as combined score
  // since the visual result is equivalent.
  const serverEnablesDownvotes = site?.enableCommentDownvotes ?? true;
  const showUpvotes = site?.showUpvotes ?? true;
  // Treat showDownvotes as false when the server has disabled downvotes entirely.
  const showDownvotes = (site?.showDownvotes ?? true) && serverEnablesDownvotes;
  const showScores = site?.showScores ?? true;

  if (showUpvotes && showDownvotes) return "score";
  if (showUpvotes) return "upvotes";
  if (showDownvotes) return "downvotes";
  if (showScores) return "score";
  return "none";
}

export function useCommentCollapseThreshold(): number | null {
  const setting = useSettingsStore((s) => s.collapseThresholdSetting);
  const accountThreshold = useAuth(
    (s) => getAccountSite(s.getSelectedAccount())?.replyCollapseThreshold,
  );
  if (setting === "account") {
    return accountThreshold ?? null;
  }
  return setting;
}

export function useCommentHideThreshold(): number | null {
  const setting = useSettingsStore((s) => s.hideThresholdSetting);
  const accountThreshold = useAuth(
    (s) => getAccountSite(s.getSelectedAccount())?.replyHideThreshold,
  );
  if (setting === "account") {
    return accountThreshold ?? null;
  }
  return setting;
}

// Re-export so consumers don't need to import from two places.
export type { ScoreDisplay, VoteDisplaySetting };
