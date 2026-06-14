import { useState } from 'react'
import { parseBidResponse } from '../utils/bidParser'
import { generateAdm600 } from '../utils/admGenerator'
import { resolveAdvertiserContext } from '../utils/queryFromContent'
import sampleBid from '../data/sampleBid.json'

// Default bid response shown in the editor: a real Vrbo (Expedia Group) DV3
// display creative (crid 716013088, adomain vrbo.com).
const SAMPLE_BID = JSON.stringify(sampleBid, null, 2)

function BidResponseTool() {
  const [bidJson, setBidJson] = useState(SAMPLE_BID)
  const [parsedBid, setParsedBid] = useState(null)
  const [context, setContext] = useState(null)
  const [outputAdm, setOutputAdm] = useState('')
  const [error, setError] = useState('')
  const [copyState, setCopyState] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)

    try {
      const bid = parseBidResponse(bidJson)
      const advertiserContext = await resolveAdvertiserContext(bid.adomain, bid.adm, bid.crid)
      const adm = generateAdm600({
        adm: bid.adm,
        context: { ...advertiserContext, creativeId: bid.crid },
      })

      setParsedBid(bid)
      setContext(advertiserContext)
      setOutputAdm(adm)
      setError('')
      setCopyState('')
    } catch (generationError) {
      setParsedBid(null)
      setContext(null)
      setOutputAdm('')
      setError(generationError.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!outputAdm) {
      return
    }

    await navigator.clipboard.writeText(outputAdm)
    setCopyState('Copied')
    window.setTimeout(() => setCopyState(''), 1500)
  }

  return (
    <section className="bid-tool" aria-label="Bid response generator">
      <label className="bid-tool-label" htmlFor="bid-json-input">
        Bid response JSON
      </label>
      <textarea
        id="bid-json-input"
        className="bid-json-input"
        value={bidJson}
        onChange={(event) => setBidJson(event.target.value)}
        spellCheck={false}
      />

      <div className="bid-tool-actions">
        <button type="button" onClick={handleGenerate} disabled={loading}>
          {loading ? (
            <span className="btn-loading">
              <span className="btn-spinner" aria-hidden="true"></span>
              Generating…
            </span>
          ) : (
            'Generate 300x600 ADM'
          )}
        </button>
        {outputAdm && (
          <button type="button" className="secondary" onClick={handleCopy}>
            {copyState || 'Copy ADM'}
          </button>
        )}
      </div>

      {loading && (
        <p className="bid-tool-status" aria-live="polite">
          Resolving the click-through URL, researching the advertiser, and generating chat prompts…
        </p>
      )}

      {error && <p className="bid-tool-error">{error}</p>}

      {parsedBid && context && (
        <div className="bid-tool-meta">
          <p>
            <strong>Advertiser domain:</strong> {parsedBid.adomain}
          </p>
          <p>
            <strong>Detected brand:</strong> {context.name}
          </p>
          <p>
            <strong>Incoming creative:</strong> {parsedBid.width}x{parsedBid.height}
          </p>
          <p>
            <strong>Click-through URL:</strong>{' '}
            <a href={context.landingUrl} target="_blank" rel="noreferrer">
              {context.landingUrl}
            </a>
          </p>
          <p>
            <strong>Chat prompts:</strong> {context.queries.length}
          </p>
        </div>
      )}

      {context && (
        <div className="bid-tool-queries">
          <h3>Generated quick queries</h3>
          <ul>
            {context.queries.map((query) => (
              <li key={query.question}>{query.question}</li>
            ))}
          </ul>
        </div>
      )}

      {outputAdm && (
        <>
          <label className="bid-tool-label" htmlFor="adm-output">
            Output ADM (HTML)
          </label>
          <textarea
            id="adm-output"
            className="adm-output"
            value={outputAdm}
            readOnly
          />
          <div className="bid-preview">
            <h3>Preview</h3>
            <iframe
              title="Generated 300x600 ADM preview"
              className="adm-preview-frame"
              srcDoc={outputAdm}
            />
          </div>
        </>
      )}
    </section>
  )
}

export default BidResponseTool
