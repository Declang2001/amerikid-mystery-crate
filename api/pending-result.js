import { writePendingResult } from './_lib/shopify.js'
import { isValidHatId } from './_lib/allowed-hats.js'

/**
 * POST /api/pending-result
 * Body: { customer_id: "123", hat_id: "CF-10" }
 * Fallback-only bridge: records a paid winner before the customer has pressed
 * Save Result, so a session interruption can resume the exact landed hat
 * instead of losing the paid spin.
 *
 * Response: { ok: true, timestamp } or { ok: false, reason }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { customer_id, hat_id } = req.body || {}

  if (!customer_id) {
    return res.status(400).json({ ok: false, reason: 'Missing customer_id' })
  }

  if (!hat_id) {
    return res.status(400).json({ ok: false, reason: 'Missing hat_id' })
  }

  if (!isValidHatId(hat_id)) {
    return res.status(400).json({ ok: false, reason: 'Invalid hat_id' })
  }

  try {
    const result = await writePendingResult(customer_id, hat_id)
    return res.status(200).json(result)
  } catch (err) {
    console.error('Write pending-result failed:', err)
    return res.status(500).json({ ok: false, reason: 'Internal server error' })
  }
}
