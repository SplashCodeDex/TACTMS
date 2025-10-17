## Project Review TODO List

This document outlines identified issues and recommended actions for the TACTMS project, based on a critical review of the codebase. It is structured to be easily trackable by AI agents and human developers.

---

### **Legend for Task Status:**

*   `[ ]` : Pending / Uncompleted
*   `[x]` : Completed
*   `[~]` : In Progress (Use sparingly, primarily for active work)

---

### **1. General Project Cleanup & Configuration**

*   **[x] Category:** Configuration Cleanup
    *   **Issue:** `bfg-1.15.0.jar` is an unused, one-time tool.
    *   **Impact/Rationale:** Reduces repository clutter and potential security surface.
    *   **Affected Files:** `bfg-1.15.0.jar`
    *   **Action:** Delete `bfg-1.15.0.jar`.
    *   **Priority:** P3 (Low)

*   **[x] Category:** Logging Improvement
    *   **Issue:** `errors.md` is used for manual error logging, which is not a good practice.
    *   **Impact/Rationale:** Improves error monitoring and debugging; centralizes error handling.
    *   **Affected Files:** `errors.md`
    *   **Action:** Delete `errors.md`. Implement a proper logging mechanism (e.g., using a dedicated logging library or service).
    *   **Priority:** P2 (Medium)

*   **[x] Category:** Build Configuration Fix
    *   **Issue:** `package.json` `build` script uses a Windows-specific path for `tsc`.
    *   **Impact/Rationale:** Ensures cross-platform compatibility for the build process, preventing failures on Linux/macOS environments (including CI/CD).
    *   **Affected Files:** `package.json`
    *   **Action:** Change the `build` script from `"node_modules\.bin\tsc && vite build"` to `"npx tsc && vite build"`.
    *   **Priority:** P1 (High)

*   **[x] Category:** Deployment Configuration
    *   **Issue:** `vite.config.ts` `base` path is an absolute URL, which can cause issues in some environments or when testing locally.
    *   **Impact/Rationale:** Improves flexibility and consistency across different deployment and development environments.
    *   **Affected Files:** `vite.config.ts`
    *   **Action:** Change the `base` path from `"https://splashcodedex.github.io/TACTMS/"` to `"/TACTMS/"`.
    *   **Priority:** P2 (Medium)

*   **[x] Category:** PWA Configuration Redundancy
    *   **Issue:** PWA `manifest` is defined redundantly in both `manifest.webmanifest` and `vite.config.ts`.
    *   **Impact/Rationale:** Reduces duplication, simplifies maintenance, and ensures a single source of truth for the PWA manifest.
    *   **Affected Files:** `manifest.webmanifest`, `vite.config.ts`
    *   **Action:** Remove the `manifest` object from `vite.config.ts` and ensure `vite-plugin-pwa` correctly uses `manifest.webmanifest`.
    *   **Priority:** P2 (Medium)

*   **[x] Category:** Dependency Cleanup
    *   **Issue:** `serve` package is redundant as `vite preview` provides similar functionality.
    *   **Impact/Rationale:** Reduces unnecessary dependencies, leading to a smaller `node_modules` footprint and potentially faster `npm install` times.
    *   **Affected Files:** `package.json`
    *   **Action:** Remove the `serve` package from `devDependencies` and the `serve` script from `package.json`.
    *   **Priority:** P3 (Low)

---

### **2. Progressive Web App (PWA) Enhancements & Fixes**

*   **[x] Category:** PWA Icon Enhancement
    *   **Issue:** `manifest.webmanifest` is missing a `maskable` icon.
    *   **Impact/Rationale:** Improves the appearance of the PWA icon on Android devices, especially when used with adaptive icons.
    *   **Affected Files:** `manifest.webmanifest`
    *   **Action:** Add at least one icon with `purpose: "maskable"` to the `icons` array in `manifest.webmanifest`.
    *   **Priority:** P2 (Medium)

*   **[~] Category:** PWA Feature Implementation (Requires Detailed Specification and Implementation Plan)
    *   **Issue:** `manifest.webmanifest` references missing `widgets/summary.json` and `widgets/summary_data.json`.
    *   **Impact/Rationale:** These references point to unimplemented PWA widget features. Resolving this either implements the feature or removes the broken reference.
    *   **Affected Files:** `manifest.webmanifest`
    *   **Action:** Create the `widgets` directory and the `summary.json` and `summary_data.json` files, or remove the `widgets` feature from the manifest if it's not going to be implemented soon.
    *   **Priority:** P2 (Medium)

*   **[~] Category:** Service Worker Backend Integration (Backend Task)
    *   **Issue:** `src/sw.ts` references API endpoints (`/api/sync-data`, `/api/updates`, `api/analytics`) that are not implemented in the provided project structure.
    *   **Impact/Rationale:** Crucial for full PWA functionality related to background data synchronization and analytics.
    *   **Affected Files:** `src/sw.ts` (and backend services)
    *   **Action:** Implement the necessary backend API endpoints for these service worker functionalities. (Note: This is a backend task, outside the scope of frontend fixes, but crucial for full PWA functionality).
    *   **Priority:** P1 (High)

*   **[~] Category:** Service Worker Frontend Logic (Dependent on Backend & Client-side Data Storage)
    *   **Issue:** `src/sw.ts` contains placeholder logic for background sync (`sync-tithe-data`).
    *   **Impact/Rationale:** Prevents robust offline data submission and synchronization.
    *   **Affected Files:** `src/sw.ts`
    *   **Action:** Implement the actual data synchronization logic within the `sync` event listener in `src/sw.ts` to send pending tithe data to the backend.
    *   **Priority:** P1 (High)

*   **[~] Category:** Service Worker Frontend Logic (Dependent on Backend Implementation)
    *   **Issue:** `src/sw.ts` contains placeholder logic for periodic sync (`get-latest-updates`).
    *   **Impact/Rationale:** Prevents the application from periodically updating data in the background when online.
    *   **Affected Files:** `src/sw.ts`
    *   **Action:** Implement the actual data fetching and cache updating logic within the `periodicsync` event listener in `src/sw.ts` to get the latest updates from the backend.
    *   **Priority:** P2 (Medium)

*   **[x] Category:** Service Worker Cache Management
    *   **Issue:** `src/sw.ts` contains placeholder logic for cache cleanup in the `activate` event listener.
    *   **Impact/Rationale:** Prevents accumulation of old or unused caches, which can consume unnecessary storage on the user's device.
    *   **Affected Files:** `src/sw.ts`
    *   **Action:** Implement a robust cache cleanup strategy within the `activate` event listener in `src/sw.ts` to remove old or unused caches.
    *   **Priority:** P2 (Medium)

*   **[x] Category:** Service Worker Navigation Fix
    *   **Issue:** `src/sw.ts` `openWindow` call in `notificationclick` uses `./` which might be incorrect for subdirectory deployments.
    *   **Impact/Rationale:** Ensures correct navigation when opening the app from a push notification, especially in GitHub Pages deployments.
    *   **Affected Files:** `src/sw.ts`
    *   **Action:** Change `self.clients.openWindow('./')` to `self.clients.openWindow('/TACTMS/')` for consistency with the base path.
    *   **Priority:** P1 (High)

*   **[~] Category:** PWA Custom Event Clarification (Requires Client-side Implementation for PWA Widgets)
    *   **Issue:** `src/sw.ts` listens for a non-standard `widgetclick` event, but no client-side code dispatching this event was found in the `src` directory.
    *   **Impact/Rationale:** This listener is currently inactive and serves no functional purpose. It represents either an unimplemented feature or dead code.
    *   **Affected Files:** `src/sw.ts`
    *   **Action:** Either remove the `widgetclick` listener from `src/sw.ts` or implement the client-side logic to dispatch this event if the feature is intended for future use.
    *   **Priority:** P2 (Medium)

*   **[~] Category:** PWA Push Notification Configuration (Requires User Input/Backend Configuration)
    *   **Issue:** `src/hooks/usePWAFeatures.ts` `VAPID_PUBLIC_KEY` is a placeholder.
    *   **Impact/Rationale:** Push notifications will not function until a valid VAPID public key is provided.
    *   **Affected Files:** `src/hooks/usePWAFeatures.ts`
    *   **Action:** Replace `"YOUR_PUBLIC_VAPID_KEY"` with the actual VAPID public key from the backend.
    *   **Priority:** P1 (High)

*   **[~] Category:** PWA Push Notification Backend Integration (Backend Task)
    *   **Issue:** `src/hooks/usePWAFeatures.ts` has a TODO to send push subscription to the backend.
    *   **Impact/Rationale:** The application cannot send push notifications without a mechanism to store user subscriptions on the backend.
    *   **Affected Files:** `src/hooks/usePWAFeatures.ts` (and backend services)
    *   **Action:** Implement the backend logic to receive and store push notification subscriptions.
    *   **Priority:** P1 (High)

*   **[x] Category:** PWA Type Safety
    *   **Issue:** `src/hooks/usePWAFeatures.ts` uses `any` types for `addToast` parameters.
    *   **Impact/Rationale:** Reduces type safety and makes the code harder to maintain and debug. The `ToastMessage` and `ToastAction` types are clearly defined in `src/components/Toast.tsx` and should be used.
    *   **Affected Files:** `src/hooks/usePWAFeatures.ts`, `src/components/Toast.tsx`
    *   **Action:** Update `addToast` parameters in `src/hooks/usePWAFeatures.ts` to use specific types from `src/components/Toast.tsx` (e.g., `ToastMessage['type']`, `ToastAction[]`).
    *   **Priority:** P3 (Low)

*   **[x] Category:** PWA Type Safety
    *   **Issue:** `src/hooks/usePWAFeatures.ts` casts `registration` to `any` for `sync` and `periodicSync`.
    *   **Impact/Rationale:** Reduces type safety and makes the code harder to maintain and debug.
    *   **Affected Files:** `src/hooks/usePWAFeatures.ts`
    *   **Action:** Install `@types/serviceworker` and use the correct types for `registration` to avoid `any` casts.
    *   **Priority:** P3 (Low)

*   **[x] Category:** PWA Cross-Browser Compatibility
    *   **Issue:** `src/hooks/usePWAFeatures.ts` uses `periodic-background-sync` permission, which is Chrome-specific.
    *   **Impact/Rationale:** Limits functionality to Chrome-based browsers.
    *   **Affected Files:** `src/hooks/usePWAFeatures.ts`
    *   **Action:** Add a fallback or graceful degradation for browsers that do not support `periodic-background-sync`.
    *   **Priority:** P2 (Medium)

---

### **3. Code Quality & Maintainability**

*   **[~] Category:** Configuration Flexibility (Requires User Input/Design Decision)
    *   **Issue:** `src/constants.ts` contains a hardcoded `ASSEMBLIES` list.
    *   **Impact/Rationale:** Changes to the list of assemblies require code modification and redeployment, which can be inflexible if the list is dynamic.
    *   **Affected Files:** `src/constants.ts`
    *   **Action:** If the list of assemblies is expected to change frequently, consider externalizing it to a configurable source (e.g., a backend API, a separate configuration file) that can be updated without code changes.
    *   **Priority:** P3 (Low)

*   **[x] Category:** Environment Variable Configuration
    *   **Issue:** Mismatch in Google API Key environment variable name between `deploy.yml` and application code.
    *   **Impact/Rationale:** The GitHub Actions workflow sets `VITE_A_KEY`, but `vite.config.ts` and `src/constants.ts` expect `VITE_API_KEY`. This inconsistency will prevent the API key from being correctly loaded.
    *   **Affected Files:** `.github/workflows/deploy.yml`, `vite.config.ts`, `src/constants.ts`
    *   **Action:** Update `.github/workflows/deploy.yml` to set the environment variable as `VITE_API_KEY` to match the application's expectation.
    *   **Priority:** P1 (High)

*   **[ ] Category:** Type Safety
    *   **Issue:** `src/Router.tsx` `createRouter` function uses `props: any`.
    *   **Impact/Rationale:** Reduces type safety and makes the code harder to maintain and debug. The `props` passed to `App` should have a defined interface.
    *   **Affected Files:** `src/Router.tsx`, `src/App.tsx`
    *   **Action:** Define a specific interface for the `props` that `createRouter` expects and ensure `App` component's props are also typed accordingly.
    *   **Priority:** P2 (Medium)

*   **[x] Category:** Code Organization
    *   **Issue:** `src/Router.tsx` imports `MemberDatabaseSection` from `src/components` instead of `src/sections`.
    *   **Impact/Rationale:** Inconsistent file organization can make the codebase harder to navigate and maintain.
    *   **Affected Files:** `src/Router.tsx`, `src/components/MemberDatabaseSection.tsx`, `src/sections/`
    *   **Action:** Move `MemberDatabaseSection.tsx` from `src/components` to `src/sections` and update the import path in `src/Router.tsx`.
    *   **Priority:** P3 (Low)

*   **[x] Category:** Type Definition Accuracy
    *   **Issue:** `src/types.ts` `MemberRecordA` contains typos: `"Type of Employement"` and `"Salaried St Ministers (SSNIT Number"`.
    *   **Impact/Rationale:** Typos can lead to data inconsistencies, incorrect mapping, and bugs if not handled carefully during data processing or display.
    *   **Affected Files:** `src/types.ts`, `src/services/excelProcessor.ts`, and any UI components displaying these fields.
    *   **Action:** Correct the typos in the `MemberRecordA` interface. This will require updating any code that uses these specific keys.
    *   **Priority:** P1 (High)

*   **[ ] Category:** Data Validation & Type Safety
    *   **Issue:** `src/types.ts` `MemberRecordA` uses `[key: string]: any;` for dynamic keys from Excel parsing.
    *   **Impact/Rationale:** While necessary for initial parsing, relying heavily on `any` can hide potential runtime errors if expected fields are missing or have unexpected types.
    *   **Affected Files:** `src/types.ts`, `src/services/excelProcessor.ts`
    *   **Action:** Implement a data validation layer after parsing Excel files to ensure critical fields are present and correctly typed before further processing. This could involve mapping the raw `MemberRecordA` to a more strictly typed internal model.
    *   **Priority:** P2 (Medium)

*   **[ ] Category:** Performance & Storage Optimization
    *   **Issue:** `src/types.ts` `FavoriteConfig` and `AutoSaveDraft` interfaces store full `MemberRecordA[]` and `TitheRecordB[]` data.
    *   **Impact/Rationale:** Storing potentially very large datasets directly in `localStorage` (implied by `constants.ts`) can lead to performance issues, exceeding `localStorage` limits, and slower load/save times.
    *   **Affected Files:** `src/types.ts`, `src/App.tsx`, `src/constants.ts`
    *   **Action:** Evaluate expected data sizes. For very large datasets, consider storing only references or summaries in `localStorage` and re-fetching/re-processing the full data when a favorite/draft is loaded. Alternatively, explore IndexedDB for larger client-side storage.
    *   **Priority:** P2 (Medium)

*   **[~] Category:** Component Refactoring (Major Refactoring - Requires Detailed Plan and User Input)
    *   **Issue:** `src/App.tsx` is a "God Component" with excessive state and logic.
    *   **Impact/Rationale:** Reduces readability, maintainability, and testability. Increases complexity. The component manages over 30 state variables, numerous effects, and a vast amount of business logic.
    *   **Affected Files:** `src/App.tsx`
    *   **Action:** Break down `App.tsx` into smaller, more focused components. Consider using a state management library (e.g., Zustand, `useReducer` + `useContext`) to manage global state and reduce prop drilling. Specifically, extract domain-specific logic and state into custom hooks or dedicated context providers.
    *   **Priority:** P1 (High)

*   **[~] Category:** Code Structure (Dependent on App.tsx Refactoring)
    *   **Issue:** `src/App.tsx` passes a massive `context` object to the `Outlet`.
    *   **Impact/Rationale:** This is a direct consequence of the "God Component" issue, leading to extensive prop drilling and tight coupling. Child components receive more data than they need, potentially causing unnecessary re-renders.
    *   **Affected Files:** `src/App.tsx`, `src/Router.tsx` (via `useOutletContext`)
    *   **Action:** As part of refactoring `App.tsx`, redesign the state management and context provision to be more granular. Use React Context API for specific domains or a global state management solution to allow components to subscribe only to the data they require.
    *   **Priority:** P1 (High)

*   **[x] Category:** Code Cleanup
    *   **Issue:** `src/App.tsx` contains several commented-out code blocks (e.g., `handleDateChange`, `isParsing` state).
    *   **Impact/Rationale:** Clutters the codebase, makes it harder to read, and can lead to confusion about intended functionality.
    *   **Affected Files:** `src/App.tsx`
    *   **Action:** Review these commented-out sections. If they are truly unused or deprecated, remove them. If they are intended for future use, add clear `TODO` comments explaining their purpose and the conditions under which they should be re-introduced.
    *   **Priority:** P3 (Low)

*   **[x] Category:** Type Safety
    *   **Impact/Rationale:** Reduces type safety and makes the code harder to maintain and debug.
    *   **Affected Files:** `src/components/BarChart.tsx`, `src/components/DonutChart.tsx`
    *   **Action:** Define proper types for the props of `motion.rect`, `motion.text`, `motion.circle`, and `motion.span` to avoid `any`.
    *   **Priority:** P3 (Low)

*   **[x] Category:** Component Reusability
    *   **Issue:** `src/components/BarChart.tsx` has hardcoded `chartHeight`, `barWidth`, and `barMargin`.
    *   **Impact/Rationale:** Limits reusability and flexibility of the component.
    *   **Affected Files:** `src/components/BarChart.tsx`
    *   **Action:** Make `chartHeight`, `barWidth`, and `barMargin` configurable props to improve reusability.
    *   **Priority:** P3 (Low)

*   **[ ] Category:** Responsive Design
    *   **Issue:** `src/components/BarChart.tsx` is not fully responsive.
    *   **Impact/Rationale:** Provides a poor user experience on different screen sizes.
    *   **Affected Files:** `src/components/BarChart.tsx`
    *   **Action:** Implement responsive design for the `BarChart` component, allowing it to adapt to different screen sizes.
    *   **Priority:** P2 (Medium)





*   **[x] Category:** Type Safety
    *   **Issue:** `src/components/Button.tsx` uses `React.cloneElement(icon as any, ...)` for icons.
    *   **Impact/Rationale:** Reduces type safety. If a non-icon `React.ReactNode` is passed, it will still attempt to inject a `size` prop, potentially leading to runtime errors. The `as any` bypasses TypeScript checks.
    *   **Affected Files:** `src/components/Button.tsx`
    *   **Action:** Refine the `leftIcon` and `rightIcon` prop types from `React.ReactNode` to `React.ReactElement<IconProps>` (where `IconProps` defines the `size` prop) to ensure only compatible icon components are passed. Alternatively, if `lucide-react` icons are exclusively used, the type could be more specific to `LucideIcon`.
    *   **Priority:** P3 (Low)

*   **[x] Category:** Component Functionality
    *   **Issue:** `src/components/InfoTooltip.tsx` `position` prop is defined but not used.
    *   **Impact/Rationale:** Unused props indicate incomplete functionality or dead code. The current `info-tooltip-content` CSS in `src/index.css` only supports a top-centered tooltip, so implementing this prop would require extending the CSS to support other positions.
    *   **Affected Files:** `src/components/InfoTooltip.tsx`, `src/index.css`
    *   **Action:** Implement the `position` prop in `InfoTooltip.tsx` to control the tooltip's placement, and extend the `.info-tooltip-content` CSS in `src/index.css` to support various positions (e.g., top, right, left, bottom), or remove the prop if not intended for use.
    *   **Priority:** P3 (Low)

*   **[x] Category:** Dependency Consistency
    *   **Issue:** `src/components/MagicCard.tsx` uses `motion/react` instead of `framer-motion`.
    *   **Impact/Rationale:** Inconsistent dependency usage can lead to unexpected behavior or larger bundle sizes if both are included.
    *   **Affected Files:** `src/components/MagicCard.tsx`
    *   **Action:** Change `import { motion, useMotionTemplate, useMotionValue } from "motion/react";` to `import { motion, useMotionTemplate, useMotionValue } from "framer-motion";` for consistency with other `framer-motion` usages.
    *   **Priority:** P2 (Medium)

*   **[x] Category:** Dependency Cleanup
    *   **Issue:** `motion` dependency was present but no longer explicitly used after `MagicCard.tsx` refactoring.
    *   **Impact/Rationale:** Reduces unnecessary dependencies and potential bundle size.
    *   **Affected Files:** `package.json`
    *   **Action:** Remove `motion` dependency from `package.json`.
    *   **Priority:** P3 (Low)

*   **[x] Category:** Type Safety
    *   **Impact/Rationale:** Reduces type safety and makes the code harder to maintain and debug.
    *   **Affected Files:** `src/hooks/useGoogleDriveQuery.ts`
    *   **Action:** Install `@types/gapi` and use the correct types for `window.gapi`.
    *   **Priority:** P3 (Low)

*   **[x] Category:** Code Robustness
    *   **Issue:** `src/hooks/useGoogleDriveQuery.ts` uses non-null assertion operator `!` for `fileId` in `useReadFromDrive` and `useSaveToDrive`.
    *   **Impact/Rationale:** While `useReadFromDrive` is protected by its `enabled` condition, `useSaveToDrive` relies on the caller to ensure `fileId` is non-null before `mutate` is called. Using `!` can lead to runtime errors if the asserted value is unexpectedly null or undefined.
    *   **Affected Files:** `src/hooks/useGoogleDriveQuery.ts`
    *   **Action:** For `useSaveToDrive`, add a runtime check within `mutationFn` to handle a `null` `fileId` gracefully (e.g., throw an error or return a rejected promise), or ensure the `mutate` function is only called when `fileId` is guaranteed to be non-null by the calling component. Consider making `saveToDrive` itself handle a `null` `fileId`.
    *   **Priority:** P2 (Medium)

*   **[x] Category:** Code Maintainability
    *   **Issue:** `src/hooks/useGoogleDriveQuery.ts` has a TODO to use constants for filenames.
    *   **Impact/Rationale:** Hardcoded strings are prone to errors and make changes difficult.
    *   **Affected Files:** `src/hooks/useGoogleDriveQuery.ts`, `src/constants.ts`
    *   **Action:** Replace hardcoded filenames with constants from `constants.ts`.
    *   **Priority:** P3 (Low)

*   **[x] Category:** Type Safety
    *   **Impact/Rationale:** Reduces type safety and makes the code harder to maintain and debug.
    *   **Affected Files:** `src/hooks/useGoogleDriveSync.ts`
    *   **Action:** Install `@types/gapi` and `@types/google.accounts` and use the correct types.
    *   **Priority:** P3 (Low)

*   **[x] Category:** Error Handling
    *   **Issue:** `src/hooks/useGoogleDriveSync.ts` error handling could be more specific.
    *   **Impact/Rationale:** Provides less informative feedback to users and makes debugging harder.
    *   **Affected Files:** `src/hooks/useGoogleDriveSync.ts`
    *   **Action:** Enhance error messages to provide more detailed feedback to the user during sync failures.
    *   **Priority:** P2 (Medium)

*   **[x] Category:** Type Safety
    *   **Issue:** `src/hooks/useWorker.ts` `error` state and `MessageEvent` are typed as `any`.
    *   **Impact/Rationale:** Reduces type safety and makes the code harder to maintain and debug.
    *   **Affected Files:** `src/hooks/useWorker.ts`
    *   **Action:** Use more specific types for `error` and `MessageEvent` data.
    *   **Priority:** P3 (Low)

*   **[x] Category:** Code Duplication
    *   **Issue:** `src/services/excelProcessor.ts` `parseExcelFile` function is duplicated in `excel.worker.ts`.
    *   **Impact/Rationale:** Violates DRY principle, increases maintenance effort, and can lead to inconsistencies.
    *   **Affected Files:** `src/services/excelProcessor.ts`, `src/services/excel.worker.ts`
    *   **Action:** Extract `parseExcelFile` into a shared utility file (e.g., `src/lib/excelUtils.ts`) and import it where needed.
    *   **Priority:** P2 (Medium)

*   **[x] Category:** Type Safety
    *   **Issue:** `src/services/excelProcessor.ts` `exportToExcel` `data` parameter is typed as `any[]`.
    *   **Impact/Rationale:** Reduces type safety and makes the code harder to maintain and debug.
    *   **Affected Files:** `src/services/excelProcessor.ts`
    *   **Action:** Change `data: any[]` to `data: TitheRecordB[]`.
    *   **Priority:** P3 (Low)

*   **[x] Category:** Code Readability
    *   **Issue:** `src/services/excelProcessor.ts` `createTitheList` function is complex.
    *   **Impact/Rationale:** Reduces readability and maintainability.
    *   **Affected Files:** `src/services/excelProcessor.ts`
    *   **Action:** Break down `createTitheList` into smaller, more focused helper functions to improve readability and maintainability.
    *   **Priority:** P2 (Medium)

*   **[x] Category:** Test Coverage
    *   **Issue:** `src/services/excelProcessor.test.ts` has missing tests for `exportToExcel`, `filterMembersByAge`, `reconcileMembers`, and `parseExcelFile`.
    *   **Impact/Rationale:** Reduces confidence in code correctness and makes refactoring risky.
    *   **Affected Files:** `src/services/excelProcessor.test.ts`
    *   **Action:** Add comprehensive unit tests for these untested functions.
    *   **Priority:** P1 (High)

*   **[x] Category:** Type Safety
    *   **Issue:** `src/services/offline-analytics.ts` `event` parameter is typed as `any`.
    *   **Impact/Rationale:** Reduces type safety and makes the code harder to maintain and debug.
    *   **Affected Files:** `src/services/offline-analytics.ts`
    *   **Action:** Define a specific type for the `event` parameter.
    *   **Priority:** P3 (Low)



*   **[x] Category:** Type Safety
    *   **Impact/Rationale:** Reduces type safety and makes the code harder to maintain and debug.
    *   **Affected Files:** `src/sections/DashboardSection.tsx`
    *   **Action:** Replace `any` types with specific types (`MasterListData`, `MemberRecordA`).
    *   **Priority:** P3 (Low)

*   **[x] Category:** Code Cleanup
    *   **Issue:** `src/sections/DashboardSection.tsx` `onGenerateValidationReport` prop is passed but unused.
    *   **Impact/Rationale:** Unused props indicate dead code or incomplete functionality.
    *   **Affected Files:** `src/sections/DashboardSection.tsx`
    *   **Action:** Remove the `onGenerateValidationReport` prop from `DashboardSectionProps`.
    *   **Priority:** P3 (Low)

*   **[x] Category:** Component Functionality
    *   **Issue:** `src/sections/MemberDatabaseSection.tsx` table lacks pagination and sorting.
    *   **Impact/Rationale:** Limits usability and data management for larger datasets.
    *   **Affected Files:** `src/sections/MemberDatabaseSection.tsx`
    *   **Action:** Implement pagination and sorting functionality for the member database table.
    *   **Priority:** P2 (Medium)

*   **[x] Category:** UI/UX Consistency
    *   **Issue:** `src/sections/MemberDatabaseSection.tsx` tab and table styling is inconsistent.
    *   **Impact/Rationale:** Detracts from the overall user experience and professional appearance.
    *   **Affected Files:** `src/sections/MemberDatabaseSection.tsx`
    *   **Action:** Update the styling of tabs and the table to align with the application's design system.
    *   **Priority:** P3 (Low)

*   **[x] Category:** Code Readability
    *   **Issue:** `src/sections/ListOverviewActionsSection.tsx` `historicalStats` `useMemo` is complex.
    *   **Impact/Rationale:** Reduces readability and maintainability.
    *   **Affected Files:** `src/sections/ListOverviewActionsSection.tsx`
    *   **Action:** Break down the `historicalStats` calculation into smaller, more focused functions or hooks.
    *   **Priority:** P2 (Medium)



*   **[x] Category:** Code Readability
    *   **Issue:** `src/sections/ReportsSection.tsx` `reportDataByMonth` and `yearSummary` `useMemo` hooks are complex.
    *   **Impact/Rationale:** Reduces readability and maintainability.
    *   **Affected Files:** `src/sections/ReportsSection.tsx`
    *   **Action:** Extract complex logic within these `useMemo` hooks into separate utility functions or custom hooks.
    *   **Priority:** P2 (Medium)


******************************************

the references to "backend" are primarily
  in the context of enhancing the Progressive Web App (PWA)
  features. Here’s the breakdown in a more digestible way:

  The Current Situation: A Client-Side Powerhouse

  Right now, your application, TACTMS, is a powerful client-side 
  application. This means almost everything happens directly in
  the user's web browser:
   * Data Processing: When you upload an Excel file, your
     browser's JavaScript (using a Web Worker, as seen in
     excel.worker.ts) processes it.
   * Data Storage: Data is stored temporarily in the browser or
     saved to your Google Drive via the useGoogleDriveSync.ts
     hook.
   * Analytics: The dashboard and reports are generated by your
     browser.

  This is a great approach for a V1.0 product—it's fast, works
  offline, and is relatively simple to deploy.

  The Future Vision: A Full-Stack Application

  The TODO.md file points to a future where the application
  evolves to have its own backend. This is a crucial step to
  transform it from a personal tool into a scalable, multi-user
  system.

  Here’s what the "backend" tasks in the TODO.md file are all
  about:

   1. Backend for Service Worker: The file src/sw.ts (the Service
      Worker) is the heart of your PWA's offline and background
      capabilities. It has placeholder code that tries to
      communicate with a backend server at API endpoints like:
       * /api/sync-data
       * /api/updates
       * /api/analytics

      What this means: The plan is to build a server that can
  receive data from the app (even when it's in the background),
  store it centrally, and send updates back. This would make your
  Google Drive sync obsolete and far more robust.

   2. Backend for Push Notifications: The file
      src/hooks/usePWAFeatures.ts has placeholders for sending a
      user's push notification subscription to a backend.

      What this means: To send a push notification to a user, you
  first need a server to store their unique subscription
  information. The app would send this to your backend, and later,
   the backend could send out alerts.

  Why is this important for you, Adema?

  As an automation enthusiast and app developer, this is where you
   can truly innovate and "productize" the solution:

   * Scalability: A backend and database mean you can handle
     thousands of members and records without slowing down the
     user's browser.
   * Centralized Truth: No more worrying about which Google Drive
     file is the latest. A central database becomes the single
     source of truth.
   * Multi-User Collaboration: You could introduce user accounts,
     roles, and permissions (e.g., pastors, clerks,
     administrators) who can all work with the same data in
     real-time.
   * Advanced Automation: The backend could run scheduled jobs,
     generate automated PDF reports and email them, or perform
     complex data analysis that would be too slow for a browser.

  This is a very exciting and logical next step for the TACTMS
  project. Building this backend would be a significant leap
  forward in its capabilities.

  I have finished explaining the "database and backend" context
  from the TODO.md file. As a next logical step, I would propose
  that we begin scaffolding this new backend system. We could
  create a new directory, servers/, and set up a basic Node.js and
   Express.js application. This would be the foundation for
  implementing the API endpoints mentioned in the service worker.

  

******************************************