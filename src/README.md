# TACTMS - The Apostolic Church Tithe Made Simple

## 1. Overview

TACTMS is an intelligent, offline-first Progressive Web App (PWA) designed to streamline the management of tithe records and church membership data for The Apostolic Church. It uses AI to analyze, segment, and provide insights on uploaded data through an interactive chat interface, all while syncing key information to a secure Google Drive account.

The application is built to be installed on desktop and mobile devices for a seamless, native-like experience with offline capabilities.

## 2. Setup and Deployment for GitHub Pages

This project is built using Vite and requires Node.js.

### Prerequisites

- [Node.js](https://nodejs.org/) (which includes `npm`) installed on your machine.

### Step 1: Install Dependencies

Clone the repository, navigate into the project directory, and install the required packages:

```bash
npm install
```

### Step 2: Configure for Your Repository

You need to tell the project where it will be hosted.

1.  **`package.json`**: Open this file and find the `homepage` field. Replace `USERNAME` and `REPONAME` with your GitHub username and repository name.
    ```json
    "homepage": "https://YourUsername.github.io/YourRepoName",
    ```
2.  **`vite.config.ts`**: Open this file and find the `base` property. Replace `REPONAME` with your repository name.
    ```typescript
    base: '/YourRepoName/',
    ```

### Step 3: Configure Environment Variables

This application requires API keys for AI features and Google Drive sync. These keys **must** be available as environment variables.

**For Local Development:**
Create a file named `.env` in the project root. Add your keys there, prefixed with `VITE_`:

```
VITE_API_KEY=your_gemini_api_key_here
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

**Important:** The `.gitignore` file is configured to ignore `.env` files, so you will not accidentally commit your secret keys.

**For GitHub Pages Deployment:**

1. Go to your GitHub repository and click on **Settings**.
2. In the left sidebar, navigate to **Secrets and variables** > **Actions**.
3. Click **New repository secret** for each variable:
   - `VITE_API_KEY`
   - `VITE_GOOGLE_CLIENT_ID`
4. Paste your keys into the respective secret values. Vite will automatically use these during the GitHub Actions build process.

### Step 4: Deploy to GitHub Pages

After configuration, run the following command in your terminal:

```bash
npm run deploy
```

This command will first build your application for production and then push the contents of the `dist` folder to a special `gh-pages` branch in your repository.

### Step 5: Enable GitHub Pages

1.  Go to your repository's page on GitHub.
2.  Click on the **Settings** tab.
3.  In the left sidebar, click on **Pages**.
4.  Under "Build and deployment", set the **Source** to **"Deploy from a branch"**.
5.  Set the **Branch** to **`gh-pages`** and the folder to **`/(root)`**.
6.  Click **Save**.

GitHub will publish your site. It might take a few minutes for the site to become available at the URL you configured in `package.json`.

## 3. Core Features

- **Central Dashboard**: The application's main landing page, providing an at-a-glance overview of district-wide performance with Key Performance Indicators (KPIs), quick actions, and a feed of recent activity.
- **Tithe Processor**: The main workspace for processing weekly tithe lists, featuring Excel upload, membership reconciliation, and live statistics.
- **Member Database**: A centralized repository for all member records, with advanced filtering and list creation capabilities.
- **Favorites**: Save and load entire workspace snapshots for easy reuse.
- **AI Analytics & Reports**: An interactive chat interface for data analysis and a dynamic dashboard for annual performance reporting.
- **Google Drive Sync**: Securely back up and sync "Favorites" and "Transaction Logs" across devices.

## 4. Key Data Structures (`src/types.ts`)

- `MemberRecordA`: Represents a single member's record from the raw Excel file.
- `TitheRecordB`: Represents a single row in the final, processed tithe list ready for export.
- `FavoriteConfig`: A snapshot of the entire workspace.
- `TransactionLogEntry`: A record of a completed and downloaded tithe list.
- `MemberDatabase`: A record object where keys are assembly names and values contain the member array and metadata.

## 5. AI Agent / Developer Guide

- **Getting Started**: The main application logic resides in `src/App.tsx`.
- **Views**: The active view is controlled by the `activeView` state. Add new views by creating a component in `src/sections/` and updating the `renderContent` function in `App.tsx` and the `Sidebar` component.
- **State Management**: Core data is managed in `src/App.tsx` and persisted via the `useGoogleDriveSync` hook.
- **Command Palette**: Actions are defined in `src/components/CommandPalette.tsx`.
