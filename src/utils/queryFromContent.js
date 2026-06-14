import { getAdvertiserContext } from './advertiserContext'
import { extractClickThroughUrl } from './creativeParser'
import { crawlLandingPage } from './contentCrawler'
import { fetchSuggestedQueries } from '../services/adChatApi'

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
  const { title, description, highlights } = pageContent
  const productLabel = title || brandName

  if (!description && highlights.length === 0) {
    return getAdvertiserContext(adomain).queries
  }

  const intro = description || highlights[0] || `Learn more about ${productLabel}.`
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
          text: `Tap below to continue to ${brandName} and explore the offer.`,
        },
      ],
    },
  ]

  return queries
}

// Build a default offline answer block for an LLM-suggested question. The
// generated ad shows these only when the live chat API is unreachable; the
// question text itself is what users see up front.
function defaultAnswerForQuestion(pageContent, brandName) {
  const { title, description, highlights } = pageContent
  const intro = description || highlights[0] || `Learn more about ${title || brandName}.`

  const blocks = buildAnswerBlocks(highlights, intro)
  return blocks.slice(0, 2)
}

// Pair LLM-generated question strings with offline answer blocks derived from
// the crawled landing page (used only as a backend-down fallback in the ad).
function buildQueriesFromLlm(questions, pageContent, brandName) {
  const answer = defaultAnswerForQuestion(pageContent, brandName)
  return questions
    .map((question) => String(question).trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((question) => ({ question, answer }))
}

export async function resolveAdvertiserContext(adomain, adm, creativeId) {
  const baseContext = getAdvertiserContext(adomain, creativeId)
  const landingUrl = extractClickThroughUrl(adm, adomain)

  // For curated product profiles, trust our hand-written queries/label and skip
  // the landing-page crawl entirely so a generic brand homepage can't override
  // product-specific content (e.g. Pure Leaf taste/nutrition).
  if (baseContext.locked) {
    return {
      ...baseContext,
      landingUrl,
      pageContent: { landingUrl, title: '', description: '', highlights: [], source: 'profile' },
    }
  }

  // Crawl the landing page (for the product title + offline answer content) and
  // ask the backend for LLM/web-researched questions in parallel.
  const [pageContent, llmResult] = await Promise.all([
    crawlLandingPage(landingUrl),
    fetchSuggestedQueries({ creativeId, advertiserDomain: adomain, clickUrl: landingUrl, adm }).catch(
      () => null,
    ),
  ])

  const llmQuestions = Array.isArray(llmResult?.queries) ? llmResult.queries : []

  let queries
  if (llmQuestions.length > 0) {
    // Preferred: specific, LLM-generated questions grounded in the creative/web.
    queries = buildQueriesFromLlm(llmQuestions, pageContent, baseContext.name)
  } else if (
    pageContent.source === 'crawl' &&
    (pageContent.description || pageContent.highlights.length)
  ) {
    // Backend unavailable but the crawl worked: derive queries from page content.
    queries = buildQueriesFromCrawl({ adomain, pageContent, brandName: baseContext.name })
  } else {
    // Last resort: domain profile / generic queries.
    queries = baseContext.queries
  }

  return {
    ...baseContext,
    landingUrl,
    pageContent,
    productLabel: pageContent.title || baseContext.productLabel,
    queries,
  }
}
