import { Keyboard } from "@capacitor/keyboard";
import { StatusBar } from "@capacitor/status-bar";
import { SafeArea, SafeAreaInsets } from "capacitor-plugin-safe-area";
import { Capacitor } from "@capacitor/core";
import { TextZoom } from "@capacitor/text-zoom";
import { isAndroid, isCapacitor } from "./device";
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
    updateInsets({ insets: { top: 0, right: 0, bottom: 0, left: 0 } });
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
