import { config, isLlmConfigured } from './config.js'

/**
 * Run a chat completion against the configured OpenAI-compatible endpoint
 * (FastRouter) using the built-in fetch — no SDK dependency.
 * Throws on failure/timeout so callers can fall back.
 */
export async function chatComplete(messages, { temperature } = {}) {
  if (!isLlmConfigured) {
    throw new Error('LLM is not configured')
  }

  const response = await fetch(`${config.llm.baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.llm.apiKey}`,
    },
    body: JSON.stringify({
      model: config.llm.model,
      messages,
      ...(temperature === undefined ? {} : { temperature }),
    }),
    signal: AbortSignal.timeout(config.llm.timeoutMs),
  })

  if (!response.ok) {
    throw new Error(`LLM request failed (${response.status})`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content?.trim() ?? ''
}
