import { useEffect, useRef } from "react";
import { isAndroid } from "../lib/device";
import { refreshSafeArea } from "../lib/safe-area/register";

/**
 * Android Chrome collapses the system status bar when a video enters
 * fullscreen and does not always restore safe-area insets cleanly on exit.
 * On exit, this hook (a) optionally pops a `videoFullscreen` history entry
 * pushed by the player, then (b) re-reads safe-area insets from the plugin
 * to recover from a stuck status-bar state. No-op on non-Android.
 */
export function useFullscreenVideoContainer<T extends HTMLElement>() {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!isAndroid()) {
      return;
    }
    const el = containerRef.current;
    if (!el) {
      return;
    }

    let wasFullscreen = false;

    const onChange = () => {
      const nowFullscreen = document.fullscreenElement !== null;
      const exited = wasFullscreen && !nowFullscreen;
      wasFullscreen = nowFullscreen;
      if (!exited) {
        return;
      }

      if (
        typeof history !== "undefined" &&
        (history.state as { videoFullscreen?: boolean } | null)?.videoFullscreen
      ) {
        history.back();
      }
      refreshSafeArea();
    };

    el.addEventListener("fullscreenchange", onChange);
    return () => el.removeEventListener("fullscreenchange", onChange);
  }, []);

  return containerRef;
}
