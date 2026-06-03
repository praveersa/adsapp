import { useState } from 'react'
import AppNav from './components/AppNav'
import BidResponseTool from './components/BidResponseTool'
import FormatNav from './components/FormatNav'
import './App.css'

const advertiser = {
  name: 'Samsung',
  creativeUrl: 'https://m.media-amazon.com/images/I/71xHws+eI5L._SX679_.jpg',
  compactCreativeUrl: 'https://i.imgur.com/80UW6Cq.png',
}

const quickQueries = [
  {
    question: 'What are the features of this product?',
    answer: [
      {
        title: 'Built-in Privacy Display',
        text: "Say hi to world's first Privacy Display on mobile. With this new layer of privacy, one can customize its screen with multiple viewability settings to ensure your everyday moments remain truly yours. Experience complete control with defense grade Knox security, on device protection and enjoy fast, reliable and secure payment anywhere with Samsung Wallet.",
      },
      {
        title: 'Agentic AI Experience',
        text: 'Enjoy the pinnacle of mobile AI innovation with the easiest and effortless AI phone built to simplify everyday interactions and inspire confidence as the all-new Galaxy AI becomes truly intuitive and adaptive. The new Now Nudge intelligently reduces the steps and offers real-time suggestions. Find exactly what you are looking in just one quick search with Finder feature on Home screen. Add to it, the new One UI 8.5 personalizes your Galaxy in just a tap.',
      },
      {
        title: '200MP High Resolution Camera',
        text: 'Capture bright, detailed videos even at night with the brightest camera system and enhanced noise reduction solution. Now, easily edit your photos with Photo Assist or create personalized stickers from photos in a simple tap with Creative Studio, get the best end to end Camera experience.',
      },
      {
        title: 'Snapdragon 8 Elite Gen 5 for Galaxy',
        text: 'Play graphic heavy games for long without ever worrying about your device at it now comes with the most powerful, customized processor and a newly designed Vapor Chamber. Galaxy S26 Ultra has Super Fast charging 3.0 supporting up to 60W charging speed and Super Fast Wireless charging supporting up to 25W charging speed, indeed ultra fast charging.',
      },
      {
        title: 'Ultra Modern, Sleek Design',
        text: 'A balanced design crafted with a new ambient island camera design and an Armor Aluminum frame fitted with Corning Gorilla Glass, and with stunning galaxy inspired colors, the Galaxy S26 Ultra is our slimmest Ultra yet.',
      },
    ],
  },
  {
    question: 'How does the privacy display help?',
    answer: [
      {
        title: 'Privacy control',
        text: 'The Privacy Display adds viewability settings that keep everyday moments more private, with Knox security, on-device protection, and Samsung Wallet support for secure payments.',
      },
    ],
  },
  {
    question: 'Is it good for gaming and charging?',
    answer: [
      {
        title: 'Performance and charging',
        text: 'The Snapdragon 8 Elite Gen 5 for Galaxy, redesigned Vapor Chamber, 60W Super Fast charging 3.0, and 25W Super Fast Wireless charging are built for long gaming sessions and quick top-ups.',
      },
    ],
  },
]

function App() {
  const [messages, setMessages] = useState([
    {
      from: 'assistant',
      text: `Hi, I am ${advertiser.name}'s product assistant. Ask a quick question below.`,
    },
  ])
  const [compactAnswer, setCompactAnswer] = useState(null)
  const [draft, setDraft] = useState('')
  const [compactDraft, setCompactDraft] = useState('')

  const sendQuestion = (question) => {
    const matchedQuery =
      quickQueries.find((query) => query.question === question) ?? quickQueries[0]

    setMessages((currentMessages) => [
      ...currentMessages,
      { from: 'user', text: question },
      {
        from: 'assistant',
        text: matchedQuery.answer,
      },
    ])
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const question = draft.trim()
    if (!question) {
      return
    }

    sendQuestion(question)
    setDraft('')
  }

  const selectCompactPrompt = (question) => {
    const matchedQuery =
      quickQueries.find((query) => query.question === question) ?? quickQueries[0]

    setCompactAnswer(matchedQuery.answer)
  }

  const handleCompactSubmit = (event) => {
    event.preventDefault()

    const question = compactDraft.trim()
    if (!question) {
      return
    }

    selectCompactPrompt(question)
    setCompactDraft('')
  }

  const currentPath = window.location.pathname.replace(/\/$/, '') || '/'
  const isCompactPage = currentPath === '/300x250'
  const isGeneratorPage = currentPath === '/generator'

  if (isGeneratorPage) {
    return (
      <>
        <AppNav currentPath={currentPath} />
        <main className="page-shell page-shell--generator">
          <section className="demo-copy" aria-labelledby="demo-title">
            <p className="eyebrow">ADM output builder</p>
            <h1 id="demo-title">Bid response to 300x600 ADM</h1>
            <p>
              Paste an OpenRTB bid response JSON. The tool reads{' '}
              <code>adomain</code> and <code>adm</code>, resolves the click-through
              destination from the creative, crawls that landing page, and builds
              chat prompts from the intended advertiser content.
            </p>
          </section>
          <BidResponseTool />
        </main>
      </>
    )
  }

  return (
    <>
      <AppNav currentPath={currentPath} />
      <main className="page-shell">
      <section className="demo-copy" aria-labelledby="demo-title">
        <p className="eyebrow">Programmatic ad slot demo</p>
        <h1 id="demo-title">
          {isCompactPage ? '300x250 creative with chat' : '300x600 creative with chat'}
        </h1>
        {isCompactPage ? (
          <p>
            This page shows the compact 300x250 unit with a 300x50 creative and
            a 300x200 chatbot area. Quick prompts stay visible for CTR, while
            the Ask Samsung input remains pinned to the bottom.
          </p>
        ) : (
          <p>
            This page shows the 300x600 unit with a 300x250 creative. The
            remaining slot space hosts quick product prompts that can be wired
            to the advertiser MCP server.
          </p>
        )}
        <FormatNav currentPath={currentPath} />
      </section>

      {isCompactPage ? (
        <aside
          className="ad-slot compact-ad-slot"
          aria-label={`${advertiser.name} 300 by 250 advertisement with quick chat prompts`}
        >
          <div className="creative-panel compact-creative-panel">
            <span className="ad-badge">Ad</span>
            <img
              src={advertiser.compactCreativeUrl}
              alt={`${advertiser.name} compact ad creative`}
            />
          </div>

          <div className="compact-chat-panel">
            <div className="compact-quick-queries" aria-label="Suggested questions">
              {quickQueries.map((query) => (
                <button
                  key={query.question}
                  type="button"
                  onClick={() => selectCompactPrompt(query.question)}
                >
                  {query.question}
                </button>
              ))}
            </div>

            {compactAnswer && (
              <article className="compact-answer" aria-live="polite">
                <ul>
                  {compactAnswer.map((feature) => (
                    <li key={feature.title}>
                      <strong>{feature.title}</strong>
                      <span>{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </article>
            )}

            <form className="compact-chat-form" onSubmit={handleCompactSubmit}>
              <input
                aria-label="Ask Samsung"
                value={compactDraft}
                onChange={(event) => setCompactDraft(event.target.value)}
                placeholder="Ask Samsung"
              />
              <button type="submit">Send</button>
            </form>
          </div>
        </aside>
      ) : (
        <aside
          className="ad-slot"
          aria-label={`${advertiser.name} 300 by 600 advertisement with chat`}
        >
          <div className="creative-panel">
            <span className="ad-badge">Ad</span>
            <img
              src={advertiser.creativeUrl}
              alt={`${advertiser.name} Galaxy S26 Ultra product creative`}
            />
          </div>

          <div className="chat-panel">
            <div className="chat-header">
              <div>
                <p className="chat-kicker">{advertiser.name} Assistant</p>
                <h2>Ask about Galaxy S26 Ultra</h2>
              </div>
              <span
                className="status-dot"
                aria-label="MCP server connected"
              ></span>
            </div>

            <div className="quick-queries" aria-label="Suggested questions">
              {quickQueries.map((query) => (
                <button
                  key={query.question}
                  type="button"
                  onClick={() => sendQuestion(query.question)}
                >
                  {query.question}
                </button>
              ))}
            </div>

            <div className="messages" aria-live="polite">
              {messages.map((message, index) => (
                <article className={`message ${message.from}`} key={index}>
                  {Array.isArray(message.text) ? (
                    <ul>
                      {message.text.map((feature) => (
                        <li key={feature.title}>
                          <strong>{feature.title}</strong>
                          <span>{feature.text}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{message.text}</p>
                  )}
                </article>
              ))}
            </div>

            <form className="chat-form" onSubmit={handleSubmit}>
              <div>
                <input
                  id="chat-question"
                  aria-label="Ask Samsung"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask Samsung"
                />
                <button type="submit">Send</button>
              </div>
            </form>
          </div>
        </aside>
      )}
    </main>
    </>
  )
}

export default App
