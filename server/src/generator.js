import { chatComplete } from './llm.js'
import { buildSystemPrompt, fallbackQueries } from './context.js'
import { researchAdvertiser } from './webResearch.js'

function parseQueryList(raw) {
  if (!raw) {
    return []
  }

  // Prefer a JSON array if present.
  const arrayMatch = raw.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0])
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean)
      }
    } catch {
      // fall through to line parsing
    }
  }

  return raw
    .split('\n')
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').replace(/^["']|["']$/g, '').trim())
    .filter((line) => line.length > 0 && line.length <= 80)
}

/**
 * Generate up to 5 curated CTA queries from creative metadata using the LLM,
 * falling back to deterministic queries when the LLM is unavailable.
 *
 * For synthesized creatives (no stored metadata) we first research the
 * advertiser on the web so the questions are grounded in real content rather
 * than generic "What does X offer?" filler.
 */
export async function generateQueries(creative) {
  const { metadata, knowledge = [] } = creative

  const research = creative.synthesized
    ? await researchAdvertiser({ clickUrl: metadata.clickUrl, domain: creative.advertiserDomain })
    : null

  const prompt = [
    'You analyze a digital ad creative and propose short questions a user might tap to learn more about the product.',
    '',
    `Campaign goal: ${metadata.campaignGoal}`,
    `Creative content: ${metadata.creativeContent}`,
    `Ad message: ${metadata.textMessage}`,
    `Advertiser: ${metadata.advertiserInfo} (${creative.advertiserDomain})`,
    'Product knowledge:',
    ...knowledge.map((item) => `- ${item}`),
    ...(research
      ? [
          '',
          'Researched info from the advertiser website (use this to make the questions specific and relevant):',
          research.summary,
        ]
      : []),
    '',
    'Return ONLY a JSON array of up to 5 concise questions (max 8 words each). No numbering, no extra text. The questions should be appealing and very inciting to click.',
  ].join('\n')

  try {
    const raw = await chatComplete([{ role: 'user', content: prompt }], { temperature: 0.7 })
    const queries = parseQueryList(raw).slice(0, 5)

    if (queries.length > 0) {
      return queries
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[queries] LLM call failed, using fallback queries:', error?.message || error)
  }

  return fallbackQueries(creative).slice(0, 5)
}

export async function generateReply(creative, history, message) {
  // Ground answers for unknown creatives with live web info about the advertiser.
  const research =
    creative.synthesized && (!history || history.length === 0)
      ? await researchAdvertiser({
          clickUrl: creative.metadata.clickUrl,
          domain: creative.advertiserDomain,
        })
      : null

  const systemPrompt = buildSystemPrompt(creative, research)

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message },
  ]

  return chatComplete(messages, { temperature: 0.4 })
}
