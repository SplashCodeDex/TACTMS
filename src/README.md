# TACTMS - The Apostolic Church Tithe Made Simple

## 1. Overview

TACTMS is an intelligent, offline-first Progressive Web App (PWA) designed to streamline the management of tithe records and church membership data for The Apostolic Church. It uses AI to analyze, segment, and provide insights on uploaded data through an interactive chat interface, all while syncing key information to a secure Google Drive account.

The application is built to be installed on desktop and mobile devices for a seamless, native-like experience with offline capabilities.

## 2. Core Features

- **Central Dashboard**: The application's main landing page, providing an at-a-glance overview of district-wide performance with Key Performance Indicators (KPIs), quick actions, and a feed of recent activity.

- **Command Palette (`Cmd/Ctrl+K`)**: A powerful, fast-search menu to navigate the app, perform actions (like starting a new week or changing themes), and streamline workflows.

- **Tithe Processor**: The main workspace for processing weekly tithe lists.
  - **Excel Upload**: Upload raw membership data from `.xlsx` or `.xls` files.
  - **Assembly Assignment**: Assign uploaded data to a specific church assembly.
  - **Membership Reconciliation**: Automatically compares new uploads against the master database to identify new members (souls won) and missing members.
  - **Configuration**:
    - **Name Concatenation**: Customize how member names and IDs are combined for the final tithe sheet.
    - **Age Filtering**: Process records only for members within a specific age range.
    - **Amount Mapping**: Automatically populate tithe amounts from a specified column in the uploaded Excel file.
    - **Date & Narration Control**: Set a universal transaction date and description for the entire list.
  - **Live Dashboard**: View real-time statistics like total tithe, participation rates, and historical comparisons as you work.
  - **Advanced Data Entry**: A keyboard-optimized view for rapidly entering tithe amounts.
  - **Full List Preview & Edit**: A comprehensive table view to edit, reorder (drag-and-drop), and manage the entire tithe list before export.

- **Member Database**: A centralized repository for all member records.
  - **Master List Management**: Each assembly has its own master list, which serves as the single source of truth.
  - **Upload & Update**: Upload an initial master list or update an existing one.
  - **Advanced Filtering**: Filter the master list by name, age, or completeness of information (e.g., has phone number, missing email).
  - **Create Lists from Database**: Select members from the database to create a new, clean tithe list for processing.

- **Favorites**: Save and load entire workspace snapshots.
  - **Save Workspace**: Save the current file, data, and all configuration settings as a named "Favorite".
  - **Load Workspace**: Instantly restore a saved Favorite to continue work or use it as a template.
  - **Start New Week**: A quick-start feature that loads the member list from the latest favorite for an assembly, ready for a new week of data entry.

- **AI Analytics & Reports**:
  - **AI Chat**: An interactive chat interface powered by Google's Gemini model to analyze the current tithe list and provide actionable insights.
  - **Annual Reports Dashboard**: A dynamic dashboard showing year-over-year performance for tithe and growth across all assemblies, including historical trend charts.

- **Google Drive Sync**:
  - Securely sign in with a Google account to back up and sync "Favorites" and "Transaction Logs" to your Google Drive. This enables cross-device data access.

## 3. Core Workflows

### Workflow 1: Starting a New Weekly Tithe List from the Dashboard

1.  **From the Dashboard**:
2.  **Option A (Recommended): "Start New Week" Card**:
    - Select an assembly from the dropdown (only assemblies with saved Favorites are enabled).
    - Click "Start".
    - The application loads the member list from the most recent Favorite for that assembly, resets the tithe amounts, and sets the date to the current week, taking you to the Tithe Processor.
3.  **Option B: "Upload New File" Card**:
    - Click the upload button.
    - Upload an Excel file containing member data.
    - In the "Assign Assembly" modal, select the correct assembly for the file.
    - The app processes the file, reconciles it with the master database (if one exists), and generates the initial tithe list in the Tithe Processor view.

### Workflow 2: Processing and Exporting the List

1.  **Enter Tithe Amounts**:
    - Use the **Data Entry Mode** for rapid, keyboard-driven amount entry.
    - Alternatively, use the **Full List View** to edit amounts and other details directly in the table.
2.  **Adjust Configuration (Optional)**:
    - In the "Processing Configuration" section, adjust name concatenation, apply age filters, or map amounts from the source file. Changes are reflected in real-time.
3.  **Review Dashboard**:
    - Monitor the live dashboard for total tithe, participation rates, and other key metrics.
4.  **Save & Export**:
    - Set a file name in the "Export & Save" card.
    - Click **"Download Excel"** to export the final tithe sheet. This action also logs the transaction for the Reports view.
    - Click **"Save to Favorites"** to save the current state for later use.

### Workflow 3: Managing the Member Database

1.  **Navigate to Member Database**: Select it from the sidebar or use the Command Palette.
2.  **Select an Assembly**: Click on an assembly to view its master list.
3.  **Initial Upload**: If no list exists, upload a master Excel file for that assembly.
4.  **Update List**: To update, simply upload a new file. The app will prompt for confirmation before overwriting the old data.
5.  **Filter & Create**: Use the filter panel to find specific members, then select them and click **"Create Tithers List"** to start a new processing session with only those members.

## 4. Key Data Structures (`src/types.ts`)

-   `MemberRecordA`: Represents a single member's record from the raw Excel file. Contains fields like 'First Name', 'Surname', 'Membership Number', etc.
-   `TitheRecordB`: Represents a single row in the final, processed tithe list ready for export. Contains fields like 'Membership Number' (concatenated), 'Transaction Amount', and 'Transaction Date'.
-   `FavoriteConfig`: A snapshot of the entire workspace, including the original data, processed data, all configurations, and the final tithe list.
-   `TransactionLogEntry`: A record of a completed and downloaded tithe list, used for the Reports dashboard.
-   `MemberDatabase`: A record object where keys are assembly names and values are `MasterListData` objects, which contain the member array and metadata.

## 5. AI Agent / Developer Guide

-   **Getting Started**: The main application logic resides in `src/App.tsx`. The default view is now `dashboard`.
-   **Views**: The active view is controlled by the `activeView` state in `src/App.tsx`. New views can be added by:
    1.  Updating the `ViewType` in `src/types.ts`.
    2.  Creating a new component in the `src/sections/` directory.
    3.  Adding a `case` for it in the `renderContent` function in `src/App.tsx`.
    4.  Adding a `NavItem` to `src/components/Sidebar.tsx`.
-   **State Management**: Core data like `favorites`, `transactionLog`, and `memberDatabase` are managed in `src/App.tsx` and persisted to both LocalStorage and Google Drive (if enabled).
-   **Command Palette**: Actions for the command palette are defined within `src/components/CommandPalette.tsx`. New global actions can be easily added to the `actions` array in that component.