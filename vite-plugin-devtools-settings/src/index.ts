import type { Plugin, ViteDevServer } from 'vite'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

export interface DevtoolsSettingsOptions {
    /**
     * Project root directory path. Defaults to process.cwd()
     */
    projectRoot?: string

    /**
     * Normalize paths for Windows Container compatibility (WSL/Docker Desktop)
     */
    normalizeForWindowsContainer?: boolean

    /**
     * Custom UUID for the workspace. If not provided, one will be generated and cached
     */
    uuid?: string

    /**
     * Custom cache directory for storing generated UUID. Defaults to .vite cache
     */
    cacheDir?: string
}

export interface DevtoolsWorkspace {
    workspace: {
        root: string
        uuid: string
    }
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
    return randomUUID()
}

/**
 * Normalize path for Windows Container compatibility
 */
function normalizePathForWindowsContainer(inputPath: string): string {
    // Convert Windows-style paths to Unix-style paths for consistency
    return inputPath
        .replace(/\\/g, '/') // Convert backslashes to forward slashes
        .replace(/^([A-Za-z]):/, '/$1') // Convert C: to /C
        .replace(/\/\/+/g, '/') // Replace multiple slashes with single slash
}

/**
 * Get or generate a cached UUID
 */
async function getOrGenerateUUID(
    cacheDir: string,
    customUUID?: string
): Promise<string> {
    if (customUUID) {
        return customUUID
    }

    const cacheFilePath = path.join(cacheDir, '.devtools-uuid')

    try {
        // Check if UUID is already cached
        if (fs.existsSync(cacheFilePath)) {
            const cachedUUID = fs.readFileSync(cacheFilePath, 'utf-8')
            if (cachedUUID && cachedUUID.trim()) {
                return cachedUUID.trim()
            }
        }
    } catch (error) {
        // If reading cache fails, continue to generate new UUID
        console.warn('[vite-plugin-devtools-settings] Failed to read cached UUID:', error)
    }

    // Generate new UUID
    const newUUID = generateUUID()

    try {
        // Ensure cache directory exists
        fs.mkdirSync(cacheDir, { recursive: true })

        // Cache the UUID
        fs.writeFileSync(cacheFilePath, newUUID, 'utf-8')
    } catch (error) {
        console.warn('[vite-plugin-devtools-settings] Failed to cache UUID:', error)
    }

    return newUUID
}

/**
 * Create devtools.json content
 */
function createDevtoolsJsonContent(
    projectRoot: string,
    uuid: string,
    normalizeForWindowsContainer: boolean = false
): DevtoolsWorkspace {
    let rootPath = projectRoot

    // Normalize path if requested
    if (normalizeForWindowsContainer) {
        rootPath = normalizePathForWindowsContainer(rootPath)
    }

    return {
        workspace: {
            root: rootPath,
            uuid
        }
    }
}

/**
 * Add middleware to serve devtools.json
 */
function addDevtoolsMiddleware(
    server: ViteDevServer,
    getDevtoolsJson: () => DevtoolsWorkspace
) {
    server.middlewares.use('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
        try {
            const devtoolsJson = getDevtoolsJson()

            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Cache-Control', 'no-cache')

            res.statusCode = 200
            res.end(JSON.stringify(devtoolsJson, null, 2))
        } catch (error) {
            console.error('[vite-plugin-devtools-settings] Error serving devtools.json:', error)

            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Internal server error' }))
        }
    })
}

/**
 * Vite plugin for DevTools project settings
 */
export default function devtoolsSettingsPlugin(options: DevtoolsSettingsOptions = {}): Plugin {
    const {
        projectRoot = process.cwd(),
        normalizeForWindowsContainer = false,
        uuid,
        cacheDir
    } = options

    let cachedDevtoolsJson: DevtoolsWorkspace | null = null
    let cachedUUID: string = ''

    return {
        name: 'vite-plugin-devtools-settings',

        async configureServer(server) {
            try {
                // Resolve cache directory
                const resolvedCacheDir = cacheDir || path.join(projectRoot, '.vite')

                // Get or generate UUID
                cachedUUID = await getOrGenerateUUID(resolvedCacheDir, uuid)

                // Create devtools.json content
                cachedDevtoolsJson = createDevtoolsJsonContent(
                    projectRoot,
                    cachedUUID,
                    normalizeForWindowsContainer
                )

                // Add middleware to serve the JSON endpoint
                addDevtoolsMiddleware(server, () => cachedDevtoolsJson!)

                console.log('[vite-plugin-devtools-settings] Plugin initialized')
                console.log(`[vite-plugin-devtools-settings] Serving devtools.json at: /.well-known/appspecific/com.chrome.devtools.json`)
                console.log(`[vite-plugin-devtools-settings] Workspace UUID: ${cachedUUID}`)
                console.log(`[vite-plugin-devtools-settings] Project root: ${projectRoot}`)

            } catch (error) {
                console.error('[vite-plugin-devtools-settings] Failed to initialize plugin:', error)
            }
        },

        // Generate devtools.json file during build
        writeBundle() {
            if (cachedDevtoolsJson) {
                const outputPath = path.join(projectRoot, 'dist', '.well-known', 'appspecific', 'com.chrome.devtools.json')

                try {
                    // Ensure directory exists
                    fs.mkdirSync(path.dirname(outputPath), { recursive: true })

                    // Write devtools.json file
                    fs.writeFileSync(outputPath, JSON.stringify(cachedDevtoolsJson, null, 2), 'utf-8')

                    console.log(`[vite-plugin-devtools-settings] Generated devtools.json at: ${outputPath}`)
                } catch (error) {
                    console.error('[vite-plugin-devtools-settings] Failed to write devtools.json:', error)
                }
            }
        }
    }
}

// Types are already defined and exported above
