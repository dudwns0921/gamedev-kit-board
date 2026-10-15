// The look is the viewer's choice, kept in a cookie so the server draws the page in it — no flash of the wrong one.

export const THEME_COOKIE = "board_theme";

export const THEMES = [
  { id: "system", label: "System", hint: "Follows this device" },
  { id: "light", label: "Light", hint: "Paper white" },
  { id: "dark", label: "Dark", hint: "Calm slate" },
  { id: "kit", label: "Kit", hint: "The kit's green" },
] as const;

export type Theme = (typeof THEMES)[number]["id"];

export function themeOf(v: string | undefined): Theme {
  return THEMES.some((t) => t.id === v) ? (v as Theme) : "system";
}
