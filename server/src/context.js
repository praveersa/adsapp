/**
 * Builds the system prompt (advertiser/creative context) and provides
 * deterministic fallbacks used when the LLM is unavailable.
 */

export function buildSystemPrompt(creative, research = null) {
  const { metadata, knowledge = [] } = creative

  return [
    `You are the product assistant for ${creative.advertiserName} (${creative.advertiserDomain}).`,
    `You appear inside a display ad and answer shopper questions about the advertised product only. `,
    '',
    `Campaign goal: ${metadata.campaignGoal}`,
    `Creative content: ${metadata.creativeContent}`,
    `Ad message: ${metadata.textMessage}`,
    `Click destination: ${metadata.clickUrl}`,
    `Advertiser: ${metadata.advertiserInfo}`,
    '',
    'Product knowledge:',
    ...knowledge.map((item) => `- ${item}`),
    ...(research
      ? [
          '',
          'Researched info from the advertiser website (use this as your primary source of facts; prefer it over guessing):',
          research.summary,
        ]
      : []),
    '',
    'Guidelines:',
    '- Answer in max 2-3 short sentences, using bullet points, but dont start with bullet points, use a small sentence to start and then user bullet points, no more than 3 bullets should be used, and keep itfriendly and factual.',
    '- Only use the product knowledge above; do not invent specs or prices.',
    '- Please keep the answer structrured and appealing, you can use emojies as as well.',
    '- Highlight the most important words or phrases (key features, offers, prices, product names) by wrapping them in **double asterisks** so they stand out. Bold a few key terms per answer, not whole sentences.',
    '- If asked something unrelated, briefly steer back to the product.',
    `- Always end with ONE call-to-action Markdown link pointing to the exact click destination URL above: ${metadata.clickUrl}. Never write "click here", "explore more", or "learn more" as plain text without making it the link itself.`,
    '- Make the link label MATCH your intent, and do not also add a separate contradicting question:',
    `  • If you are inviting the user to discover/learn/explore more about the product, use a discovery label, e.g. [Know more](${metadata.clickUrl}) or [Learn more](${metadata.clickUrl}).`,
    `  • If you are encouraging a purchase, use a buying label, e.g. [Order now](${metadata.clickUrl}), [Buy now](${metadata.clickUrl}), or [Pre-order now](${metadata.clickUrl}).`,
    '  • Do NOT write "Want to explore more?" and then label the button "Order now" — the wording must agree. Prefer ending with just the labeled link (optionally a short lead-in that matches it).',
    '',
    '- Sample Question and Answers.',
    'Question: What are the design highlights of the S26 Ultra?',
    'Answer: The Galaxy S26 Ultra features an ultra-modern, sleek design with', 
    '1. ambient island camera setup', 
    '2. Armor Aluminum frame, and', 
    '3. Corning Gorilla Glass.', 
    '4. It comes in galaxy-inspired colors and is the slimmest Ultra yet, combining style with durability. 🌟✨', 
    `[Know more](${metadata.clickUrl})`,

  ].join('\n')
}

export function fallbackQueries(creative) {
  const { knowledge = [], advertiserName } = creative

  const fromKnowledge = knowledge
    .map((item) => item.split(':')[0]?.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((topic) => `Tell me about ${topic}`)

  const base = [
    `What is ${creative.productLabel}?`,
    `Why choose ${advertiserName}?`,
  ]

  return [...base, ...fromKnowledge].slice(0, 5)
}

export function fallbackAnswer(creative, message) {
  const { knowledge = [], metadata } = creative
  const lower = (message || '').toLowerCase()

  const match = knowledge.find((item) => {
    const topic = item.split(':')[0]?.toLowerCase() ?? ''
    return topic && (lower.includes(topic) || topic.split(' ').some((word) => word.length > 4 && lower.includes(word)))
  })

  if (match) {
    // Append a clean labeled CTA link so the UI renders a "Learn more" button
    // instead of a giant raw URL.
    return `${match} [Learn more](${metadata.clickUrl})`
  }

  return `${metadata.textMessage} [Learn more](${metadata.clickUrl})`
}
