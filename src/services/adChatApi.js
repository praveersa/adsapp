const BASE_URL = '/api'

export async function fetchSuggestedQueries({ creativeId, advertiserDomain, clickUrl, adm }) {
  const response = await fetch(`${BASE_URL}/queries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creativeId, advertiserDomain, clickUrl, adm }),
  })

  if (!response.ok) {
    throw new Error(`Failed to load queries (${response.status})`)
  }

  return response.json()
}

export async function sendChatMessage({ creativeId, advertiserDomain, sessionId, message }) {
  const response = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creativeId, advertiserDomain, sessionId, message }),
  })

  if (!response.ok) {
    throw new Error(`Chat request failed (${response.status})`)
  }

  return response.json()
}
