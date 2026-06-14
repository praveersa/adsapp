# Ad Chatbot Backend

Express API powering the in-ad chatbot and curated query CTAs.

## Endpoints

- `GET  /api/health` — status + whether the LLM is configured.
- `POST /api/queries` — `{ creativeId, advertiserDomain }` → `{ queries: string[] }` (max 5 curated CTAs).
- `POST /api/chat` — `{ creativeId, advertiserDomain, sessionId, message }` → `{ reply, remaining, limitReached, link }`.
- `GET  /api/creatives/:id` — public-safe creative context.

## How it works

- Creative metadata (campaign goal, creative content, text message, click URL, advertiser info) is predefined per creative in `src/data/creatives.js` (in production this comes from an offline LLM analysis pass + DB).
- `creativeId` + `advertiserDomain` derive the system prompt; the user query is the prompt.
- Sessions are capped at `MAX_CHATS` (default 5). After the limit, the API returns `Know more about the advertiser` with the click-through link.
- The LLM key lives only in `server/.env` and is never sent to the client.
- Sessions + generated queries are stored in memory (`src/store.js`).

## Run

The server uses only Node built-ins (`node:http` + global `fetch`), so **no `npm install` is required**:

```bash
cd server
npm run dev   # or: npm start  (needs Node 18+, tested on Node 25)
```

Configure `server/.env` (see `.env.example`). The Vite dev server proxies `/api` to `http://localhost:3001`. When the LLM endpoint is unreachable, the API falls back to deterministic curated queries and grounded answers.
