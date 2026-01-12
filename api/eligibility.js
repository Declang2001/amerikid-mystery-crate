import { checkEligibility } from './_lib/shopify.js'

/**
 * GET /api/eligibility?customer_id=123
 * Returns eligibility status for a customer
 */
export default async function handler(req, res) {
  // CORS headers for Shopify iframe embed
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const customerId = req.query.customer_id

  if (!customerId) {
    return res.status(400).json({ error: 'Missing customer_id parameter' })
  }

  try {
    const eligibility = await checkEligibility(customerId)
    return res.status(200).json(eligibility)
  } catch (err) {
    console.error('Eligibility check failed:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
