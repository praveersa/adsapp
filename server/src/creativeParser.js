/**
 * Server-side click-through URL extraction from ad markup (ADM).
 * Mirrors src/utils/creativeParser.js so the backend can derive the real click
 * destination (ptcurl / clk tracker) instead of guessing https://{domain}.
 */

const TRACKING_HOST_PATTERNS = [
  /bidswitch/i,
  /doubleclick/i,
  /amazon-adsystem/i,
  /googlesyndication/i,
  /adnxs/i,
  /adsrvr/i,
  /moatads/i,
  /pixel/i,
  /beacon/i,
  /\/sync/i,
  /\/imp[_/]?/i,
  /\/e\/or\//i,
  /\/e\/imp/i,
  /\/creative\?/i,
]

const CLICK_TAG_PATTERNS = [
  /clickTag\s*=\s*['"]([^'"]+)['"]/gi,
  /clickTAG\s*=\s*['"]([^'"]+)['"]/gi,
  /click_url\s*[:=]\s*['"]([^'"]+)['"]/gi,
  /landingPage(?:Url)?\s*[:=]\s*['"]([^'"]+)['"]/gi,
  /destinationUrl\s*[:=]\s*['"]([^'"]+)['"]/gi,
]

function normalizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl.replace(/&amp;/g, '&'))
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString()
    }
  } catch {
    return null
  }

  return null
}

// Unescape HTML/JS escaping (&amp;, &#38;, escaped slashes) without
// percent-decoding — the nested redirect target (adurl=) must stay encoded.
function decodeUrlValue(rawUrl) {
  if (!rawUrl) {
    return null
  }

  const decoded = rawUrl
    .replace(/&amp;/gi, '&')
    .replace(/&#0*38;/g, '&')
    .replace(/&#x0*26;/gi, '&')
    .replace(/\\\//g, '/')
    .trim()

  try {
    const url = new URL(decoded)
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return decoded
    }
  } catch {
    return null
  }

  return null
}

// Pull the click destination from a `ptcurl:'...'` config value.
function extractPtcUrl(adm) {
  const pattern = /ptcurl['"]?\s*[:=]\s*['"]([^'"]+)['"]/i
  const match = adm.match(pattern)
  if (!match) {
    return null
  }
  return decodeUrlValue(match[1])
}

// Find the first URL that looks like a click tracker/redirect (contains "clk").
function extractClkUrl(adm) {
  const looseUrlPattern = /https?:\/\/[^\s"'<>\\]+/gi
  for (const match of adm.matchAll(looseUrlPattern)) {
    if (/clk/i.test(match[0])) {
      const decoded = decodeUrlValue(match[0])
      if (decoded) {
        return decoded
      }
    }
  }
  return null
}

function isTrackingUrl(url) {
  return TRACKING_HOST_PATTERNS.some((pattern) => pattern.test(url))
}

function domainMatchesAdomain(hostname, adomain) {
  const normalizedAdomain = adomain.replace(/^www\./, '').toLowerCase()
  const host = hostname.replace(/^www\./, '').toLowerCase()

  return (
    host === normalizedAdomain ||
    host.endsWith(`.${normalizedAdomain}`) ||
    normalizedAdomain.endsWith(host)
  )
}

function collectUrlsFromMarkup(adm) {
  const urls = new Set()

  const attributePattern =
    /(?:href|src|data-click-url|data-destination|data-landing-url)\s*=\s*["']([^"']+)["']/gi

  for (const match of adm.matchAll(attributePattern)) {
    const url = normalizeUrl(match[1])
    if (url) {
      urls.add(url)
    }
  }

  for (const pattern of CLICK_TAG_PATTERNS) {
    for (const match of adm.matchAll(pattern)) {
      const url = normalizeUrl(match[1])
      if (url) {
        urls.add(url)
      }
    }
  }

  const looseUrlPattern = /https?:\/\/[^\s"'<>\\]+/gi
  for (const match of adm.matchAll(looseUrlPattern)) {
    const cleaned = match[0].replace(/[),.;]+$/, '')
    const url = normalizeUrl(cleaned)
    if (url) {
      urls.add(url)
    }
  }

  return [...urls]
}

/**
 * Extract the click-through URL from ad markup, in priority order:
 *   1) explicit `ptcurl` config value
 *   2) a click tracker/redirect URL (contains "clk")
 *   3) advertiser/landing URL scanned from the markup
 * Returns null if the markup is empty or nothing usable is found.
 */
export function extractClickThroughUrl(adm, adomain) {
  if (!adm || typeof adm !== 'string') {
    return null
  }

  const ptcUrl = extractPtcUrl(adm)
  if (ptcUrl) {
    return ptcUrl
  }

  const clkUrl = extractClkUrl(adm)
  if (clkUrl) {
    return clkUrl
  }

  const candidates = collectUrlsFromMarkup(adm).filter((url) => !isTrackingUrl(url))

  if (adomain) {
    const adomainMatch = candidates.find((url) => {
      try {
        return domainMatchesAdomain(new URL(url).hostname, adomain)
      } catch {
        return false
      }
    })

    if (adomainMatch) {
      return adomainMatch
    }
  }

  const nonAdServer = candidates.find((url) => {
    try {
      const host = new URL(url).hostname
      return !/(adsystem|adserver|adservice|adtech|adform)/i.test(host)
    } catch {
      return false
    }
  })

  return nonAdServer || null
}
