import { useEffect, useMemo, useState } from "react";
import { APP_ACCENT_COLOR_KEY, APP_THEME_STORAGE_KEY, THEME_OPTIONS } from "../constants";

export type ThemeMode = "dark" | "light";

export function useThemePreferences() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const storedTheme = (localStorage.getItem(APP_THEME_STORAGE_KEY) as ThemeMode | null) || undefined;
    if (storedTheme) return storedTheme;
    return "dark";
  });

  const [accentColor, setAccentColor] = useState(() => {
    const storedColorKey = localStorage.getItem(APP_ACCENT_COLOR_KEY);
    return THEME_OPTIONS.find((t) => t.key === storedColorKey) || THEME_OPTIONS[0];
  });

  // Persist theme
  useEffect(() => {
    try {
      localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
    } catch (e) {
      console.error("Failed to save theme preference:", e);
    }
  }, [theme]);

  // Apply and persist accent color
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary-hue", accentColor.values.h.toString());
    root.style.setProperty("--primary-saturation", `${accentColor.values.s}%`);
    root.style.setProperty("--primary-lightness", `${accentColor.values.l}%`);
    try {
      localStorage.setItem(APP_ACCENT_COLOR_KEY, accentColor.key);
    } catch (e) {
      console.error("Failed to save accent color:", e);
    }
  }, [accentColor]);

  return useMemo(() => ({ theme, setTheme, accentColor, setAccentColor }), [theme, accentColor]);
}
