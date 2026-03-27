import { finalizeResult } from './_lib/shopify.js'
import { isValidHatId } from './_lib/allowed-hats.js'

/**
 * POST /api/finalize
 * Body: { customer_id: "123", hat_id: "ZS-03" }
 * Durably persists the winning hat as a customer tag.
 * Validates hat_id against the allowed hat dataset before writing.
 *
 * Response: { ok: true } or { ok: false, reason }
 */
export default async function handler(req, res) {
  // CORS headers for Shopify iframe embed
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

  // Server-side validation: only allow known hat IDs as tags
  if (!isValidHatId(hat_id)) {
    return res.status(400).json({ ok: false, reason: 'Invalid hat_id' })
  }

  try {
    const result = await finalizeResult(customer_id, hat_id)
    return res.status(200).json(result)
  } catch (err) {
    console.error('Finalize failed:', err)
    return res.status(500).json({ ok: false, reason: 'Internal server error' })
  }
}
