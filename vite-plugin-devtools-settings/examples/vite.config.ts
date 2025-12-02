import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import devtoolsSettings from 'vite-plugin-devtools-settings'

// Example 1: Basic usage with defaults
export default defineConfig({
    plugins: [
        react(),
        devtoolsSettings({
            projectRoot: process.cwd(),
            normalizeForWindowsContainer: true,
            uuid: undefined,  // Auto-generate UUID
            cacheDir: '.vite-cache'
        })
    ]
})

// Example 2: Advanced usage with all options
// To use this configuration, uncomment the lines below
/*
export default defineConfig({
  plugins: [
    react(),
    devtoolsSettings({
      projectRoot: '/workspace/my-project',
      normalizeForWindowsContainer: true,
      uuid: undefined,  // Auto-generate UUID
      cacheDir: '.vite-cache'
    })
  ]
})
*/

// Example 3: Environment-specific configuration
// To use this configuration, uncomment the lines below
/*
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    devtoolsSettings({
      // Enable Windows normalization only in development
      normalizeForWindowsContainer: mode === 'development',

      // Use environment-specific cache directory
      cacheDir: mode === 'development' ? '.vite-dev' : '.vite-prod'
    })
  ]
}))
*/

// Example 4: Custom UUID for consistent workspace
// To use this configuration, uncomment the lines below
/*
export default defineConfig({
  plugins: [
    react(),
    devtoolsSettings({
      projectRoot: process.cwd(),
      normalizeForWindowsContainer: false,
      uuid: 'my-consistent-workspace-uuid-12345',  // Use consistent UUID
      cacheDir: '.vite'
    })
  ]
})
*/
