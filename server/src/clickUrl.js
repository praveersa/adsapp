/**
 * Extract the click-through URL from raw ad markup (adm).
 *
 * Priority order mirrors the client-side creativeParser:
 *   1. An explicit `ptcurl` config value (EngageClick / inline creatives).
 *   2. The first URL that looks like a click tracker/redirect (contains "clk").
 *   3. A best-effort scan for the advertiser/landing URL in the markup.
 *
 * We deliberately do NOT percent-decode the value: the nested click-redirect
 * target (e.g. an `adurl=` param) is intentionally percent-encoded and must
 * stay that way so the tracker can redirect correctly.
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
]

// Turn the HTML/JS escaping the markup adds (&amp;, &#38;, escaped slashes)
// back into the real URL, without percent-decoding. Returns the unescaped
// string if it is a valid http(s) URL, else null.
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

function extractPtcUrl(adm) {
  const match = adm.match(/ptcurl['"]?\s*[:=]\s*['"]([^'"]+)['"]/i)
  return match ? decodeUrlValue(match[1]) : null
}

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
    const decoded = decodeUrlValue(match[1])
    if (decoded) {
      urls.add(decoded)
    }
  }

  const looseUrlPattern = /https?:\/\/[^\s"'<>\\]+/gi
  for (const match of adm.matchAll(looseUrlPattern)) {
    const decoded = decodeUrlValue(match[0].replace(/[),.;]+$/, ''))
    if (decoded) {
      urls.add(decoded)
    }
  }

  return [...urls]
}

/**
 * Returns the click-through URL extracted from `adm`, or null if none is found.
 * `adomain` (optional) helps pick the advertiser's own URL in the fallback scan.
 */
export function extractClickUrlFromAdm(adm, adomain) {
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
