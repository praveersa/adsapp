/**
 * Temporary in-memory persistence for chat sessions and generated queries.
 * Swap for a real DB later; the interface stays the same.
 */

const sessions = new Map()
const queryCache = new Map()

function sessionKey(sessionId, creativeId) {
  return `${sessionId}::${creativeId}`
}

export function getSession(sessionId, creativeId) {
  const key = sessionKey(sessionId, creativeId)

  if (!sessions.has(key)) {
    sessions.set(key, { count: 0, history: [] })
  }

  return sessions.get(key)
}

export function getCachedQueries(creativeId) {
  return queryCache.get(creativeId)
}

export function setCachedQueries(creativeId, queries) {
  queryCache.set(creativeId, queries)
}
