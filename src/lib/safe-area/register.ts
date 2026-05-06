import { Keyboard } from "@capacitor/keyboard";
import { StatusBar } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";
import _ from "lodash";
import { isAndroid } from "../device";
import {
  createNativeSource,
  createWebEnvSource,
  InsetSource,
  ZERO_INSETS,
} from "./sources";
import { createCoordinator } from "./coordinator";
import { applyInsets, applyKeyboardHeight } from "./dom-writer";

let activeRefresh: (() => void) | null = null;

export function refreshSafeArea() {
  activeRefresh?.();
}

export function registerSafeArea() {
  const isNative = Capacitor.isNativePlatform();
  const source: InsetSource = isNative
    ? createNativeSource()
    : createWebEnvSource();
  const coord = createCoordinator();
  const ac = new AbortController();

  const pull = () =>
    source.get().then((insets) => {
      coord.setRawInsets(insets);
      applyInsets(coord.getEffectiveInsets());
    });

  activeRefresh = () => {
    pull();
  };

  if (!isNative) {
    applyInsets(ZERO_INSETS);
    return () => ac.abort();
  }

  pull();
  source.subscribe((insets) => {
    coord.setRawInsets(insets);
    applyInsets(coord.getEffectiveInsets());
  });
  StatusBar.setOverlaysWebView({ overlay: true });

  const debouncedPull = _.debounce(pull, 50);
  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden) {
        // iOS dismisses the keyboard when the app is backgrounded, but
        // keyboardDidHide never fires while in the background, so reset
        // keyboard state on return to foreground to avoid stuck insets.
        coord.setKeyboardShowing(false);
        applyKeyboardHeight(0);
        debouncedPull();
      }
    },
    { signal: ac.signal },
  );
  window.addEventListener("focus", debouncedPull, { signal: ac.signal });

  if (!isAndroid()) {
    const onShow = (info: { keyboardHeight: number }) => {
      coord.setKeyboardShowing(true);
      applyKeyboardHeight(info.keyboardHeight);
      pull();
    };
    const onHide = () => {
      coord.setKeyboardShowing(false);
      applyKeyboardHeight(0);
      pull();
    };
    Keyboard.addListener("keyboardWillShow", onShow);
    Keyboard.addListener("keyboardDidShow", onShow);
    Keyboard.addListener("keyboardDidHide", onHide);
    Keyboard.addListener("keyboardWillHide", onHide);
  }

  return () => ac.abort();
}
