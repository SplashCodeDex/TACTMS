## Project Review TODO List

This document outlines identified issues and recommended actions for the TACTMS project, based on a critical review of the codebase. It is structured to be easily trackable by AI agents and human developers.

---

### **Legend for Task Status:**

*   `[ ]` : Pending / Uncompleted
*   `[x]` : Completed
*   `[~]` : In Progress (Use sparingly, primarily for active work)

---

### **2. Progressive Web App (PWA) Enhancements & Fixes**

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

---

### **3. Code Quality & Maintainability**

*   **[~] Category:** Configuration Flexibility (Requires User Input/Design Decision)
    *   **Issue:** `src/constants.ts` contains a hardcoded `ASSEMBLIES` list.
    *   **Impact/Rationale:** Changes to the list of assemblies require code modification and redeployment, which can be inflexible if the list is dynamic.
    *   **Affected Files:** `src/constants.ts`
    *   **Action:** If the list of assemblies is expected to change frequently, consider externalizing it to a configurable source (e.g., a backend API, a separate configuration file) that can be updated without code changes.
    *   **Priority:** P3 (Low)

*   **[ ] Category:** Type Safety
    *   **Issue:** `src/Router.tsx` `createRouter` function uses `props: any`.
    *   **Impact/Rationale:** Reduces type safety and makes the code harder to maintain and debug. The `props` passed to `App` should have a defined interface.
    *   **Affected Files:** `src/Router.tsx`, `src/App.tsx`
    *   **Action:** Define a specific interface for the `props` that `createRouter` expects and ensure `App` component's props are also typed accordingly.
    *   **Priority:** P2 (Medium)

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

*   **[ ] Category:** Responsive Design
    *   **Issue:** `src/components/BarChart.tsx` is not fully responsive.
    *   **Impact/Rationale:** Provides a poor user experience on different screen sizes.
    *   **Affected Files:** `src/components/BarChart.tsx`
    *   **Action:** Implement responsive design for the `BarChart` component, allowing it to adapt to different screen sizes.
    *   **Priority:** P2 (Medium)

******************************************

the references to "backend" are primarily
  in the context of enhancing the Progressive Web App (PWA)
  features. Here's the breakdown in a more digestible way:

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

  Here's what the "backend" tasks in the TODO.md file are all
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
