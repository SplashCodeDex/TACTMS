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
    base: "/TACTMS/",
    define: {
      "process.env.VITE_API_KEY": JSON.stringify(env.VITE_API_KEY),
      "process.env.VITE_CLIENT_ID": JSON.stringify(env.VITE_CLIENT_ID),
      "process.env.VITE_VAPID_PUBLIC_KEY": JSON.stringify(env.VITE_VAPID_PUBLIC_KEY),
    },
    plugins: [
      react(),
    VitePWA({
      strategy: "injectManifest",
      registerType: "autoUpdate",
      swSrc: "src/sw.ts",
      devOptions: {
        enabled: true,
      },
    }),
    ],
  };
});
