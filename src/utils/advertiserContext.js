// Product-specific profiles keyed by creative ID (crid). These take priority
// over domain profiles so a single advertiser domain (e.g. pepsico.com) can map
// to the exact advertised product instead of a generic brand homepage.
const CREATIVE_PROFILES = {
  '712960825': {
    name: 'Pure Leaf',
    productLabel: 'Pure Leaf Real Brewed Iced Tea',
    // Curated; do not let a homepage crawl override these.
    locked: true,
    queries: [
      {
        question: 'How does Pure Leaf taste?',
        answer: [
          {
            title: 'Real brewed taste',
            text: 'Pure Leaf is **real brewed from real tea leaves** — never from powder or concentrate — for a smooth, authentic iced tea taste.',
          },
          {
            title: 'Sweet Tea & Lemon',
            text: '**Sweet Tea** is real brewed black tea with a classic, smooth sweetness, while **Lemon** adds natural lemon flavor for a crisp, refreshing finish.',
          },
        ],
      },
      {
        question: 'Is Pure Leaf healthy?',
        answer: [
          {
            title: 'Simple, real ingredients',
            text: 'Pure Leaf is brewed from **real tea leaves** picked at their freshest, with **no powders or concentrate** — a refreshingly real iced tea.',
          },
          {
            title: 'Check the label',
            text: 'Sugar and calorie content vary by flavor (Sweet Tea vs Lemon). Check the **Nutrition Facts** on the bottle for exact values for your variety.',
          },
        ],
      },
      {
        question: 'What flavors are available?',
        answer: [
          {
            title: 'Two refreshing options',
            text: 'This offer features **Sweet Tea** and **Lemon** — both **real brewed** black tea for a genuinely refreshing taste.',
          },
        ],
      },
      {
        question: 'Where can I get the 2 for $4 deal?',
        answer: [
          {
            title: 'At 7-Eleven',
            text: 'Grab **2 bottles for $4** on Pure Leaf Real Brewed Iced Tea at participating **7-Eleven** stores while supplies last.',
          },
        ],
      },
    ],
  },
  '716013088': {
    name: 'Vrbo',
    productLabel: 'VrboCare',
    locked: true,
    queries: [
      {
        question: 'What is VrboCare?',
        answer: [
          {
            title: 'Peace of mind, free',
            text: 'VrboCare is **free traveler protection** included with **every Vrbo booking** — there is **no extra cost** and nothing to opt into.',
          },
          {
            title: 'Help is always ready',
            text: 'If something goes wrong before or during your trip, Vrbo is **always ready to help** so you can book with peace of mind.',
          },
        ],
      },
      {
        question: 'What does VrboCare cover?',
        answer: [
          {
            title: 'Covered issues',
            text: 'VrboCare safeguards you against **host-initiated cancellations**, **check-in issues**, **fraud**, and **significant property misrepresentation**.',
          },
          {
            title: 'Rebooking & refunds',
            text: 'If a covered issue happens, Vrbo helps with **rebooking** into comparable stays or with **refunds**, and can arrange lodging when needed.',
          },
        ],
      },
      {
        question: 'How long am I protected?',
        answer: [
          {
            title: '90-day rebooking window',
            text: 'Vrbo expanded the rebooking window from 30 to **90 days before check-in**, giving you more time and flexibility if issues arise.',
          },
          {
            title: '24/7 support',
            text: 'You get **24/7 live support** before and during your trip when you book, pay, and message through Vrbo.',
          },
        ],
      },
      {
        question: 'Does VrboCare cost extra?',
        answer: [
          {
            title: 'Always included',
            text: 'No — VrboCare is **automatically included free** with every booking made on the Vrbo site or app.',
          },
        ],
      },
    ],
  },
}

const DOMAIN_PROFILES = {
  'pluto.tv': {
    name: 'Pluto TV',
    productLabel: 'Pluto TV',
    queries: [
      {
        question: 'What is Pluto TV?',
        answer: [
          {
            title: 'Free streaming',
            text: 'Pluto TV is a **free** ad-supported streaming service with **live channels**, movies, and shows across news, sports, entertainment, and more.',
          },
          {
            title: 'No subscription',
            text: 'Watch for free with **no credit card or subscription**. Just pick a channel and start streaming.',
          },
        ],
      },
      {
        question: 'What can I watch on Pluto TV?',
        answer: [
          {
            title: 'Live channels',
            text: 'Stream **hundreds of live channels** including movies, reality, crime, comedy, news, sports highlights, and curated themed channels.',
          },
        ],
      },
      {
        question: 'Where can I watch Pluto TV?',
        answer: [
          {
            title: 'Devices',
            text: 'Pluto TV works on **smart TVs, mobile apps, web browsers, and popular streaming devices** so you can watch at home or on the go.',
          },
        ],
      },
    ],
  },
  'samsung.com': {
    name: 'Samsung',
    productLabel: 'Galaxy S26 Ultra',
    queries: [
      {
        question: 'What are the features of this product?',
        answer: [
          {
            title: 'Built-in Privacy Display',
            text: "**World's first Privacy Display** on mobile with customizable viewability settings, **Knox security**, on-device protection, and Samsung Wallet.",
          },
          {
            title: 'Agentic AI Experience',
            text: '**Galaxy AI** with Now Nudge, Finder on Home screen, and **One UI 8.5** personalization in one tap.',
          },
          {
            title: '200MP High Resolution Camera',
            text: '**Bright night video**, Photo Assist editing, and Creative Studio stickers from your photos.',
          },
        ],
      },
      {
        question: 'How does the privacy display help?',
        answer: [
          {
            title: 'Privacy control',
            text: '**Privacy Display** viewability settings keep everyday moments more private with **Knox** and Samsung Wallet support.',
          },
        ],
      },
      {
        question: 'Is it good for gaming and charging?',
        answer: [
          {
            title: 'Performance and charging',
            text: '**Snapdragon 8 Elite Gen 5** for Galaxy, Vapor Chamber cooling, **60W wired** and **25W wireless** Super Fast charging.',
          },
        ],
      },
    ],
  },
}

function formatDomainName(domain) {
  const label = domain.replace(/^www\./, '').split('.')[0]
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function getAdvertiserContext(adomain, creativeId) {
  const normalizedDomain = adomain.toLowerCase().replace(/^www\./, '')

  // Creative-specific profile wins over the domain profile so we describe the
  // exact advertised product (e.g. Pure Leaf) rather than the brand homepage.
  const creativeProfile = creativeId ? CREATIVE_PROFILES[String(creativeId)] : undefined
  if (creativeProfile) {
    return {
      domain: normalizedDomain,
      name: creativeProfile.name,
      productLabel: creativeProfile.productLabel,
      queries: creativeProfile.queries,
      locked: Boolean(creativeProfile.locked),
    }
  }

  const profile = DOMAIN_PROFILES[normalizedDomain]

  if (profile) {
    return {
      domain: normalizedDomain,
      name: profile.name,
      productLabel: profile.productLabel,
      queries: profile.queries,
      locked: Boolean(profile.locked),
    }
  }

  const brandName = formatDomainName(normalizedDomain)

  return {
    domain: normalizedDomain,
    name: brandName,
    productLabel: brandName,
    queries: [
      {
        question: `What does ${brandName} offer?`,
        answer: [
          {
            title: 'Overview',
            text: `${brandName} offers products and services tailored to your needs. Explore features, benefits, and how to get started on ${normalizedDomain}.`,
          },
        ],
      },
      {
        question: `Why choose ${brandName}?`,
        answer: [
          {
            title: 'Key benefits',
            text: `Discover what makes ${brandName} stand out, including quality, value, and a streamlined experience designed for users.`,
          },
        ],
      },
      {
        question: `How do I get started with ${brandName}?`,
        answer: [
          {
            title: 'Next steps',
            text: `Visit ${normalizedDomain} to learn more, compare options, and take the next step with ${brandName}.`,
          },
        ],
      },
    ],
  }
}
