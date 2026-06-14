/**
 * Predefined creative metadata. In production this is produced by an offline
 * LLM analysis pass per creative and persisted to a DB. Keyed by creative ID.
 *
 * Each record stores the metadata the spec calls for:
 *   - campaignGoal
 *   - creativeContent
 *   - textMessage
 *   - clickUrl (click destination)
 *   - advertiserInfo
 * plus `knowledge` used to ground answers and query generation.
 */
const CREATIVES = {
  'samsung-galaxy-s26-ultra': {
    id: 'samsung-galaxy-s26-ultra',
    advertiserDomain: 'samsung.com',
    advertiserName: 'Samsung',
    productLabel: 'Galaxy S26 Ultra',
    metadata: {
      campaignGoal:
        'Drive awareness and pre-orders for the Samsung Galaxy S26 Ultra flagship smartphone.',
      creativeContent:
        'Product hero image of the Galaxy S26 Ultra highlighting its 200MP camera system, slim Armor Aluminum design, and Galaxy AI.',
      textMessage:
        'Meet the all-new Galaxy S26 Ultra — Galaxy AI, 200MP camera, Snapdragon 8 Elite Gen 5, and the first Privacy Display on mobile.',
      clickUrl: 'https://www.samsung.com/global/galaxy/galaxy-s26-ultra/',
      advertiserInfo:
        'Samsung Electronics is a global leader in mobile devices, displays, and consumer electronics.',
    },
    knowledge: [
      'Built-in Privacy Display: the world\'s first Privacy Display on mobile, with customizable viewability settings, defense-grade Knox security, on-device protection, and secure payments via Samsung Wallet.',
      'Agentic AI Experience: Galaxy AI with Now Nudge real-time suggestions, the Finder search on the Home screen, and One UI 8.5 personalization in a tap.',
      '200MP High Resolution Camera: bright, detailed night video, enhanced noise reduction, Photo Assist editing, and Creative Studio stickers.',
      'Snapdragon 8 Elite Gen 5 for Galaxy: the most powerful customized processor with a redesigned Vapor Chamber, 60W Super Fast Charging 3.0, and 25W Super Fast Wireless charging.',
      'Ultra Modern, Sleek Design: ambient island camera design, Armor Aluminum frame, Corning Gorilla Glass, and galaxy-inspired colors — the slimmest Ultra yet.',
    ],
  },
  'pluto-tv-streaming': {
    id: 'pluto-tv-streaming',
    advertiserDomain: 'pluto.tv',
    advertiserName: 'Pluto TV',
    productLabel: 'Pluto TV',
    metadata: {
      campaignGoal: 'Grow free streaming sign-ups and app installs for Pluto TV.',
      creativeContent:
        'Banner promoting free live channels and on-demand movies and shows on Pluto TV.',
      textMessage: 'Stream hundreds of channels and thousands of movies — free.',
      clickUrl: 'https://pluto.tv',
      advertiserInfo:
        'Pluto TV is a free, ad-supported streaming service offering live channels and on-demand content.',
    },
    knowledge: [
      'Pluto TV is completely free and ad-supported — no subscription or credit card required.',
      'Hundreds of live channels span news, sports, movies, comedy, reality, and curated themed channels.',
      'A large on-demand library of movies and TV shows is available any time.',
      'Available on smart TVs, mobile apps, web browsers, and popular streaming devices.',
    ],
  },
  '712960825': {
    id: '712960825',
    advertiserDomain: 'pepsico.com',
    advertiserName: 'Pure Leaf',
    productLabel: 'Pure Leaf Real Brewed Iced Tea',
    metadata: {
      campaignGoal:
        'Drive in-store purchase of Pure Leaf Real Brewed Iced Tea via a 2 for $4 promotion at 7-Eleven.',
      creativeContent:
        'Display creative featuring two Pure Leaf iced tea bottles — Sweet Tea and Lemon — with a "2 / $4" price offer and 7-Eleven retailer branding on a dark background.',
      textMessage:
        'Pure Leaf Real Brewed Iced Tea — get 2 for $4 at 7-Eleven. Refreshingly real, brewed from real tea leaves.',
      clickUrl: 'https://www.pureleaf.com/',
      advertiserInfo:
        'Pure Leaf is a real brewed iced tea brand from PepsiCo (in partnership with Lipton), known for tea brewed from real tea leaves and never from powder.',
    },
    knowledge: [
      'Limited-time offer: 2 bottles for $4 on Pure Leaf Real Brewed Iced Tea, available at 7-Eleven.',
      'Sweet Tea: Pure Leaf Sweet Tea is real brewed black tea with a smooth, classic sweet-tea taste.',
      'Lemon: Pure Leaf Lemon is real brewed black tea with natural lemon flavor for a crisp, refreshing finish.',
      'Real brewed: Pure Leaf is brewed from real tea leaves picked at their freshest — never from powder or concentrate.',
      'Where to buy: pick up the 2 for $4 deal at participating 7-Eleven stores while supplies last.',
    ],
  },
}

function synthesizeCreative(creativeId, advertiserDomain, clickUrl) {
  const domain = (advertiserDomain || 'advertiser.com').replace(/^www\./, '').toLowerCase()
  const brandName =
    domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)

  return {
    id: creativeId || `creative-${domain}`,
    advertiserDomain: domain,
    advertiserName: brandName,
    productLabel: brandName,
    metadata: {
      campaignGoal: `Drive interest and conversions for ${brandName}.`,
      creativeContent: `Display creative promoting ${brandName}.`,
      textMessage: `Discover what ${brandName} has to offer.`,
      // Always prefer the real click destination extracted from the adm; only
      // fall back to the bare domain when no adm/click URL is available.
      clickUrl: clickUrl || `https://${domain}`,
      advertiserInfo: `${brandName} (${domain})`,
    },
    knowledge: [
      `${brandName} offers products and services available at ${domain}.`,
    ],
    synthesized: true,
  }
}

/**
 * Resolve the creative for a request.
 * @param {string} creativeId
 * @param {string} advertiserDomain
 * @param {object} [options]
 * @param {string} [options.clickUrl] Click-through URL extracted from the adm.
 *   When provided it overrides any stored/synthesized clickUrl, because the adm
 *   is the source of truth for where a click should actually go.
 */
export function getCreative(creativeId, advertiserDomain, options = {}) {
  const { clickUrl } = options

  const withClickUrl = (creative) => {
    if (!clickUrl) {
      return creative
    }
    // Override clickUrl with the adm-extracted destination without mutating the
    // shared CREATIVES record.
    return {
      ...creative,
      metadata: { ...creative.metadata, clickUrl },
    }
  }

  if (creativeId && CREATIVES[creativeId]) {
    return withClickUrl(CREATIVES[creativeId])
  }

  if (advertiserDomain) {
    const match = Object.values(CREATIVES).find(
      (creative) => creative.advertiserDomain === advertiserDomain.replace(/^www\./, '').toLowerCase(),
    )
    if (match) {
      return withClickUrl(match)
    }
  }

  return synthesizeCreative(creativeId, advertiserDomain, clickUrl)
}
