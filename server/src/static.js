/**
 * Minimal static-file server for the built frontend (Vite `dist/`).
 * Used in production so a single Node service serves both the API and the SPA.
 * No external dependency — built on node:fs/node:path.
 */
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, normalize, extname } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))

// server/src -> repo root -> dist
const DIST_DIR = join(currentDir, '..', '..', 'dist')

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

function contentTypeFor(filePath) {
  return MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream'
}

async function resolveExistingFile(filePath) {
  try {
    const info = await stat(filePath)
    if (info.isFile()) {
      return { path: filePath, size: info.size }
    }
  } catch {
    // not found / not a file
  }
  return null
}

function sendFile(res, file, { cacheControl } = {}) {
  res.writeHead(200, {
    'Content-Type': contentTypeFor(file.path),
    'Content-Length': file.size,
    ...(cacheControl ? { 'Cache-Control': cacheControl } : {}),
  })
  createReadStream(file.path).pipe(res)
}

/**
 * Try to serve a request from the built frontend.
 * - Serves matching static assets (with long cache for hashed assets).
 * - Falls back to index.html for client-side routes (SPA).
 * Returns true if it handled the response, false if it could not (so the caller
 * can return its own 404).
 */
export async function serveStatic(req, res, pathname) {
  // Prevent path traversal: normalize and strip any leading slashes/dots.
  const safePath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '')
  const requested = join(DIST_DIR, safePath)

  // Guard: the resolved path must stay inside DIST_DIR.
  if (!requested.startsWith(DIST_DIR)) {
    return false
  }

  // 1) Exact static asset.
  if (pathname !== '/') {
    const file = await resolveExistingFile(requested)
    if (file) {
      // Vite emits content-hashed filenames under /assets, safe to cache hard.
      const cacheControl = safePath.includes(`${join('/', 'assets')}/`) || safePath.includes('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=0, must-revalidate'
      sendFile(res, file, { cacheControl })
      return true
    }
  }

  // 2) SPA fallback: serve index.html for any non-API GET route.
  const indexFile = await resolveExistingFile(join(DIST_DIR, 'index.html'))
  if (indexFile) {
    sendFile(res, indexFile, { cacheControl: 'public, max-age=0, must-revalidate' })
    return true
  }

  return false
}
