const OUTPUT_WIDTH = 300
const OUTPUT_HEIGHT = 600
const CREATIVE_HEIGHT = 250
const CHAT_HEIGHT = OUTPUT_HEIGHT - CREATIVE_HEIGHT

// Backend chat API the generated ad talks to for live LLM replies. Override per
// environment; when unreachable the ad falls back to the bundled static answers.
const DEFAULT_CHAT_API_BASE_URL = 'http://localhost:3001'

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function serializeForScript(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}

export function generateAdm600({ adm, context, chatApiBaseUrl } = {}) {
  const advertiserName = escapeHtml(context.name)
  const productLabel = escapeHtml(context.productLabel)
  // The click-through URL extracted from the bid's adm (ptcurl/clk tracker).
  // Every CTA in the ad routes through this so clicks are tracked before the
  // redirect to the advertiser, instead of pointing at the bare landing page.
  const clickUrl = context.landingUrl || `https://${context.domain}`
  const landingUrl = escapeHtml(clickUrl)
  const queriesJson = serializeForScript(context.queries)
  const askPlaceholder = escapeHtml(`Ask ${context.name}`)

  // Strip a trailing slash so the script can append `/api/chat` cleanly.
  const apiBaseUrl = (chatApiBaseUrl || DEFAULT_CHAT_API_BASE_URL).replace(/\/+$/, '')
  const chatConfigJson = serializeForScript({
    apiBaseUrl,
    advertiserDomain: context.domain,
    creativeId: context.creativeId || undefined,
    landingUrl: clickUrl,
    clickUrl,
  })

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
  .chat-head { display: flex; justify-content: space-between; gap: 8px; text-align: left; }
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
    align-self: flex-start;
    background: linear-gradient(135deg, #ffffff 0%, #f3f6ff 100%);
    border: 1px solid #e2e8f7; color: #1f2937;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.06);
  }
  .msg.hint {
    max-width: 100%; padding: 0; border: 0; background: transparent;
    box-shadow: none; color: #94a3b8; font-size: 9px; font-style: italic;
  }
  .msg ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
  .msg li { display: grid; gap: 2px; }
  .msg strong { color: #111827; font-size: 10px; }
  .msg span { color: #4b5563; }
  .msg .hl { color: #1d4ed8; font-weight: 700; background: rgba(37, 99, 235, 0.1); padding: 0 3px; border-radius: 4px; }
  .msg a { color: #2563eb; font-weight: 600; }
  .msg a.cta {
    display: inline-block; margin: 1px 0; padding: 3px 9px; color: #fff;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    border-radius: 999px; font-size: 9px; font-weight: 700; line-height: 1.2;
    white-space: nowrap; vertical-align: middle; text-decoration: none;
    box-shadow: 0 2px 5px rgba(220, 38, 38, 0.3);
    transition: filter 0.15s ease, transform 0.15s ease;
  }
  .msg a.cta:hover { filter: brightness(1.06); transform: translateY(-1px); }
  .msg.typing { display: inline-flex; align-items: center; padding: 9px 11px; }
  .typing-dots { display: inline-flex; align-items: center; gap: 4px; }
  .typing-dots span {
    width: 6px; height: 6px; border-radius: 50%; background: #94a3b8;
    opacity: 0.4; animation: typing-bounce 1.2s infinite ease-in-out;
  }
  .typing-dots span:nth-child(2) { animation-delay: 0.18s; }
  .typing-dots span:nth-child(3) { animation-delay: 0.36s; }
  @keyframes typing-bounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
    30% { transform: translateY(-4px); opacity: 1; }
  }
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
  var CHAT = ${chatConfigJson};
  var advertiserName = ${serializeForScript(context.name)};
  var messagesEl = document.getElementById('messages');
  var quickEl = document.getElementById('quick-queries');
  var form = document.getElementById('chat-form');
  var input = document.getElementById('chat-input');
  var sendBtn = form.querySelector('button[type="submit"]');

  // Unique session so the backend can cap chat turns per impression.
  var sessionId = (window.crypto && window.crypto.randomUUID)
    ? window.crypto.randomUUID()
    : 'sess-' + Math.random().toString(36).slice(2) + '-' + Date.now();
  var limitReached = false;
  var sending = false;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Convert an LLM reply (plain text/Markdown) into safe HTML: escape
  // everything, keep line breaks, and turn Markdown links [label](url) and bare
  // URLs (optionally with a leading CTA phrase) into clickable pill links.
  var LINK = /\\[([^\\]]+)\\]\\((https?:\\/\\/[^\\s)]+)\\)|((?:click here|order now|pre-?order now|buy now|shop now|learn more|know more|see more)[^\\n!?[\\]]*?)?[\\s:!?.]*(https?:\\/\\/[^\\s)]+)/gi;
  var REDUNDANT_LEADIN = /(?:(?:do you )?want to (?:explore|learn|know|see|discover|find out)(?: more)?|ready to (?:explore|learn|buy|order|shop)|interested(?: in learning more)?|click here|tap here|visit|check it out|see (?:it|more)|learn more|know more)\\s*[?:.!-]*\\s*$/i;
  var EMPHASIS = /\\*\\*([^*]+)\\*\\*|\\*([^*]+)\\*|__([^_]+)__|_([^_]+)_/g;

  // Wrap **bold** / *italic* in HTML emphasis. Input is ALREADY html-escaped,
  // so the markers (* and _) are intact and the captured content stays escaped.
  function emphasize(escapedText) {
    return escapedText.replace(EMPHASIS, function (full, b, i, bu, iu) {
      var bold = b !== undefined ? b : bu;
      if (bold !== undefined) {
        return '<strong class="hl">' + bold + '</strong>';
      }
      return '<em>' + (i !== undefined ? i : iu) + '</em>';
    });
  }

  // linkState (optional {hasLink:false}) is set to true if any inline link is
  // produced, so the caller can skip a redundant fallback CTA button.
  function linkifyReply(text, linkState) {
    return String(text).split('\\n').map(function (line) {
      var out = '';
      var lastIndex = 0;
      var match;
      LINK.lastIndex = 0;
      while ((match = LINK.exec(line)) !== null) {
        var full = match[0];
        var mdLabel = match[1];
        var mdUrl = match[2];
        var cta = match[3];
        var rawUrl = match[4];
        var isMd = mdUrl !== undefined;

        var href = isMd ? mdUrl : rawUrl;
        var trailing = '';
        if (!isMd) {
          var punct = rawUrl.match(/[.,;:!?)\\]]+$/);
          if (punct) {
            href = rawUrl.slice(0, -punct[0].length);
            trailing = punct[0];
          }
        }

        var leadIn = line.slice(lastIndex, match.index);
        var label;
        if (isMd) {
          label = mdLabel.trim();
          leadIn = leadIn.replace(REDUNDANT_LEADIN, '');
        } else if (cta) {
          label = cta.trim();
        } else {
          // Bare URL with no CTA phrase: use a clean label, not the raw (often
          // very long) click-tracker URL.
          label = 'Learn more';
          leadIn += full.slice(0, full.length - rawUrl.length);
        }

        if (linkState) { linkState.hasLink = true; }
        // Route every CTA through the extracted click-through URL (ptcurl/clk
        // tracker) so the click is tracked before redirecting to the advertiser.
        // The model's label (e.g. "Order now") is kept; only the href is swapped.
        var ctaHref = CHAT.clickUrl || href;
        out += emphasize(escapeHtml(leadIn)) +
          '<a class="cta" href="' + escapeHtml(ctaHref) +
          '" target="_blank" rel="noopener noreferrer sponsored">' + escapeHtml(label) + '</a>' +
          escapeHtml(trailing);
        lastIndex = match.index + full.length;
      }
      if (lastIndex < line.length) {
        out += emphasize(escapeHtml(line.slice(lastIndex)));
      }
      return out;
    }).join('<br>');
  }

  // Static answer blocks (used only when the backend/LLM is unavailable).
  // Both single-string answers and the text of each block support **bold**
  // emphasis so offline replies look as rich as live LLM ones.
  function renderAnswer(answer) {
    if (!Array.isArray(answer)) {
      return '<p>' + emphasize(escapeHtml(answer)) + '</p>';
    }
    return '<ul>' + answer.map(function (item) {
      return '<li><strong>' + escapeHtml(item.title) + '</strong><span>' + emphasize(escapeHtml(item.text)) + '</span></li>';
    }).join('') + '</ul>';
  }

  function offlineAnswer(question) {
    var match = QUERIES.filter(function (q) { return q.question === question; })[0] || QUERIES[0];
    return match ? renderAnswer(match.answer) : '<p>Visit ' + escapeHtml(advertiserName) + ' to learn more.</p>';
  }

  function addMessage(role, content) {
    var node = document.createElement('article');
    node.className = 'msg ' + role;
    node.innerHTML = content;
    messagesEl.appendChild(node);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return node;
  }

  function setDisabled(state) {
    sending = state;
    input.disabled = state || limitReached;
    sendBtn.disabled = state || limitReached;
    quickEl.querySelectorAll('button').forEach(function (button) {
      button.disabled = state || limitReached;
    });
  }

  function lockToCta(link) {
    limitReached = true;
    input.placeholder = 'Visit ' + advertiserName;
    setDisabled(false);
    var ctaHref = CHAT.clickUrl || link;
    if (ctaHref) {
      addMessage('bot', '<p>Know more about the advertiser ' +
        '<a href="' + escapeHtml(ctaHref) + '" target="_blank" rel="noopener noreferrer sponsored">' +
        escapeHtml(advertiserName) + '</a></p>');
    }
  }

  function botReply(result) {
    var linkState = { hasLink: false };
    var html = '<p>' + linkifyReply(result.reply || '', linkState) + '</p>';
    // Only add a fallback CTA when the reply itself didn't already link out, so
    // we never show two buttons for one answer. Prefer the extracted click-through
    // URL (ptcurl/clk) over the backend's bare landing URL.
    var fallbackHref = CHAT.clickUrl || result.link;
    if (fallbackHref && !linkState.hasLink) {
      html += '<p><a class="cta" href="' + escapeHtml(fallbackHref) +
        '" target="_blank" rel="noopener noreferrer sponsored">' +
        'Learn more about ' + escapeHtml(advertiserName) + '</a></p>';
    }
    addMessage('bot', html);
  }

  function sendQuestion(question) {
    var trimmed = (question || '').trim();
    if (!trimmed || sending || limitReached) return;

    addMessage('user', '<p>' + escapeHtml(trimmed) + '</p>');
    setDisabled(true);
    var typing = addMessage('typing', '<span class="typing-dots" aria-hidden="true"><span></span><span></span><span></span></span>');
    typing.setAttribute('aria-label', advertiserName + ' is typing');

    fetch(CHAT.apiBaseUrl + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creativeId: CHAT.creativeId,
        advertiserDomain: CHAT.advertiserDomain,
        clickUrl: CHAT.clickUrl,
        sessionId: sessionId,
        message: trimmed
      })
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Chat request failed (' + response.status + ')');
        return response.json();
      })
      .then(function (result) {
        typing.remove();
        botReply(result);
        if (result.limitReached) lockToCta(result.link);
        setDisabled(false);
      })
      .catch(function () {
        // Backend/LLM unreachable: fall back to the bundled static answers.
        typing.remove();
        addMessage('bot', offlineAnswer(trimmed));
        setDisabled(false);
      });
  }

  addMessage('hint', '<p>Hi, I am ' + escapeHtml(advertiserName) + '\\'s product assistant. Ask a quick question below.</p>');

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
    input.value = '';
    sendQuestion(question);
  });
})();
</script>
</body>
</html>`
}
