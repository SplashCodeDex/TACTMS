import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  // IMPORTANT: Replace 'REPONAME' with your actual GitHub repository name
  base: '/TACTMS/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        // manifest is now in public/manifest.json and will be picked up automatically
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2,woff}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
