import { getAccountSite, useAuth } from "@/src/stores/auth";
import { useSettingsStore } from "@/src/stores/settings";
import { env } from "@/src/env";

// Structured as a hook so it can be updated to read from a site endpoint in the future.
export function useIsContentWarningActive(): boolean {
  return env.contentWarning.length > 0;
}

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
  const contentWarningActive = useIsContentWarningActive();

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

// True when NSFW posts should be rendered (possibly blurred). Equivalent to
// the old useShouldShowNsfw() in stores/auth.ts.
export function useShouldShowNsfw(): boolean {
  return useNsfwVisibility() !== "hide";
}

// True when rendered NSFW content should be blurred. Equivalent to the old
// useShouldBlurNsfw() in stores/auth.ts.
export function useShouldBlurNsfw(): boolean {
  return useNsfwVisibility() !== "show";
}
