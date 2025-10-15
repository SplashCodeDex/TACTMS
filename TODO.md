## Project Review TODO List

This document outlines the identified issues and recommended actions for the TACTMS project, based on a critical review of the codebase.

---

### **1. General Project Cleanup & Configuration**

*   **Issue:** `bfg-1.15.0.jar` is an unused, one-time tool.
    *   **Action:** Delete `bfg-1.15.0.jar`. (Already completed)
*   **Issue:** `errors.md` is used for manual error logging, which is not a good practice.
    *   **Action:** Delete `errors.md`. Implement a proper logging mechanism (e.g., using a dedicated logging library or service). (Already completed)
*   **Issue:** `package.json` `build` script is not cross-platform.
    *   **Action:** Change the `build` script from `"node_modules\.bin\tsc && vite build"` to `"tsc && vite build"`.
*   **Issue:** `vite.config.ts` `base` path is an absolute URL, which can cause issues in some environments.
    *   **Action:** Change the `base` path from `"https://splashcodedex.github.io/TACTMS/"` to `"/TACTMS/"`.
*   **Issue:** `manifest` is defined redundantly in both `manifest.webmanifest` and `vite.config.ts`.
    *   **Action:** Remove the `manifest` object from `vite.config.ts` and ensure `vite-plugin-pwa` correctly uses `manifest.webmanifest`.

---

### **2. Progressive Web App (PWA) Enhancements & Fixes**

*   **Issue:** `manifest.webmanifest` is missing a `maskable` icon.
    *   **Action:** Add at least one icon with `purpose: "maskable"` to the `icons` array in `manifest.webmanifest`.
*   **Issue:** `manifest.webmanifest` references missing `widgets/summary.json` and `widgets/summary_data.json`.
    *   **Action:** Create the `widgets` directory and the `summary.json` and `summary_data.json` files, or remove the `widgets` feature from the manifest if it's not going to be implemented soon.
*   **Issue:** `src/sw.ts` references API endpoints (`/api/sync-data`, `/api/updates`, `api/analytics`) that are not implemented in the provided project structure.
    *   **Action:** Implement the necessary backend API endpoints for these service worker functionalities. (Note: This is a backend task, outside the scope of frontend fixes, but crucial for full PWA functionality).
*   **Issue:** `src/sw.ts` `openWindow` call in `notificationclick` uses `./` which might be incorrect for subdirectory deployments.
    *   **Action:** Change `self.clients.openWindow('./')` to `self.clients.openWindow('/TACTMS/')` for consistency with the base path.
*   **Issue:** `src/hooks/usePWAFeatures.ts` `VAPID_PUBLIC_KEY` is a placeholder.
    *   **Action:** Replace `"YOUR_PUBLIC_VAPID_KEY"` with the actual VAPID public key from the backend.
*   **Issue:** `src/hooks/usePWAFeatures.ts` has a TODO to send push subscription to the backend.
    *   **Action:** Implement the backend logic to receive and store push notification subscriptions.
*   **Issue:** `src/hooks/usePWAFeatures.ts` uses `any` types for `addToast` parameters.
    *   **Action:** Update `addToast` parameters to use specific types from `Toast.tsx` (e.g., `ToastMessage['type']`, `ToastAction[]`).
*   **Issue:** `src/hooks/usePWAFeatures.ts` casts `registration` to `any` for `sync` and `periodicSync`.
    *   **Action:** Install `@types/serviceworker` and use the correct types for `registration` to avoid `any` casts.
*   **Issue:** `src/hooks/usePWAFeatures.ts` uses `periodic-background-sync` permission, which is Chrome-specific.
    *   **Action:** Add a fallback or graceful degradation for browsers that do not support `periodic-background-sync`.

---

### **3. Code Quality & Maintainability**

*   **Issue:** `src/App.tsx` is a "God Component" with excessive state and logic.
    *   **Action:** Break down `App.tsx` into smaller, more focused components. Consider using a state management library (e.g., Zustand, `useReducer` + `useContext`) to manage global state and reduce prop drilling.
*   **Issue:** `src/components/BarChart.tsx` and `src/components/DonutChart.tsx` cast `motion` components to `React.FC<any>`.
    *   **Action:** Define proper types for the props of `motion.rect`, `motion.text`, `motion.circle`, and `motion.span` to avoid `any`.
*   **Issue:** `src/components/BarChart.tsx` has hardcoded `chartHeight`, `barWidth`, and `barMargin`.
    *   **Action:** Make `chartHeight`, `barWidth`, and `barMargin` configurable props to improve reusability.
*   **Issue:** `src/components/BarChart.tsx` is not fully responsive.
    *   **Action:** Implement responsive design for the `BarChart` component, allowing it to adapt to different screen sizes.
*   **Issue:** `src/components/BarChart.tsx` `getPath` and `getAreaPath` functions are complex.
    *   **Action:** Refactor `getPath` and `getAreaPath` into smaller, more readable helper functions or a dedicated utility.
*   **Issue:** `src/components/BarChart.tsx` month labels are hardcoded.
    *   **Action:** Generate month labels dynamically based on the data or locale.
*   **Issue:** `src/components/Button.tsx` uses `React.cloneElement(icon as any, ...)`.
    *   **Action:** Refine the `leftIcon` and `rightIcon` prop types to ensure they are compatible with `lucide-react` components and pass the `size` prop directly without `any` casting.
*   **Issue:** `src/components/InfoTooltip.tsx` `position` prop is defined but not used.
    *   **Action:** Implement the `position` prop to control the tooltip's placement, or remove it if not intended for use.
*   **Issue:** `src/components/MagicCard.tsx` uses `motion/react` instead of `framer-motion`.
    *   **Action:** Change `import { motion, useMotionTemplate, useMotionValue } from "motion/react";` to `import { motion, useMotionTemplate, useMotionValue } from "framer-motion";` for consistency with other `framer-motion` usages.
*   **Issue:** `src/hooks/useGoogleDriveQuery.ts` `gapi` object is typed as `any`.
    *   **Action:** Install `@types/gapi` and use the correct types for `window.gapi`.
*   **Issue:** `src/hooks/useGoogleDriveQuery.ts` uses non-null assertion operator `!`.
    *   **Action:** Replace `fileId!` with proper null/undefined checks.
*   **Issue:** `src/hooks/useGoogleDriveQuery.ts` has a TODO to use constants for filenames.
    *   **Action:** Replace hardcoded filenames with constants from `constants.ts`.
*   **Issue:** `src/hooks/useGoogleDriveSync.ts` `gapi`, `google`, and `tokenClient` objects are typed as `any`.
    *   **Action:** Install `@types/gapi` and `@types/google.accounts` and use the correct types.
*   **Issue:** `src/hooks/useGoogleDriveSync.ts` error handling could be more specific.
    *   **Action:** Enhance error messages to provide more detailed feedback to the user during sync failures.
*   **Issue:** `src/hooks/useWorker.ts` `error` state and `MessageEvent` are typed as `any`.
    *   **Action:** Use more specific types for `error` and `MessageEvent` data.
*   **Issue:** `src/services/excelProcessor.ts` `parseExcelFile` function is duplicated in `excel.worker.ts`.
    *   **Action:** Extract `parseExcelFile` into a shared utility file (e.g., `src/lib/excelUtils.ts`) and import it where needed.
*   **Issue:** `src/services/excelProcessor.ts` `exportToExcel` `data` parameter is typed as `any[]`.
    *   **Action:** Change `data: any[]` to `data: TitheRecordB[]`.
*   **Issue:** `src/services/excelProcessor.ts` `createTitheList` function is complex.
    *   **Action:** Break down `createTitheList` into smaller, more focused helper functions to improve readability and maintainability.
*   **Issue:** `src/services/excelProcessor.test.ts` has missing tests for `exportToExcel`, `filterMembersByAge`, `reconcileMembers`, and `parseExcelFile`.
    *   **Action:** Add comprehensive unit tests for these untested functions.
*   **Issue:** `src/services/offline-analytics.ts` `event` parameter is typed as `any`.
    *   **Action:** Define a specific type for the `event` parameter.
*   **Issue:** `src/sections/AnalyticsSection.tsx` `AISummaryCard` has a `formattedSummary` function similar to `formatMarkdown`.
    *   **Action:** Refactor `AISummaryCard` to use the shared `formatMarkdown` utility from `src/lib/markdown.ts`.
*   **Issue:** `src/sections/DashboardSection.tsx` `listData` and `member` in `stats` `useMemo` are typed as `any`.
    *   **Action:** Replace `any` types with specific types (`MasterListData`, `MemberRecordA`).
*   **Issue:** `src/sections/DashboardSection.tsx` `onGenerateValidationReport` prop is passed but unused.
    *   **Action:** Remove the `onGenerateValidationReport` prop from `DashboardSectionProps`.
*   **Issue:** `src/sections/MemberDatabaseSection.tsx` table lacks pagination and sorting.
    *   **Action:** Implement pagination and sorting functionality for the member database table.
*   **Issue:** `src/sections/MemberDatabaseSection.tsx` tab and table styling is inconsistent.
    *   **Action:** Update the styling of tabs and the table to align with the application's design system.
*   **Issue:** `src/sections/ListOverviewActionsSection.tsx` `historicalStats` `useMemo` is complex.
    *   **Action:** Break down the `historicalStats` calculation into smaller, more focused functions or hooks.
*   **Issue:** `src/sections/ReportsSection.tsx` `listData` in `yearSummary` `useMemo` is typed as `any`.
    *   **Action:** Replace `any` types with specific types (`MasterListData`).
*   **Issue:** `src/sections/ReportsSection.tsx` `reportDataByMonth` and `yearSummary` `useMemo` hooks are complex.
    *   **Action:** Extract complex logic within these `useMemo` hooks into separate utility functions or custom hooks.