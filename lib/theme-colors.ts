// The page colour of each theme (--bg in app/globals.css). Phones paint the status bar and the
// browser's chrome with it, and the installed app uses the light one while it opens.
export const THEME_COLORS = { light: "#ffffff", dark: "#191918" } as const;

/** Point every theme-color meta tag at the theme the app is showing, whatever the OS prefers. */
export function syncThemeColor(theme: "light" | "dark"): void {
  const color = THEME_COLORS[theme];
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", color));
}
