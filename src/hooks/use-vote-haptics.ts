import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { useSettingsStore } from "../stores/settings";
import { useCallback } from "react";

export function useVoteHaptics() {
  const disableHaptics = useSettingsStore((s) => s.disableHaptics);
  return useCallback(
    async (score: number) => {
      if (!disableHaptics) {
        await Haptics.impact({
          style: score === 0 ? ImpactStyle.Medium : ImpactStyle.Heavy,
        });
      }
    },
    [disableHaptics],
  );
}
