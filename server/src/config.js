import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))

// Minimal .env loader (no dotenv dependency).
function loadEnv() {
  try {
    const content = readFileSync(join(currentDir, '..', '.env'), 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }
      const eq = trimmed.indexOf('=')
      if (eq === -1) {
        continue
      }
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      if (!(key in process.env)) {
        process.env[key] = value
      }
    }
  } catch {
    // No .env file present; rely on the existing environment.
  }
}

loadEnv()

export const config = {
  port: Number(process.env.PORT) || 3001,
  maxChats: Number(process.env.MAX_CHATS) || 5,
  llm: {
    baseURL: process.env.LLM_BASE_URL || 'https://api.fastrouter.ai/api/v1',
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'ADSAppModelNano',
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS) || 8000,
  },
}

export const isLlmConfigured = Boolean(config.llm.apiKey)
