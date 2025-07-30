import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  // IMPORTANT: Replace 'REPONAME' with your actual GitHub repository name
  base: '/REPONAME/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2,woff}'],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true
      },
      includeAssets: ['img/TAC-Dexify-for-dark-bg-only-logo-01.svg', 'img/icons/*.png'],
      manifest: {
        name: 'TACTMS - The Apostolic Church Tithe Made Simple',
        short_name: 'TACTMS',
        description: 'An intelligent data processing tool that uses AI to analyze, segment, and provide insights on uploaded data through an interactive chat interface with an advanced analytics database.',
        theme_color: '#1A1B29',
        background_color: '#0D0E1B',
        display: 'standalone',
        start_url: '.',
        icons: [
          {
            "src": "img/icons/icon-72x72.png",
            "sizes": "72x72",
            "type": "image/png"
          },
          {
            "src": "img/icons/icon-96x96.png",
            "sizes": "96x96",
            "type": "image/png"
          },
          {
            "src": "img/icons/icon-144x144.png",
            "sizes": "144x144",
            "type": "image/png"
          },
          {
            "src": "img/icons/icon-192x192.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any maskable"
          },
          {
            "src": "img/icons/icon-512x512.png",
            "sizes": "512x512",
            "type": "image/png"
          }
        ]
      },
    }),
  ],
});