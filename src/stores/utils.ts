import { getAccountSite, useAuth } from "./auth";
import { useSettingsStore, type VoteSetting } from "./settings";

function resolveVoteSetting(
  setting: VoteSetting,
  accountValue: boolean,
  serverCapability: boolean,
): boolean {
  const map: Record<VoteSetting, boolean> = {
    hide: false,
    show: serverCapability,
    account: accountValue && serverCapability,
  };
  return map[setting];
}

export function useShouldShowDownvotes(
  serverCapabilityKey: "enablePostDownvotes" | "enableCommentDownvotes",
): boolean {
  const downvotesSetting = useSettingsStore((s) => s.downvotesSetting);
  const serverCapability =
    useAuth(
      (s) => getAccountSite(s.getSelectedAccount())?.[serverCapabilityKey],
    ) ?? true;
  const accountShowsDownvotes =
    useAuth((s) => getAccountSite(s.getSelectedAccount())?.showDownvotes) ??
    true;
  return resolveVoteSetting(
    downvotesSetting,
    accountShowsDownvotes,
    serverCapability,
  );
}

// How vote counts are displayed in the UI.
// "score"    → combined score in the middle between buttons
// "upvotes"  → upvote count on the left, separator before downvote button
// "downvotes"→ downvote count on the right, separator after upvote button
// "none"     → no count shown
export type ScoreDisplay = "none" | "score" | "upvotes" | "downvotes";

export function useScoreDisplay(): ScoreDisplay {
  const scoresSetting = useSettingsStore((s) => s.scoresSetting);
  const site = useAuth((s) => getAccountSite(s.getSelectedAccount()));

  if (scoresSetting === "hide") return "none";
  if (scoresSetting === "show") return "score";

  // "account" mode — derive from account settings.
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
