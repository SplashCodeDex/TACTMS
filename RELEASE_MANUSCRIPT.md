# TACTMS Release Manuscript

This document tracks the significant architectural decisions, feature implementations, and the reasoning behind them for the TACTMS project.

## 2025-08-05: PWA Configuration and Asset Generation

**Author:** Gemini (facilitated by CodeDeX)

### Change Summary

Resolved critical issues with the Progressive Web App (PWA) configuration to ensure application installability and improve the user experience.

### Architectural Decisions & Reasoning

1.  **Corrected Manifest Icon Paths:**
    *   **Problem:** The browser was unable to load PWA icons because the paths in `vite.config.ts` were absolute (`/img/icons/...`), which did not align with Vite's build output structure.
    *   **Solution:** Modified the icon paths to be relative (`img/icons/...`). This makes the paths more robust and independent of the server's root directory, ensuring icons are correctly located after the build process.

2.  **Added PWA Screenshot Assets:**
    *   **Problem:** The PWA manifest lacked a `screenshots` array, which is recommended for a richer installation UI on supported platforms.
    *   **Solution:** Generated two placeholder SVG images (`screenshot-wide.svg` and `screenshot-narrow.svg`) and placed them in the `public/screenshots` directory. The `vite.config.ts` manifest was updated to include these screenshots, with appropriate metadata for different form factors (desktop and mobile).

3.  **Simplified Service Worker Configuration:**
    *   **Problem:** The `vite.config.ts` contained a redundant `includeAssets` configuration for the PWA icons, which were already being handled by the `workbox.globPatterns` setting.
    *   **Solution:** Removed the `includeAssets` array to eliminate redundancy and simplify the configuration. This makes the service worker setup cleaner and easier to maintain.

### Impact

These changes make the TACTMS application fully PWA-compliant. The application is now correctly installable on user devices, and the installation prompt is enhanced with screenshots, leading to a more professional and trustworthy user experience.