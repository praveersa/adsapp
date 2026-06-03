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
            text: 'Pluto TV is a free ad-supported streaming service with live channels, movies, and shows across news, sports, entertainment, and more.',
          },
          {
            title: 'No subscription',
            text: 'Watch for free without a credit card or subscription. Just pick a channel and start streaming.',
          },
        ],
      },
      {
        question: 'What can I watch on Pluto TV?',
        answer: [
          {
            title: 'Live channels',
            text: 'Stream hundreds of live channels including movies, reality, crime, comedy, news, sports highlights, and curated themed channels.',
          },
        ],
      },
      {
        question: 'Where can I watch Pluto TV?',
        answer: [
          {
            title: 'Devices',
            text: 'Pluto TV is available on smart TVs, mobile apps, web browsers, and popular streaming devices so you can watch at home or on the go.',
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
            text: "World's first Privacy Display on mobile with customizable viewability settings, Knox security, on-device protection, and Samsung Wallet.",
          },
          {
            title: 'Agentic AI Experience',
            text: 'Galaxy AI with Now Nudge, Finder on Home screen, and One UI 8.5 personalization in one tap.',
          },
          {
            title: '200MP High Resolution Camera',
            text: 'Bright night video, Photo Assist editing, and Creative Studio stickers from your photos.',
          },
        ],
      },
      {
        question: 'How does the privacy display help?',
        answer: [
          {
            title: 'Privacy control',
            text: 'Privacy Display viewability settings keep everyday moments more private with Knox and Samsung Wallet support.',
          },
        ],
      },
      {
        question: 'Is it good for gaming and charging?',
        answer: [
          {
            title: 'Performance and charging',
            text: 'Snapdragon 8 Elite Gen 5 for Galaxy, Vapor Chamber cooling, 60W wired and 25W wireless Super Fast charging.',
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

export function getAdvertiserContext(adomain) {
  const normalizedDomain = adomain.toLowerCase().replace(/^www\./, '')
  const profile = DOMAIN_PROFILES[normalizedDomain]

  if (profile) {
    return {
      domain: normalizedDomain,
      name: profile.name,
      productLabel: profile.productLabel,
      queries: profile.queries,
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
