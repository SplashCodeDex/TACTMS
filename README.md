# TACTMS: Tithe & Membership, Simplified.

<p>
  <a href="https://github.com/SplashCodeDex/TACTMS/actions/workflows/ci.yml">
    <img alt="CI" src="https://github.com/SplashCodeDex/TACTMS/actions/workflows/ci.yml/badge.svg" />
  </a>
</p>

<p align="center">
  <img src="/public/img/DarkLogoExpanded.svg" alt="TACTMS Logo" width="400"/>
</p>

<p align="center">
  <strong>Stop wrestling with spreadsheets. Start understanding your church's health.</strong>
</p>

---

## What is TACTMS?

TACTMS is a modern, secure, and intelligent application designed specifically for Financial Secretaries and Pastors of The Apostolic Church. It transforms the tedious process of managing tithe records and membership data into a simple, insightful, and even enjoyable experience.

Built as an offline-first Progressive Web App (PWA), TACTMS works seamlessly on your computer or phone, with or without an internet connection.

## Why Choose TACTMS?

Managing church data shouldn't be a chore. TACTMS empowers you to:

- ✅ **Save Hours of Manual Work:** Simply upload your existing Excel files. TACTMS automatically reads, analyzes, and reconciles the data in seconds, not hours.
- 💡 **Gain Instant Financial Clarity:** Our AI-powered analytics dashboard shows you key trends and insights at a glance. Understand your assembly's financial health like never before.
- 👥 **Maintain Accurate Membership Records:** Effortlessly track membership status, identify new converts, and keep your master database clean and up-to-date.
- 🔒 **Keep Your Data Safe and Secure:** All your data is processed locally on your device. Optional Google Drive integration provides a secure, encrypted backup in your own cloud account.
- 🌐 **Work Anywhere, Anytime:** Whether you're at the church office, at home, or on the go, TACTMS is always available, even without an internet connection.

## Who Is This For?

- **Local Church Financial Secretaries & Treasurers:** The primary users who need to process weekly tithe lists.
- **Pastors & Elders:** For gaining high-level insights into church growth and financial stability.
- **District & Area Administrators:** (Coming Soon) A future version will provide aggregated analytics for oversight.

## Getting Started

As a user, there's no complex installation. You can use TACTMS directly in your web browser and install it as an app with a single click.

**For developers** interested in contributing to the project, please see our [**Contributing Guide**](CONTRIBUTING.md) for full setup instructions.

### Cloud Sync Configuration (For Developers)

To enable the Google Drive Cloud Sync feature during development, you need to provide your own Google API credentials.

1.  **Create a `.env.local` file** in the root of the project.
2.  **Add the following environment variables** to the file:

    ```
    VITE_API_KEY="YOUR_GOOGLE_API_KEY"
    VITE_GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
    ```

3.  **Replace the placeholder values** with your actual Google API Key and Client ID. You can obtain these from the [Google Cloud Console](https://console.cloud.google.com/).

> **Note:** This step is only necessary for developers running the application locally. The production build will have these values pre-configured.

---

We believe in building tools that empower the church. We hope TACTMS is a blessing to your ministry.
