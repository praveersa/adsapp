export function parseBidResponse(rawJson) {
  const payload = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson
  const bid = payload?.seatbid?.[0]?.bid?.[0]

  if (!bid) {
    throw new Error('Invalid bid response: missing seatbid[0].bid[0]')
  }

  const adomain = Array.isArray(bid.adomain) ? bid.adomain[0] : bid.adomain
  const adm = bid.adm ?? ''
  const width = Number(bid.w) || 300
  const height = Number(bid.h) || 250

  if (!adomain) {
    throw new Error('Invalid bid response: missing adomain')
  }

  if (!adm.trim()) {
    throw new Error('Invalid bid response: missing adm creative markup')
  }

  return {
    id: bid.id,
    adomain,
    adm,
    width,
    height,
    iurl: bid.iurl,
    price: bid.price,
    crid: bid.crid,
    seat: payload.seatbid?.[0]?.seat,
  }
}
