/**
 * POST /api/claim-spin
 *
 * DEPRECATED: This endpoint is superseded by /api/finalize.
 * Kept for backward compatibility. Returns a clear deprecation message.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  return res.status(410).json({
    ok: false,
    reason: 'This endpoint is deprecated. Use POST /api/finalize with { customer_id, hat_id } instead.'
  })
}
