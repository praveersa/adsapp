import { getAdvertiserContext } from './advertiserContext'
import { extractClickThroughUrl } from './creativeParser'
import { crawlLandingPage } from './contentCrawler'

function buildAnswerBlocks(highlights, fallbackText) {
  if (highlights.length === 0) {
    return [
      {
        title: 'Overview',
        text: fallbackText,
      },
    ]
  }

  return highlights.slice(0, 4).map((highlight, index) => {
    const [title, ...rest] = highlight.split(':')
    const hasTitle = rest.length > 0 && title.length < 60

    if (hasTitle) {
      return {
        title: title.trim(),
        text: rest.join(':').trim(),
      }
    }

    return {
      title: `Highlight ${index + 1}`,
      text: highlight,
    }
  })
}

export function buildQueriesFromCrawl({ adomain, pageContent, brandName }) {
  const { title, description, highlights, landingUrl } = pageContent
  const productLabel = title || brandName

  if (!description && highlights.length === 0) {
    return getAdvertiserContext(adomain).queries
  }

  const intro = description || highlights[0] || `Learn more on ${landingUrl}`
  const answerBlocks = buildAnswerBlocks(highlights, intro)

  const queries = [
    {
      question: `What is ${productLabel}?`,
      answer: answerBlocks.slice(0, 2),
    },
    {
      question: `Why visit ${brandName}?`,
      answer: [
        {
          title: 'What you get',
          text: intro,
        },
      ],
    },
    {
      question: `How do I get started with ${brandName}?`,
      answer: [
        {
          title: 'Next step',
          text: `Continue to ${landingUrl} to explore the offer and complete the advertiser's intended action.`,
        },
      ],
    },
  ]

  return queries
}

export async function resolveAdvertiserContext(adomain, adm) {
  const baseContext = getAdvertiserContext(adomain)
  const landingUrl = extractClickThroughUrl(adm, adomain)
  const pageContent = await crawlLandingPage(landingUrl)

  const queries =
    pageContent.source === 'crawl' && (pageContent.description || pageContent.highlights.length)
      ? buildQueriesFromCrawl({
          adomain,
          pageContent,
          brandName: baseContext.name,
        })
      : baseContext.queries

  return {
    ...baseContext,
    landingUrl,
    pageContent,
    productLabel: pageContent.title || baseContext.productLabel,
    queries,
  }
}
