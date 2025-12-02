import { Plugin } from 'vite'
import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID, createHash } from 'crypto'

export interface DevtoolsSettingsOptions {
  /**
   * Absolute path that will be reported to DevTools. Useful for monorepos or when the Vite root is not the desired folder.
   */
  projectRoot?: string
  /**
   * Convert Linux paths to UNC form so Chrome on Windows (WSL / Docker Desktop) can mount them.
   * Pass `false` to disable.
   */
  normalizeForWindowsContainer?: boolean
  /**
   * Fixed UUID if you prefer to control it yourself.
   */
  uuid?: string
  /**
   * Custom cache directory for UUID storage.
   */
  cacheDir?: string
}

const DEFAULT_OPTIONS: Required<DevtoolsSettingsOptions> = {
  projectRoot: process.cwd(),
  normalizeForWindowsContainer: true,
  uuid: '',
  cacheDir: '.vite'
}

/**
 * Normalize a path for Windows containers (WSL/Docker Desktop)
 * Converts Linux paths to UNC form: /c/path -> //wsl$/Ubuntu/c/path
 */
function normalizeForWindowsContainer(filePath: string): string {
  // Check if it's a WSL environment
  if (process.platform === 'linux' && process.env.WSL_DISTRO_NAME) {
    const wslDistro = process.env.WSL_DISTRO_NAME
    return `//wsl$/${wslDistro}${filePath}`
  }

  // If the path starts with / and we have a drive letter, convert to UNC
  const match = filePath.match(/^\/([a-zA-Z])\//)
  if (match) {
    const driveLetter = match[1].toUpperCase()
    return `//${driveLetter}/${filePath.substring(3)}`
  }

  return filePath
}

/**
 * Generate a v4 UUID using Node.js crypto
 */
function generateUUID(): string {
  return randomUUID()
}

/**
 * Get or generate UUID, caching it in the Vite cache directory
 */
async function getOrGenerateUUID(
  cacheDir: string,
  projectRoot: string,
  providedUUID?: string
): Promise<string> {
  if (providedUUID) {
    return providedUUID
  }

  const cacheFile = path.join(cacheDir, '.devtools-uuid')

  try {
    // Try to read existing UUID from cache
    const existingUUID = await fs.readFile(cacheFile, 'utf8')
    return existingUUID.trim()
  } catch {
    // Generate new UUID if cache doesn't exist
    const newUUID = generateUUID()

    try {
      // Ensure cache directory exists
      await fs.mkdir(cacheDir, { recursive: true })
      // Write UUID to cache
      await fs.writeFile(cacheFile, newUUID, 'utf8')
    } catch (error) {
      console.warn('[vite-plugin-devtools-settings] Failed to cache UUID:', error)
    }

    return newUUID
  }
}

/**
 * Vite plugin for generating Chrome DevTools project settings
 */
export default function devtoolsSettings(userOptions: DevtoolsSettingsOptions = {}): Plugin {
  const options = { ...DEFAULT_OPTIONS, ...userOptions }

  return {
    name: 'vite-plugin-devtools-settings',

    configureServer(server) {
      // Set up middleware to serve devtools.json
      server.middlewares.use('/.well-known/appspecific/com.chrome.devtools.json', async (req, res) => {
        try {
          res.setHeader('Content-Type', 'application/json')

          const projectRoot = options.projectRoot
          const normalizedRoot = options.normalizeForWindowsContainer
            ? normalizeForWindowsContainer(projectRoot)
            : projectRoot

          const uuid = await getOrGenerateUUID(options.cacheDir, projectRoot, options.uuid)

          const devtoolsConfig = {
            workspace: {
              root: normalizedRoot,
              uuid: uuid
            }
          }

          res.end(JSON.stringify(devtoolsConfig, null, 2))
        } catch (error) {
          console.error('[vite-plugin-devtools-settings] Error serving devtools.json:', error)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Failed to generate devtools configuration' }))
        }
      })
    },

    writeBundle() {
      // This hook ensures the plugin runs during build as well
      // The actual file generation happens in configureServer for dev
      // For production builds, we could generate a static file here if needed
    }
  }
}
