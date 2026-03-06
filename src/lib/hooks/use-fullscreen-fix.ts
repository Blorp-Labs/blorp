import { useRef, useEffect } from "react";
import { StatusBar } from "@capacitor/status-bar";
import { SafeArea } from "capacitor-plugin-safe-area";
import { isCapacitor, isAndroid } from "@/src/lib/device";

/**
 * Fixes Android fullscreen issues for any embed that supports
 * native HTML fullscreen:
 * - Hides status bar during fullscreen
 * - Enables Android hardware back button to exit fullscreen
 * - Refreshes safe area insets after exiting fullscreen
 *
 * Usage: attach the returned ref to the container element.
 */
export function useFullscreenFix<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    let wasFullscreen = false;

    const handlePopState = () => {
      if (wasFullscreen && document.fullscreenElement) {
        document.exitFullscreen();
      }
    };

    const handleFullscreenChange = () => {
      const fsElement = document.fullscreenElement;

      if (fsElement && containerRef.current?.contains(fsElement)) {
        wasFullscreen = true;

        if (isCapacitor()) {
          StatusBar.hide();
        }

        if (isAndroid()) {
          window.history.pushState({ videoFullscreen: true }, "");
          window.addEventListener("popstate", handlePopState);
        }
      } else if (!fsElement && wasFullscreen) {
        wasFullscreen = false;

        if (isCapacitor()) {
          StatusBar.show();
        }

        if (isAndroid()) {
          window.removeEventListener("popstate", handlePopState);
          if (window.history.state?.videoFullscreen) {
            window.history.back();
          }
        }

        SafeArea.getSafeAreaInsets().then(({ insets }) => {
          for (const [key, value] of Object.entries(insets)) {
            document.documentElement.style.setProperty(
              `--ion-safe-area-${key}`,
              `${value}px`,
            );
          }
        });
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return containerRef;
}
