import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), "");
  return {
    // For GitHub Pages deployment, you may need to set this to your repository name
    // e.g., base: '/YourRepoName/',
    base: "https://splashcodedex.github.io/TACTMS/",
    define: {
      "process.env.VITE_API_KEY": JSON.stringify(env.VITE_API_KEY),
      "process.env.VITE_GOOGLE_CLIENT_ID": JSON.stringify(
        env.VITE_GOOGLE_CLIENT_ID,
      ),
    },
    plugins: [
      react(),
    VitePWA({
      registerType: "autoUpdate",
      // Use a custom service worker
      srcDir: "src",
      filename: "sw.ts",
      strategies: "injectManifest",
      injectRegister: "auto",
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: "TACTMS - The Apostolic Church Tithe Made Simple",
        short_name: "TACTMS",
        start_url: "/TACTMS/",
        description:
          "An intelligent data processing tool that uses AI to analyze, segment, and provide insights on uploaded data through an interactive chat interface with an advanced analytics database.",
        theme_color: "#1A1B29",
        background_color: "#0D0E1B",
        display: "standalone",
        scope: "/TACTMS/",
        id: "/TACTMS/",
        icons: [
          {
            src: "img/android/android-launchericon-512-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "img/android/android-launchericon-192-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "img/ios/192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "img/ios/512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
        screenshots: [
          {
            src: "screenshots/screenshot-wide.svg",
            sizes: "1280x720",
            type: "image/svg+xml",
            form_factor: "wide",
            label: "TACTMS Desktop View",
          },
          {
            src: "screenshots/screenshot-narrow.svg",
            sizes: "540x720",
            type: "image/svg+xml",
            form_factor: "narrow",
            label: "TACTMS Mobile View",
          },
        ],
        shortcuts: [
          {
            name: "Tithe Processor",
            url: "/TACTMS/processor",
            description: "Process tithe records",
          },
          {
            name: "Member Database",
            url: "/TACTMS/database",
            description: "View and manage members",
          },
        ],
      },
      workbox: {
        navigateFallbackAllowlist: [/^\/TACTMS\//],
      },
    }),
    ],
  };
});
