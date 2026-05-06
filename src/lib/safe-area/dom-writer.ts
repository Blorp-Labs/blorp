import { Insets } from "./sources";

export function applyInsets(insets: Insets) {
  for (const [key, value] of Object.entries(insets)) {
    document.documentElement.style.setProperty(
      `--ion-safe-area-${key}`,
      `${value}px`,
    );
  }
}

export function applyKeyboardHeight(px: number) {
  document.body.style.setProperty(
    "--keyboard-height",
    px === 0 ? "0" : `${px}px`,
  );
}
