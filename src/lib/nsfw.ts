import { getAccountSite, useAuth } from "@/src/stores/auth";
import { useSettingsStore } from "@/src/stores/settings";
import { env } from "@/src/env";

export function useNsfwVisibility(): "hide" | "blur" | "show" {
  const isLoggedIn = useAuth((s) => s.isLoggedIn());
  const showNsfw = useAuth(
    (s) => getAccountSite(s.getSelectedAccount())?.showNsfw,
  );
  const blurNsfw = useAuth(
    (s) => getAccountSite(s.getSelectedAccount())?.blurNsfw,
  );
  const contentWarningAccepted = useSettingsStore(
    (s) => s.contentWarningAccepted,
  );
  const contentWarningActive = env.contentWarning.length > 0;

  if (isLoggedIn) {
    if (!showNsfw) {
      return "hide";
    }
    return blurNsfw ? "blur" : "show";
  }

  if (contentWarningActive && contentWarningAccepted) {
    return "show";
  }

  return "hide";
}
