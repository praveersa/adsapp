/**
 * Fetches public web info about an advertiser/landing page so the bot can
 * ground answers and queries for creatives we have no stored metadata for.
 *
 * Uses the r.jina.ai readability proxy (returns clean text/markdown) with a
 * plain-HTML fallback. Best-effort: returns null on any failure so callers can
 * fall back to deterministic behavior.
 */

const RESEARCH_TIMEOUT_MS = Number(process.env.RESEARCH_TIMEOUT_MS) || 7000
const MAX_CHARS = 4000

function clampText(value, maxLength = MAX_CHARS) {
  const normalized = String(value).replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim()
  if (normalized.length <= maxLength) {
    return normalized
  }
  return `${normalized.slice(0, maxLength - 1)}…`
}

async function fetchWithTimeout(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(RESEARCH_TIMEOUT_MS),
    })
    if (!response.ok) {
      return null
    }
    return await response.text()
  } catch {
    return null
  }
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseReadable(text) {
  const lines = text.split('\n').map((line) => line.trim())
  const titleLine = lines.find((line) => line.startsWith('Title:'))
  const descLine = lines.find((line) => line.startsWith('Description:'))

  const title = titleLine ? titleLine.replace(/^Title:\s*/, '') : ''
  const description = descLine ? descLine.replace(/^Description:\s*/, '') : ''

  // Body: drop the metadata preamble jina adds (Title/URL Source/etc).
  const bodyStart = lines.findIndex((line) => line.startsWith('Markdown Content:'))
  const body =
    bodyStart >= 0 ? lines.slice(bodyStart + 1).join('\n') : text

  return { title, description, body }
}

/**
 * Research a URL (typically the landing page). Returns a structured summary or
 * null. The `summary` field is a compact text blob suitable for an LLM prompt.
 */
export async function researchUrl(targetUrl) {
  if (!targetUrl) {
    return null
  }

  // 1) Readability proxy (clean text).
  const readable = await fetchWithTimeout(`https://r.jina.ai/${targetUrl}`, {
    headers: { Accept: 'text/plain' },
  })

  if (readable) {
    const { title, description, body } = parseReadable(readable)
    const summary = clampText([title, description, body].filter(Boolean).join('\n'))
    if (summary) {
      return { url: targetUrl, title, description, summary, source: 'reader' }
    }
  }

  // 2) Plain HTML fallback.
  const html = await fetchWithTimeout(targetUrl)
  if (html) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const descMatch = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    )
    const title = titleMatch?.[1]?.trim() || ''
    const description = descMatch?.[1]?.trim() || ''
    const summary = clampText([title, description, stripHtml(html)].filter(Boolean).join('\n'))
    if (summary) {
      return { url: targetUrl, title, description, summary, source: 'html' }
    }
  }

  return null
}

/**
 * Research an advertiser for a synthesized creative. Tries the click/landing URL
 * first, then the bare domain homepage. Returns null if nothing is reachable.
 */
export async function researchAdvertiser({ clickUrl, domain }) {
  const candidates = []
  if (clickUrl) {
    candidates.push(clickUrl)
  }
  if (domain) {
    candidates.push(`https://${domain.replace(/^www\./, '')}`)
  }

  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const result = await researchUrl(candidate)
    if (result?.summary) {
      return result
    }
  }

  return null
}
