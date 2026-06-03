const CRAWL_TIMEOUT_MS = 12000

function trimText(value, maxLength = 220) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength - 1)}…`
}

function extractHighlights(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const highlights = []

  for (const line of lines) {
    if (line.startsWith('#')) {
      highlights.push(line.replace(/^#+\s*/, ''))
    } else if (line.length > 40 && !line.startsWith('http')) {
      highlights.push(line)
    }

    if (highlights.length >= 6) {
      break
    }
  }

  return highlights
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), CRAWL_TIMEOUT_MS)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

async function fetchReadablePage(url) {
  const readerUrl = `https://r.jina.ai/${url}`
  const response = await fetchWithTimeout(readerUrl, {
    headers: { Accept: 'text/plain' },
  })

  if (!response.ok) {
    throw new Error(`Unable to read landing page (${response.status})`)
  }

  return response.text()
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseHtmlPage(html, landingUrl) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const descriptionMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  )

  const title = titleMatch?.[1]?.trim() || ''
  const description = descriptionMatch?.[1]?.trim() || ''
  const bodyText = stripHtml(html)
  const highlights = bodyText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 50)
    .slice(0, 4)

  return {
    landingUrl,
    title: trimText(title, 120),
    description: trimText(description, 280),
    highlights: highlights.map((item) => trimText(item, 180)),
    source: 'crawl',
  }
}

async function fetchHtmlFallback(landingUrl) {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(landingUrl)}`
  const response = await fetchWithTimeout(proxyUrl)

  if (!response.ok) {
    throw new Error(`HTML fallback failed (${response.status})`)
  }

  const html = await response.text()
  return parseHtmlPage(html, landingUrl)
}

function parseReadableText(text, landingUrl) {
  const lines = text.split('\n').map((line) => line.trim())
  const title =
    lines.find((line) => line.startsWith('Title:'))?.replace(/^Title:\s*/, '') ||
    lines.find((line) => line.length > 0 && !line.startsWith('URL Source:')) ||
    'Advertiser offer'

  const description =
    lines.find((line) => line.startsWith('Description:'))?.replace(/^Description:\s*/, '') ||
    lines.find((line) => line.length > 80 && !line.startsWith('http')) ||
    ''

  const highlights = extractHighlights(text)

  return {
    landingUrl,
    title: trimText(title, 120),
    description: trimText(description, 280),
    highlights: highlights.map((item) => trimText(item, 180)),
    source: 'crawl',
  }
}

export async function crawlLandingPage(landingUrl) {
  try {
    const text = await fetchReadablePage(landingUrl)
    return parseReadableText(text, landingUrl)
  } catch {
    try {
      return await fetchHtmlFallback(landingUrl)
    } catch {
      return {
        landingUrl,
        title: '',
        description: '',
        highlights: [],
        source: 'fallback',
      }
    }
  }
}
