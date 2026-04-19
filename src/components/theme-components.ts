/**
 * Data attribute values for [data-theme-component], used by theme CSS
 * (e.g. themes.css) to apply component-specific overrides without relying
 * on element type or Radix's internal data-slot attribute.
 */
export const ThemeComponent = {
  Button: "button",
} as const;

export type ThemeComponent =
  (typeof ThemeComponent)[keyof typeof ThemeComponent];
