import { Keyboard } from "@capacitor/keyboard";
import { StatusBar } from "@capacitor/status-bar";
import { SafeArea, SafeAreaInsets } from "capacitor-plugin-safe-area";
import { Capacitor } from "@capacitor/core";
import { TextZoom } from "@capacitor/text-zoom";
import { isAndroid, isCapacitor, isIos } from "./device";
import _ from "lodash";

function registerSafeArea() {
  let keyboardShowing = false;

  const updateInsets = ({ insets }: SafeAreaInsets) => {
    for (const [key, value] of Object.entries(insets)) {
      document.documentElement.style.setProperty(
        `--ion-safe-area-${key}`,
        // if keyboard open, assume no safe area inset
        `${keyboardShowing && key === "bottom" ? 0 : value}px`,
      );
    }
  };

  if (!Capacitor.isNativePlatform()) {
    const readAndApplyInsets = () => {
      const el = document.createElement("div");
      el.style.cssText =
        "position:fixed;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);pointer-events:none;visibility:hidden";
      document.body.appendChild(el);
      const style = getComputedStyle(el);
      updateInsets({
        insets: {
          top: parseFloat(style.paddingTop) || 0,
          right: parseFloat(style.paddingRight) || 0,
          bottom: parseFloat(style.paddingBottom) || 0,
          left: parseFloat(style.paddingLeft) || 0,
        },
      });
      document.body.removeChild(el);
    };

    readAndApplyInsets();
    window.addEventListener("resize", readAndApplyInsets);

    if (window.visualViewport && isIos()) {
      const onViewportResize = () => {
        const keyboardHeight = Math.max(
          0,
          window.innerHeight - window.visualViewport!.height,
        );
        const wasShowing = keyboardShowing;
        keyboardShowing = keyboardHeight > 50;
        document.body.style.setProperty(
          "--keyboard-height",
          `${keyboardShowing ? keyboardHeight : 0}px`,
        );
        if (wasShowing !== keyboardShowing) {
          readAndApplyInsets();
        }
      };

      window.visualViewport.addEventListener("resize", onViewportResize);
      // Counteract iOS scrolling the page up when keyboard opens
      window.visualViewport.addEventListener("scroll", () => {
        window.scrollTo(0, 0);
        onViewportResize();
      });
    }

    return;
  }

  SafeArea.getSafeAreaInsets().then(updateInsets);
  SafeArea.addListener("safeAreaChanged", updateInsets);
  StatusBar.setOverlaysWebView({ overlay: true });

  const debouncedUpdateInset = _.debounce(
    () => SafeArea.getSafeAreaInsets().then(updateInsets),
    50,
  );
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      debouncedUpdateInset();
    }
  });
  window.addEventListener("focus", debouncedUpdateInset);

  if (!isAndroid()) {
    Keyboard.addListener("keyboardWillShow", (info) => {
      keyboardShowing = true;
      document.body.style.setProperty(
        "--keyboard-height",
        `${info.keyboardHeight}px`,
      );
      SafeArea.getSafeAreaInsets().then(updateInsets);
    });

    Keyboard.addListener("keyboardDidShow", (info) => {
      keyboardShowing = true;
      document.body.style.setProperty(
        "--keyboard-height",
        `${info.keyboardHeight}px`,
      );
      SafeArea.getSafeAreaInsets().then(updateInsets);
    });

    Keyboard.addListener("keyboardDidHide", () => {
      keyboardShowing = false;
      document.body.style.setProperty("--keyboard-height", "0");
      SafeArea.getSafeAreaInsets().then(updateInsets);
    });

    Keyboard.addListener("keyboardWillHide", () => {
      keyboardShowing = false;
      document.body.style.setProperty("--keyboard-height", "0");
      SafeArea.getSafeAreaInsets().then(updateInsets);
    });
  }
}

async function accesibleTextSize() {
  const pref = await TextZoom.getPreferred();
  await TextZoom.set({ value: pref.value });
}

export function applyCapacitorFixes() {
  // This one is special in that we call
  // is even when were not a native app
  registerSafeArea();

  const mightChange = () => {
    if (isCapacitor()) {
      accesibleTextSize();
    }
  };

  mightChange();
  const debouncedRehydrate = _.debounce(mightChange, 50);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      debouncedRehydrate();
    }
  });
  window.addEventListener("focus", debouncedRehydrate);
}
