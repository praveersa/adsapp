import { useEffect, useRef, useState } from 'react'
import { fetchSuggestedQueries, sendChatMessage } from '../services/adChatApi'

function makeSessionId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }
  return `sess-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

// Matches, in priority order, on each pass:
//   1. a Markdown link: [label](url)
//   2. a bare URL, optionally preceded by a CTA phrase ("Click here to ...")
// The CTA-phrase capture lets us label a bare URL nicely; Markdown links use
// their own label text.
const LINK_PATTERN =
  /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|((?:click here|order now|pre-?order now|buy now|shop now|learn more|know more|see more)[^\n!?[\]]*?)?[\s:!?.]*(https?:\/\/[^\s)]+)/gi

// Phrases that just introduce a link and become redundant once we render a
// labeled button, so we trim them from the lead-in. Covers both bare lead-ins
// ("Click here:", "visit") and trailing invitation questions ("Want to explore
// more?", "Ready to buy?") whose answer is the button itself.
const REDUNDANT_LEADIN =
  /(?:(?:do you )?want to (?:explore|learn|know|see|discover|find out)(?: more)?|ready to (?:explore|learn|buy|order|shop)|interested(?: in learning more)?|click here|tap here|visit|check it out|see (?:it|more)|learn more|know more)\s*[?:.!-]*\s*$/i

// Trim trailing sentence punctuation that sits right after a bare URL so the
// href stays clean while the punctuation remains visible in the text.
function splitTrailingPunctuation(url) {
  const match = url.match(/[.,;:!?)\]]+$/)
  if (!match) {
    return [url, '']
  }
  const cut = url.length - match[0].length
  return [url.slice(0, cut), match[0]]
}

// A clean, short button label for a bare URL. We never show a long raw URL as
// a CTA label (especially click trackers like .../clk?...). Use "Learn more".
function prettyLinkLabel() {
  return 'Learn more'
}

// Render Markdown emphasis in a plain text fragment: **bold** -> <strong>,
// *italic*/_italic_ -> <em>. Returns an array of React nodes/strings.
const EMPHASIS_PATTERN = /\*\*([^*]+)\*\*|\*([^*]+)\*|__([^_]+)__|_([^_]+)_/g

function renderEmphasis(text, keyPrefix) {
  if (!text) {
    return text
  }

  const nodes = []
  let lastIndex = 0
  let match
  let i = 0

  EMPHASIS_PATTERN.lastIndex = 0
  while ((match = EMPHASIS_PATTERN.exec(text)) !== null) {
    const [full, bold, italic, boldUnderscore, italicUnderscore] = match

    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const boldContent = bold ?? boldUnderscore
    const italicContent = italic ?? italicUnderscore

    if (boldContent !== undefined) {
      nodes.push(
        <strong className="chat-highlight" key={`${keyPrefix}-b${i}`}>
          {boldContent}
        </strong>,
      )
    } else {
      nodes.push(<em key={`${keyPrefix}-i${i}`}>{italicContent}</em>)
    }

    lastIndex = match.index + full.length
    i += 1
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

// Render a single line, converting Markdown links / bare URLs into clickable
// pill buttons via React elements (no dangerouslySetInnerHTML).
// `linkState` is a shared mutable flag so callers can tell whether ANY line
// produced an inline link (used to decide if a fallback CTA is needed).
function linkifyLine(line, keyPrefix, linkState) {
  const nodes = []
  let lastIndex = 0
  let match
  let i = 0

  LINK_PATTERN.lastIndex = 0
  while ((match = LINK_PATTERN.exec(line)) !== null) {
    const [full, mdLabel, mdUrl, cta, rawUrl] = match
    const start = match.index

    const isMarkdown = mdUrl !== undefined
    const href = isMarkdown ? mdUrl : splitTrailingPunctuation(rawUrl)[0]
    const trailing = isMarkdown ? '' : splitTrailingPunctuation(rawUrl)[1]

    let leadIn = line.slice(lastIndex, start)
    let label

    if (isMarkdown) {
      // The Markdown label is the explicit intent. Drop a redundant lead-in
      // like "Click here:" so we don't show "Click here" AND the label.
      label = mdLabel.trim()
      leadIn = leadIn.replace(REDUNDANT_LEADIN, '')
    } else if (cta) {
      label = cta.trim()
    } else {
      // Bare URL with no CTA phrase: use a clean label instead of the raw URL
      // (which can be a very long click-tracker link).
      label = prettyLinkLabel()
      // Preserve the separator (spaces/punctuation) that sat before the URL.
      leadIn += full.slice(0, full.length - rawUrl.length)
    }

    if (leadIn) {
      nodes.push(<span key={`${keyPrefix}-t${i}`}>{renderEmphasis(leadIn, `${keyPrefix}-t${i}`)}</span>)
    }

    if (linkState) {
      linkState.hasLink = true
    }
    nodes.push(
      <a key={`${keyPrefix}-a${i}`} className="chat-cta" href={href} target="_blank" rel="noreferrer">
        {label}
      </a>,
    )
    if (trailing) {
      nodes.push(<span key={`${keyPrefix}-p${i}`}>{trailing}</span>)
    }

    lastIndex = start + full.length
    i += 1
  }

  if (lastIndex < line.length) {
    nodes.push(
      <span key={`${keyPrefix}-t${i}`}>{renderEmphasis(line.slice(lastIndex), `${keyPrefix}-t${i}`)}</span>,
    )
  }

  return nodes
}

// Renders assistant copy line-by-line. `linkState` is populated synchronously
// here (during element construction, since linkifyLine runs eagerly) so the
// caller can tell whether an inline link was produced.
function AssistantText({ text, linkState }) {
  const lines = String(text).split('\n')

  return (
    <p>
      {lines.map((line, lineIndex) => (
        <span key={`line-${lineIndex}`} className="chat-line">
          {linkifyLine(line, `line-${lineIndex}`, linkState)}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      ))}
    </p>
  )
}

function MessageBody({ message, advertiserName }) {
  if (Array.isArray(message.text)) {
    return (
      <ul>
        {message.text.map((feature) => (
          <li key={feature.title}>
            <strong>{feature.title}</strong>
            <span>{renderEmphasis(feature.text, `feat-${feature.title}`)}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (message.from === 'assistant') {
    // Build the body eagerly so linkifyLine runs now and fills linkState. If the
    // reply already produced an inline link, skip the redundant fallback CTA.
    const linkState = { hasLink: false }
    const body = AssistantText({ text: message.text, linkState })

    return (
      <>
        {body}
        {message.link && !linkState.hasLink && (
          <p>
            <a className="chat-cta" href={message.link} target="_blank" rel="noreferrer">
              Learn more about {advertiserName}
            </a>
          </p>
        )}
      </>
    )
  }

  return <p>{message.text}</p>
}

/**
 * Backend-driven in-ad chatbot. `variant` keeps the existing markup/classes:
 *   - "full"    -> 300x600 chat panel (header + messages + input)
 *   - "compact" -> 300x250 chat panel (prompts + answers + input)
 */
function AdChat({ variant, creative }) {
  const isCompact = variant === 'compact'

  const [queries, setQueries] = useState(() =>
    creative.fallback.map((item) => item.question),
  )
  const [messages, setMessages] = useState(() =>
    isCompact
      ? []
      : [
          {
            from: 'assistant',
            text: `Hi, I am ${creative.advertiserName}'s product assistant. Ask a quick question below.`,
          },
        ],
  )
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [limitReached, setLimitReached] = useState(false)
  const sessionRef = useRef(makeSessionId())

  useEffect(() => {
    let active = true

    fetchSuggestedQueries({
      creativeId: creative.id,
      advertiserDomain: creative.advertiserDomain,
    })
      .then((result) => {
        if (active && Array.isArray(result.queries) && result.queries.length) {
          setQueries(result.queries.slice(0, 5))
        }
      })
      .catch(() => {
        // Keep fallback queries if the backend is unavailable.
      })

    return () => {
      active = false
    }
  }, [creative.id, creative.advertiserDomain])

  const offlineAnswer = (question) => {
    const match =
      creative.fallback.find((item) => item.question === question) ?? creative.fallback[0]
    return match ? match.answer : `Visit ${creative.advertiserName} to learn more.`
  }

  const ask = async (question) => {
    const trimmed = question.trim()
    if (!trimmed || sending || limitReached) {
      return
    }

    setMessages((current) => [...current, { from: 'user', text: trimmed }])
    setSending(true)

    try {
      const result = await sendChatMessage({
        creativeId: creative.id,
        advertiserDomain: creative.advertiserDomain,
        sessionId: sessionRef.current,
        message: trimmed,
      })

      setMessages((current) => [
        ...current,
        { from: 'assistant', text: result.reply, link: result.link },
      ])

      if (result.limitReached) {
        setLimitReached(true)
      }
    } catch {
      setMessages((current) => [
        ...current,
        { from: 'assistant', text: offlineAnswer(trimmed) },
      ])
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const question = draft
    setDraft('')
    ask(question)
  }

  const quickClass = isCompact ? 'compact-quick-queries' : 'quick-queries'
  const messagesClass = isCompact ? 'compact-answer' : 'messages'
  const placeholder = limitReached
    ? `Visit ${creative.advertiserName}`
    : `Ask ${creative.advertiserName}`

  const messageList = (
    <div className={messagesClass} aria-live="polite">
      {messages.map((message, index) => (
        <article className={`message ${message.from}`} key={index}>
          <MessageBody message={message} advertiserName={creative.advertiserName} />
        </article>
      ))}
      {sending && (
        <article className="message assistant message--typing" aria-label={`${creative.advertiserName} is typing`}>
          <span className="typing-dots" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </article>
      )}
    </div>
  )

  const quickQueries = (
    <div className={quickClass} aria-label="Suggested questions">
      {queries.map((query) => (
        <button
          key={query}
          type="button"
          onClick={() => ask(query)}
          disabled={sending || limitReached}
        >
          {query}
        </button>
      ))}
    </div>
  )

  if (isCompact) {
    return (
      <div className="compact-chat-panel">
        {quickQueries}
        {messages.length > 0 && messageList}
        <form className="compact-chat-form" onSubmit={handleSubmit}>
          <input
            aria-label={`Ask ${creative.advertiserName}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={placeholder}
            disabled={limitReached}
          />
          <button type="submit" disabled={sending || limitReached}>
            Send
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div>
          <p className="chat-kicker">{creative.advertiserName} Assistant</p>
          <h2>Ask about {creative.productLabel}</h2>
        </div>
        <span className="status-dot" aria-label="MCP server connected"></span>
      </div>

      {quickQueries}
      {messageList}

      <form className="chat-form" onSubmit={handleSubmit}>
        <div>
          <input
            id="chat-question"
            aria-label={`Ask ${creative.advertiserName}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={placeholder}
            disabled={limitReached}
          />
          <button type="submit" disabled={sending || limitReached}>
            Send
          </button>
        </div>
      </form>
    </div>
  )
}

export default AdChat
