# vite-plugin-devtools-settings

A Vite plugin that generates and serves Chrome DevTools project settings (devtools.json) with support for workspace UUID generation and Windows container compatibility.

## Features

- 🚀 **Automatic devtools.json generation** - Creates Chrome DevTools workspace configuration on-the-fly
- 🔗 **Well-known endpoint** - Serves JSON at `/.well-known/appspecific/com.chrome.devtools.json`
- 🆔 **UUID generation & caching** - Auto-generates and caches workspace UUIDs in Vite cache
- 🪟 **Windows compatibility** - Path normalization for WSL/Docker Desktop environments
- 📝 **Full TypeScript support** - Complete type definitions for excellent developer experience
- ⚡ **Zero configuration** - Works out of the box with sensible defaults

## Installation

```bash
npm install --save-dev vite-plugin-devtools-settings
# or
yarn add --dev vite-plugin-devtools-settings
# or
pnpm add --save-dev vite-plugin-devtools-settings
```

## Basic Usage

### 1. Add the plugin to your Vite config

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import devtoolsSettings from 'vite-plugin-devtools-settings'

export default defineConfig({
  plugins: [
    devtoolsSettings()
  ]
})
```

### 2. Access the devtools.json endpoint

Start your development server and visit:
```
http://localhost:5173/.well-known/appspecific/com.chrome.devtools.json
```

You'll get a response like:
```json
{
  "workspace": {
    "root": "/path/to/your/project",
    "uuid": "6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b"
  }
}
```

## Advanced Configuration

The plugin accepts an options object to customize its behavior:

```typescript
import { defineConfig } from 'vite'
import devtoolsSettings from 'vite-plugin-devtools-settings'

export default defineConfig({
  plugins: [
    devtoolsSettings({
      // Custom project root (defaults to process.cwd())
      projectRoot: '/path/to/your/project',

      // Enable Windows container path normalization
      normalizeForWindowsContainer: true,

      // Use a custom UUID instead of generating one
      uuid: 'your-custom-uuid-here',

      // Custom cache directory for UUID storage
      cacheDir: '.vite-cache'
    })
  ]
})
```

## API Reference

### DevtoolsSettingsOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `projectRoot` | `string` | `process.cwd()` | Project root directory path |
| `normalizeForWindowsContainer` | `boolean` | `false` | Normalize paths for Windows Container compatibility |
| `uuid` | `string` | `undefined` | Custom UUID for the workspace (if not provided, one will be generated) |
| `cacheDir` | `string` | `.vite` | Custom cache directory for storing generated UUID |

### DevtoolsWorkspace

The generated JSON structure:

```typescript
interface DevtoolsWorkspace {
  workspace: {
    root: string      // Project root path (normalized if Windows compatibility enabled)
    uuid: string      // Workspace UUID (generated and cached)
  }
}
```

## Windows Container Compatibility

When `normalizeForWindowsContainer` is enabled, paths are converted for compatibility with:

- **WSL (Windows Subsystem for Linux)**
- **Docker Desktop**
- **Windows containers**

### Path normalization examples:

| Original Path | Normalized Path |
|---------------|-----------------|
| `C:\Users\Developer\project` | `/C/Users/Developer/project` |
| `C:\Projects\my-app\src` | `/C/Projects/my-app/src` |

This ensures consistent workspace configuration across different development environments.

## UUID Generation & Caching

The plugin automatically generates and caches UUIDs to maintain workspace consistency:

1. **First run**: Generates a new UUID v4 and caches it in `.vite/.devtools-uuid`
2. **Subsequent runs**: Reuses the cached UUID
3. **Custom UUID**: If you provide a custom UUID, it's used directly without caching

### Cache location
```
your-project/
├── .vite/
│   └── .devtools-uuid    # Contains the cached UUID
```

## Build Integration

During production builds, the plugin generates a static `devtools.json` file:

```
dist/
└── .well-known/
    └── appspecific/
        └── com.chrome.devtools.json
```

This ensures your deployed application also serves the correct workspace configuration.

## TypeScript Support

The plugin is written in TypeScript and provides full type support:

```typescript
import devtoolsSettings, { type DevtoolsSettingsOptions } from 'vite-plugin-devtools-settings'

const options: DevtoolsSettingsOptions = {
  projectRoot: process.cwd(),
  normalizeForWindowsContainer: true,
  uuid: 'custom-uuid',
  cacheDir: '.custom-cache'
}

export default {
  plugins: [devtoolsSettings(options)]
}
```

## Examples

### Basic Setup
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import devtoolsSettings from 'vite-plugin-devtools-settings'

export default defineConfig({
  plugins: [
    react(),
    devtoolsSettings()  // Basic usage with defaults
  ]
})
```

### Advanced Setup with All Options
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import devtoolsSettings from 'vite-plugin-devtools-settings'

export default defineConfig({
  plugins: [
    devtoolsSettings({
      projectRoot: '/workspace/my-project',
      normalizeForWindowsContainer: true,
      uuid: undefined,  // Let it auto-generate
      cacheDir: '.vite-cache'
    })
  ]
})
```

### Using with Different Environments
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import devtoolsSettings from 'vite-plugin-devtools-settings'

export default defineConfig(({ mode }) => ({
  plugins: [
    devtoolsSettings({
      // Enable Windows normalization only in development
      normalizeForWindowsContainer: mode === 'development',

      // Use environment-specific cache directory
      cacheDir: mode === 'development' ? '.vite-dev' : '.vite-prod'
    })
  ]
}))
```

## Troubleshooting

### Plugin not generating devtools.json
- Ensure the plugin is properly added to your `vite.config.ts`
- Check that your development server is running (`npm run dev` or `yarn dev`)
- Verify the endpoint is accessible: `http://localhost:5173/.well-known/appspecific/com.chrome.devtools.json`

### UUID keeps changing between restarts
- Check if the `.vite/.devtools-uuid` file exists and is readable
- Ensure the cache directory has proper write permissions
- Try clearing the cache and restarting the development server

### Windows path issues
- Enable `normalizeForWindowsContainer: true` in your plugin configuration
- Ensure your project paths are consistent across different environments

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Changelog

### v1.0.0
- Initial release
- Basic devtools.json generation and serving
- UUID generation and caching
- Windows container path normalization
- Full TypeScript support
