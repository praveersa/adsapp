import { createServer } from 'node:http'
import { config, isLlmConfigured } from './config.js'
import { getCreative } from './data/creatives.js'
import { getSession, getCachedQueries, setCachedQueries } from './store.js'
import { generateQueries, generateReply } from './generator.js'
import { fallbackAnswer } from './context.js'
import { extractClickThroughUrl } from './creativeParser.js'

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  })
  res.end(JSON.stringify(body))
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 262144) {
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${config.port}`)
    const path = url.pathname

    if (req.method === 'OPTIONS') {
      return send(res, 204, {})
    }

    if (req.method === 'GET' && path === '/api/health') {
      return send(res, 200, {
        status: 'ok',
        llmConfigured: isLlmConfigured,
        model: config.llm.model,
        maxChats: config.maxChats,
      })
    }

    // Generate (or return cached) curated CTA queries from creative metadata.
    if (req.method === 'POST' && path === '/api/queries') {
      const body = await readJsonBody(req)
      const { creativeId, advertiserDomain } = body
      // Prefer an explicitly-passed click URL (already extracted client-side),
      // otherwise extract it from the raw adm here.
      const clickUrl = body.clickUrl || extractClickThroughUrl(body.adm, advertiserDomain)
      const creative = getCreative(creativeId, advertiserDomain, { clickUrl })

      const cached = getCachedQueries(creative.id)
      if (cached) {
        return send(res, 200, { queries: cached, cached: true })
      }

      const queries = await generateQueries(creative)
      setCachedQueries(creative.id, queries)
      return send(res, 200, {
        creativeId: creative.id,
        advertiser: creative.advertiserName,
        queries,
        cached: false,
      })
    }

    // Chat with the advertiser bot within a capped session.
    if (req.method === 'POST' && path === '/api/chat') {
      const body = await readJsonBody(req)
      const { creativeId, advertiserDomain, sessionId, message } = body

      if (!sessionId || !message || !message.trim()) {
        return send(res, 400, { error: 'sessionId and message are required' })
      }

      // Prefer an explicitly-passed click URL (already extracted client-side),
      // otherwise extract it from the raw adm here.
      const clickUrl = body.clickUrl || extractClickThroughUrl(body.adm, advertiserDomain)
      const creative = getCreative(creativeId, advertiserDomain, { clickUrl })
      const session = getSession(sessionId, creative.id)

      if (session.count >= config.maxChats) {
        return send(res, 200, {
          reply: 'Know more about the advertiser',
          link: creative.metadata.clickUrl,
          limitReached: true,
          remaining: 0,
        })
      }

      let reply
      let source = 'llm'
      try {
        reply = await generateReply(creative, session.history, message.trim())
        if (!reply) {
          source = 'fallback'
          reply = fallbackAnswer(creative, message)
        }
      } catch (error) {
        // Surface why we fell back so a static reply is never silently mistaken
        // for "the LLM isn't wired up".
        // eslint-disable-next-line no-console
        console.error('[chat] LLM call failed, using fallback answer:', error?.message || error)
        source = 'fallback'
        reply = fallbackAnswer(creative, message)
      }

      session.history.push(
        { role: 'user', content: message.trim() },
        { role: 'assistant', content: reply },
      )
      session.count += 1

      const remaining = Math.max(config.maxChats - session.count, 0)
      const limitReached = remaining === 0

      return send(res, 200, {
        reply,
        source,
        remaining,
        limitReached,
        // Always send the click destination so the UI can render an actionable
        // CTA button even when the model's reply has no inline URL.
        link: creative.metadata.clickUrl,
      })
    }

    // Public-safe creative context (no secrets).
    if (req.method === 'GET' && path.startsWith('/api/creatives/')) {
      const id = decodeURIComponent(path.slice('/api/creatives/'.length))
      const creative = getCreative(id, url.searchParams.get('advertiserDomain'))
      return send(res, 200, {
        id: creative.id,
        advertiserName: creative.advertiserName,
        advertiserDomain: creative.advertiserDomain,
        productLabel: creative.productLabel,
        clickUrl: creative.metadata.clickUrl,
        textMessage: creative.metadata.textMessage,
      })
    }

    return send(res, 404, { error: 'Not found' })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error)
    return send(res, 500, { error: 'Internal server error' })
  }
})

server.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Ad chatbot API listening on http://localhost:${config.port}`)
  // eslint-disable-next-line no-console
  console.log(`LLM configured: ${isLlmConfigured} (model: ${config.llm.model})`)
})
