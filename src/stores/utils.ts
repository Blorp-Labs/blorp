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

export function useShouldShowScores(): boolean {
  const scoresSetting = useSettingsStore((s) => s.scoresSetting);
  const site = useAuth((s) => getAccountSite(s.getSelectedAccount()));
  // Lemmy ignores show_scores when show_upvotes or show_downvotes is enabled,
  // so treat any of the three being true as "account shows scores".
  const accountShowsScores = site
    ? (site.showUpvotes ?? true) ||
      (site.showDownvotes ?? true) ||
      (site.showScores ?? true)
    : true;
  return resolveVoteSetting(scoresSetting, accountShowsScores, true);
}
