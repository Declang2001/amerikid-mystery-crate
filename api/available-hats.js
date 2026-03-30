import { getVariantInventory } from './_lib/shopify.js'
import { VARIANT_TO_HAT_ID } from './_lib/allowed-hats.js'

/**
 * GET /api/available-hats
 * Returns the list of hat IDs whose hidden mystery-hat variant has inventory > 0.
 *
 * Response: { available: ["CF-ZS-OG", "CF-10", ...] }
 * On error: { available: null, error: "..." }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const variantIds = Object.keys(VARIANT_TO_HAT_ID)
    const inventory = await getVariantInventory(variantIds)

    const available = []
    for (const [variantId, hatId] of Object.entries(VARIANT_TO_HAT_ID)) {
      const qty = inventory.get(variantId) ?? 0
      if (qty > 0) {
        available.push(hatId)
      }
    }

    return res.status(200).json({ available })
  } catch (err) {
    console.error('Available hats check failed:', err)
    return res.status(500).json({ available: null, error: 'Internal server error' })
  }
}
