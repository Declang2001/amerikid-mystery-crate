import { consumeSpin } from './_lib/shopify.js'

/**
 * POST /api/consume-spin
 * Body: { customer_id: "123" }
 * Decrements the purchased spin count by 1.
 *
 * Response: { ok, spins_remaining } or { ok: false, reason }
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

  const { customer_id } = req.body || {}

  if (!customer_id) {
    return res.status(400).json({ ok: false, reason: 'Missing customer_id' })
  }

  try {
    const result = await consumeSpin(customer_id)
    return res.status(200).json(result)
  } catch (err) {
    console.error('Consume spin failed:', err)
    return res.status(500).json({ ok: false, reason: 'Internal server error' })
  }
}
