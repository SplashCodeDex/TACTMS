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

---

## 2025-08-05: Build Fixes, Code Splitting, and PWA Enhancements

**Author:** Gemini (facilitated by CodeDeX)

### Change Summary

Addressed various build errors, implemented code splitting for improved performance, and further enhanced PWA capabilities based on best practices from PWABuilder.

### Architectural Decisions & Reasoning

1.  **Resolved Build Errors:**
    *   **Problem:** Several TypeScript errors (`TS2448`, `TS2454`, `TS2304`, `TS2307`) were preventing successful builds after initial PWA configuration. These included `addToast` being used before declaration, `isOffline` being undefined, `CloudOff` not imported, and `react-tooltip` type declaration issues.
    *   **Solution:**
        *   Reordered `usePWAFeatures` call after `addToast` definition in `src/App.tsx`.
        *   Introduced `isOffline` state with `online`/`offline` event listeners in `src/App.tsx`.
        *   Imported `CloudOff` from `lucide-react` in `src/components/Sidebar.tsx`.
        *   Installed `react-tooltip` package and adjusted its usage in `src/components/SyncStatusIndicator.tsx` to align with its API (removing `effect` prop).
    *   **Reasoning:** Ensuring a clean build is fundamental for stable development and deployment.

2.  **Implemented Code Splitting:**
    *   **Problem:** The application had a large initial JavaScript bundle size, leading to slower load times, especially on slower networks.
    *   **Solution:** Utilized `React.lazy` and `Suspense` to dynamically import major view components (`DashboardSection`, `FavoritesView`, `AnalyticsSection`, `ReportsSection`, `MemberDatabaseSection`, `CommandPalette`, `ListOverviewActionsSection`, `ConfigurationSection`) in `src/App.tsx`.
    *   **Reasoning:** Code splitting reduces the initial load burden by only loading code for the parts of the application that are immediately needed, significantly improving perceived performance and user experience.

3.  **Enhanced PWA Features (PWABuilder Recommendations):**
    *   **Problem:** The PWA could benefit from advanced features to improve user engagement and offline experience.
    *   **Solution:**
        *   **App Shortcuts:** Added `shortcuts` to the `vite.config.ts` manifest for quick access to "Tithe Processor" and "Member Database" from the home screen.
        *   **Offline Analytics:** Integrated `workbox-background-sync` to queue analytics events (`download_excel`) when offline, ensuring data is sent once connectivity is restored. A new `src/services/offline-analytics.ts` module was created for this purpose.
        *   **Custom Offline Page:** Created a `public/offline.html` page and configured the service worker (`src/sw.ts`) to serve this custom page when a navigation request fails due to being offline.
        *   **Service Worker Update Flow ("Skip Waiting"):** Implemented a mechanism in `src/App.tsx` and `src/hooks/usePWAFeatures.ts` to detect new service worker versions and prompt the user to reload the application to activate the update.
    *   **Reasoning:** These enhancements improve the PWA's installability, reliability, and overall user experience, making it feel more like a native application.

### Impact

The application is now more stable, loads faster, and offers a richer, more resilient PWA experience. Users will benefit from quicker access to key features, seamless offline operation, and timely updates.

---

## 2025-08-05: UI/UX Improvements - Responsive Layout and Logo Consistency

**Author:** Gemini (facilitated by CodeDeX)

### Change Summary

Addressed inconsistencies in the application's layout on mobile devices and fixed the logo's scaling behavior in the sidebar.

### Architectural Decisions & Reasoning

1.  **Improved Responsive Layout:**
    *   **Problem:** The application's layout appeared "messy" on mobile devices, indicating a lack of proper responsiveness and potential conflicts with fixed dimensions.
    *   **Solution:**
        *   Removed `overflow: hidden;` from the `body` in `src/index.css` to allow natural content scrolling.
        *   Refined CSS for `.app-container`, `.sidebar`, and `.main-content` in `src/index.css` to use `min-height: 100vh;` and ensure flexible margins and widths, especially within media queries for smaller screens. This allows content to expand and prevents horizontal overflow.
    *   **Reasoning:** A responsive design is crucial for a consistent and usable experience across all device sizes, from desktop to mobile.

2.  **Fixed Inconsistent Logo Scaling:**
    *   **Problem:** The application logo in the sidebar exhibited inconsistent scaling and transforming behavior when the sidebar expanded or collapsed, likely due to a mix of CSS transitions and `framer-motion` animations.
    *   **Solution:**
        *   Removed conflicting CSS height classes (`h-16`, `h-24`) and `transition-all` from the logo `img` tag in `src/components/Sidebar.tsx`.
        *   Wrapped the `img` tag with `motion.img` and introduced `logoVariants` to control the logo's `height` directly via `framer-motion`'s `animate` prop based on the `isCollapsed` state.
    *   **Reasoning:** Consolidating animations under `framer-motion` provides a single source of truth for transitions, ensuring smoother and more predictable visual behavior.

### Impact

The application now offers a significantly improved visual experience on mobile devices, with a more adaptive layout. The sidebar and logo animations are smoother and more consistent, contributing to a polished and professional user interface.
