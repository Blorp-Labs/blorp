import * as React from "react";
import type { Decorator } from "@storybook/react-vite";

export type SafeAreaPreset = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  keyboardHeight?: number;
};

export const safeAreaPresets = {
  iphone15ProPortrait: {
    top: 59,
    right: 0,
    bottom: 34,
    left: 0,
  },
  iphoneSeLandscape: {
    top: 0,
    right: 44,
    bottom: 21,
    left: 44,
  },
  androidGestureBar: {
    top: 24,
    right: 0,
    bottom: 16,
    left: 0,
  },
  androidKeyboardUp: {
    top: 24,
    right: 0,
    bottom: 0,
    left: 0,
    keyboardHeight: 300,
  },
  pwaTallViewport: {
    top: 40,
    right: 0,
    bottom: 0,
    left: 0,
  },
  desktop: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
} satisfies Record<string, SafeAreaPreset>;

export type SafeAreaPresetName = keyof typeof safeAreaPresets;

const INSET_VARS = [
  "--ion-safe-area-top",
  "--ion-safe-area-right",
  "--ion-safe-area-bottom",
  "--ion-safe-area-left",
] as const;

export function withSafeArea(preset: SafeAreaPreset): Decorator {
  return (Story) => {
    React.useLayoutEffect(() => {
      const root = document.documentElement;
      const body = document.body;
      const prevInsets = INSET_VARS.map(
        (v) => [v, root.style.getPropertyValue(v)] as const,
      );
      const prevKeyboard = body.style.getPropertyValue("--keyboard-height");

      root.style.setProperty("--ion-safe-area-top", `${preset.top}px`);
      root.style.setProperty("--ion-safe-area-right", `${preset.right}px`);
      root.style.setProperty("--ion-safe-area-bottom", `${preset.bottom}px`);
      root.style.setProperty("--ion-safe-area-left", `${preset.left}px`);
      body.style.setProperty(
        "--keyboard-height",
        preset.keyboardHeight ? `${preset.keyboardHeight}px` : "0",
      );

      return () => {
        for (const [name, value] of prevInsets) {
          if (value) {
            root.style.setProperty(name, value);
          } else {
            root.style.removeProperty(name);
          }
        }
        if (prevKeyboard) {
          body.style.setProperty("--keyboard-height", prevKeyboard);
        } else {
          body.style.removeProperty("--keyboard-height");
        }
      };
    }, []);
    return <Story />;
  };
}
