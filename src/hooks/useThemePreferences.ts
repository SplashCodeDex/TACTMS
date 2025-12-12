import { useEffect, useMemo, useState, useCallback } from "react";
import { APP_ACCENT_COLOR_KEY, APP_THEME_STORAGE_KEY, THEME_OPTIONS } from "../constants";

export type ThemeMode = "dark" | "light" | "system";

/**
 * Get the system's preferred color scheme
 */
function getSystemTheme(): "dark" | "light" {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "dark";
}

export function useThemePreferences() {
  const [themePreference, setThemePreference] = useState<ThemeMode>(() => {
    const storedTheme = localStorage.getItem(APP_THEME_STORAGE_KEY) as ThemeMode | null;
    return storedTheme || "system";
  });

  // Resolved theme (what's actually applied)
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">(() => {
    const stored = localStorage.getItem(APP_THEME_STORAGE_KEY) as ThemeMode | null;
    if (stored === "dark" || stored === "light") return stored;
    return getSystemTheme();
  });

  const [accentColor, setAccentColor] = useState(() => {
    const storedColorKey = localStorage.getItem(APP_ACCENT_COLOR_KEY);
    return THEME_OPTIONS.find((t) => t.key === storedColorKey) || THEME_OPTIONS[0];
  });

  // Handle system theme changes
  useEffect(() => {
    if (themePreference !== "system") {
      setResolvedTheme(themePreference);
      return;
    }

    // Set initial system theme
    setResolvedTheme(getSystemTheme());

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themePreference]);

  // Persist theme preference
  useEffect(() => {
    try {
      localStorage.setItem(APP_THEME_STORAGE_KEY, themePreference);
    } catch (e) {
      console.error("Failed to save theme preference:", e);
    }
  }, [themePreference]);

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

  // Convenience function to set theme with backward compatibility
  const setTheme = useCallback((mode: ThemeMode | "dark" | "light") => {
    setThemePreference(mode);
  }, []);

  return useMemo(() => ({
    /** The user's preference: dark, light, or system */
    themePreference,
    /** The actually resolved theme: dark or light */
    theme: resolvedTheme,
    /** Set the theme preference (supports "system" option) */
    setTheme,
    accentColor,
    setAccentColor,
    /** Whether currently using system preference */
    isSystemTheme: themePreference === "system"
  }), [themePreference, resolvedTheme, setTheme, accentColor]);
}
