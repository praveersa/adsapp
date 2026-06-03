const OUTPUT_WIDTH = 300
const OUTPUT_HEIGHT = 600
const CREATIVE_HEIGHT = 250
const CHAT_HEIGHT = OUTPUT_HEIGHT - CREATIVE_HEIGHT

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function serializeQueries(queries) {
  return JSON.stringify(queries).replaceAll('<', '\\u003c')
}

export function generateAdm600({ adm, context }) {
  const advertiserName = escapeHtml(context.name)
  const productLabel = escapeHtml(context.productLabel)
  const landingUrl = escapeHtml(context.landingUrl || `https://${context.domain}`)
  const queriesJson = serializeQueries(context.queries)
  const askPlaceholder = escapeHtml(`Ask ${context.name}`)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
  #ad-slot-300x600 {
    width: ${OUTPUT_WIDTH}px;
    height: ${OUTPUT_HEIGHT}px;
    overflow: hidden;
    background: #fff;
    border: 1px solid #d8dde7;
    display: flex;
    flex-direction: column;
  }
  .creative-wrap {
    width: ${OUTPUT_WIDTH}px;
    height: ${CREATIVE_HEIGHT}px;
    overflow: hidden;
    position: relative;
    flex: 0 0 ${CREATIVE_HEIGHT}px;
    background: #f8fafc;
  }
  .creative-ctr {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: block;
  }
  .creative-slot {
    position: relative;
    z-index: 2;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .creative-slot iframe,
  .creative-slot img,
  .creative-slot a {
    pointer-events: auto;
  }
  .creative-slot iframe {
    display: block;
    width: ${OUTPUT_WIDTH}px !important;
    height: ${CREATIVE_HEIGHT}px !important;
    border: 0;
  }
  .creative-slot img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .chat-wrap {
    width: ${OUTPUT_WIDTH}px;
    height: ${CHAT_HEIGHT}px;
    flex: 0 0 ${CHAT_HEIGHT}px;
    display: flex;
    flex-direction: column;
    padding: 10px;
    background: #f8fafc;
    color: #111827;
    font-size: 11px;
    line-height: 1.35;
  }
  .chat-head { display: flex; justify-content: space-between; gap: 8px; }
  .chat-kicker {
    margin: 0 0 4px;
    color: #2563eb;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .chat-head h2 { margin: 0; font-size: 14px; line-height: 1.2; }
  .status-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #22c55e; border: 2px solid #dcfce7; margin-top: 2px;
  }
  .quick-queries {
    display: flex; gap: 6px; margin: 8px 0; overflow-x: auto;
    scrollbar-width: none;
  }
  .quick-queries::-webkit-scrollbar { display: none; }
  .quick-queries button {
    flex: 0 0 auto; max-width: 170px; padding: 6px 8px;
    border: 1px solid #dbe3ef; border-radius: 999px; background: #fff;
    font: inherit; font-size: 10px; cursor: pointer; text-align: left;
  }
  .quick-queries button:hover { border-color: #2563eb; color: #2563eb; }
  .messages {
    flex: 1; min-height: 0; overflow-y: auto; display: flex;
    flex-direction: column; gap: 6px;
  }
  .msg {
    max-width: 92%; padding: 7px 9px; border-radius: 12px; text-align: left;
  }
  .msg.user { align-self: flex-end; background: #2563eb; color: #fff; }
  .msg.bot {
    align-self: flex-start; background: #fff; border: 1px solid #e5e7eb; color: #1f2937;
  }
  .msg.hint {
    max-width: 100%; padding: 0; border: 0; background: transparent;
    color: #94a3b8; font-size: 9px; font-style: italic;
  }
  .msg ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
  .msg li { display: grid; gap: 2px; }
  .msg strong { color: #111827; font-size: 10px; }
  .msg span { color: #4b5563; }
  .chat-form {
    display: flex; gap: 5px; margin-top: auto; padding-top: 8px;
  }
  .chat-form input {
    flex: 1; min-width: 0; padding: 7px 8px; border: 1px solid #dbe3ef;
    border-radius: 9px; font: inherit; font-size: 11px;
  }
  .chat-form button {
    padding: 7px 9px; border: 0; border-radius: 9px; background: #111827;
    color: #fff; font: inherit; font-size: 11px; font-weight: 700; cursor: pointer;
  }
</style>
</head>
<body>
<div id="ad-slot-300x600">
  <div class="creative-wrap" aria-label="Advertiser creative">
    <a class="creative-ctr" href="${landingUrl}" target="_blank" rel="noopener noreferrer sponsored"></a>
    <div class="creative-slot">${adm}</div>
  </div>
  <div class="chat-wrap">
    <div class="chat-head">
      <div>
        <p class="chat-kicker">${advertiserName} Assistant</p>
        <h2>Ask about ${productLabel}</h2>
      </div>
      <span class="status-dot" aria-hidden="true"></span>
    </div>
    <div class="quick-queries" id="quick-queries"></div>
    <div class="messages" id="messages" aria-live="polite"></div>
    <form class="chat-form" id="chat-form">
      <input id="chat-input" type="text" placeholder="${askPlaceholder}" aria-label="${askPlaceholder}" />
      <button type="submit">Send</button>
    </form>
  </div>
</div>
<script>
(function () {
  var QUERIES = ${queriesJson};
  var advertiserName = ${JSON.stringify(context.name)};
  var messagesEl = document.getElementById('messages');
  var quickEl = document.getElementById('quick-queries');
  var form = document.getElementById('chat-form');
  var input = document.getElementById('chat-input');

  function renderAnswer(answer) {
    if (!Array.isArray(answer)) {
      return '<p>' + answer + '</p>';
    }
    return '<ul>' + answer.map(function (item) {
      return '<li><strong>' + item.title + '</strong><span>' + item.text + '</span></li>';
    }).join('') + '</ul>';
  }

  function addMessage(role, content) {
    var node = document.createElement('article');
    node.className = 'msg ' + role;
    node.innerHTML = content;
    messagesEl.appendChild(node);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function sendQuestion(question) {
    var match = QUERIES.find(function (q) { return q.question === question; }) || QUERIES[0];
    addMessage('user', '<p>' + question + '</p>');
    addMessage('bot', renderAnswer(match.answer));
  }

  addMessage('hint', '<p>Hi, I am ' + advertiserName + '\\'s product assistant. Ask a quick question below.</p>');

  QUERIES.forEach(function (query) {
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = query.question;
    button.addEventListener('click', function () { sendQuestion(query.question); });
    quickEl.appendChild(button);
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var question = input.value.trim();
    if (!question) return;
    sendQuestion(question);
    input.value = '';
  });
})();
</script>
</body>
</html>`
}
