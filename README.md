# TACTMS - The Apostolic Church Tithe Made Simple

<p align="center">
  <img src="/img/TAC-Dexify-for-light-bg-only-logo.svg" alt="TACTMS Logo" width="400"/>
</p>

<p align="center">
  <strong>An intelligent, offline-first PWA to streamline tithe and membership management.</strong>
  <br />
  <a href="#key-features">Key Features</a> •
  <a href="#technology-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#contributing">Contributing</a>
</p>

---

TACTMS is a modern, installable Progressive Web App (PWA) built to revolutionize how local assemblies of The Apostolic Church manage their tithe records and membership data. It provides a seamless, native-like experience on both desktop and mobile devices, complete with offline capabilities.

At its core, TACTMS leverages AI-powered analysis to provide deep insights into uploaded data, all through an intuitive and interactive chat interface. It's more than a data processor; it's a tool for understanding and growth.

## Key Features

- **✨ AI-Powered Analytics**: Go beyond simple data entry. Ask questions about your data in plain English and get instant, insightful reports.
- **📂 Effortless Data Import**: Upload standard Excel files and let the app intelligently process and reconcile the data.
- **🔄 Membership Reconciliation**: Automatically compare uploaded tithe lists against a master member database, flagging discrepancies and new members.
- **📊 Interactive Dashboards**: Visualize trends, track key performance indicators (KPIs), and get an at-a-glance overview of your assembly's financial health.
- **☁️ Secure Cloud Sync**: Keep your data safe and accessible across all your devices with seamless Google Drive integration.
- **🔌 Offline First**: Works without an internet connection. All data is stored locally and synced to the cloud when you're back online.
- **💻 Installable App**: Install TACTMS directly to your desktop or mobile home screen for a fast, native-app experience.

## Technology Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS
- **PWA & Offline Support**: Workbox
- **AI Integration**: Google Gemini
- **Cloud Storage**: Google Drive API

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

- Node.js (v18.x or later)
- npm

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/tactms.git
    cd tactms
    ```

2.  **Install NPM packages:**
    ```sh
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add your API keys. You can get these from the Google AI and Google Cloud consoles.
    ```
    VITE_API_KEY=your_gemini_api_key_here
    VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
    ```

4.  **Run the development server:**
    ```sh
    npm run dev
    ```
    The app will be available at `http://localhost:5173`.

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

Please see our [**Contributing Guide**](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests to us.

## License

Distributed under the MIT License. See `LICENSE` for more information.
