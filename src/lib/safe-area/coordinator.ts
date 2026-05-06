import { Insets, ZERO_INSETS } from "./sources";

export type Coordinator = {
  setRawInsets: (insets: Insets) => void;
  setKeyboardShowing: (showing: boolean) => void;
  getEffectiveInsets: () => Insets;
  isKeyboardShowing: () => boolean;
};

export function createCoordinator(initial: Insets = ZERO_INSETS): Coordinator {
  let raw = initial;
  let keyboardShowing = false;

  return {
    setRawInsets: (insets) => {
      raw = insets;
    },
    setKeyboardShowing: (showing) => {
      keyboardShowing = showing;
    },
    getEffectiveInsets: () => (keyboardShowing ? { ...raw, bottom: 0 } : raw),
    isKeyboardShowing: () => keyboardShowing,
  };
}
