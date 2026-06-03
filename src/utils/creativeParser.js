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

export function extractClickThroughUrl(adm, adomain) {
  const candidates = collectUrlsFromMarkup(adm).filter((url) => !isTrackingUrl(url))

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

  const nonAdServer = candidates.find((url) => {
    try {
      const host = new URL(url).hostname
      return !/(adsystem|adserver|adservice|adtech|adform)/i.test(host)
    } catch {
      return false
    }
  })

  if (nonAdServer) {
    return nonAdServer
  }

  return `https://${adomain.replace(/^www\./, '')}`
}
