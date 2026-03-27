/**
 * Shopify Admin API helper for tag-based entitlement and hat persistence
 * Uses Client Credentials Grant for auto-minting access tokens
 *
 * Tag conventions:
 *   crate_spins:N        -- numeric purchased spin count (e.g., crate_spins:2)
 *   crate_hat_won:HAT-ID -- durably persisted winning hat (e.g., crate_hat_won:ZS-03)
 *
 * Legacy tags (spin_ready, spin_in_progress) are ignored but not removed automatically.
 */

const SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10'

const TAG_PREFIX_SPINS = 'crate_spins:'
const TAG_PREFIX_HAT_WON = 'crate_hat_won:'

// Module-scope token cache
let cachedToken = null
let cachedExpiresAt = 0

/**
 * Get a valid access token, minting a new one if needed
 * Uses Shopify Client Credentials Grant
 * @returns {Promise<string>}
 */
async function getAccessToken() {
  if (!SHOP_DOMAIN || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing Shopify credentials: SHOPIFY_SHOP_DOMAIN, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET')
  }

  // Reuse cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedExpiresAt - 60000) {
    return cachedToken
  }

  // Mint new token via Client Credentials Grant
  const tokenUrl = `https://${SHOP_DOMAIN}/admin/oauth/access_token`

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  })

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Shopify token error ${res.status}: ${text}`)
  }

  const data = await res.json()

  // Cache the token
  cachedToken = data.access_token
  const expiresInMs = (data.expires_in || 3600) * 1000
  cachedExpiresAt = Date.now() + expiresInMs

  return cachedToken
}

/**
 * Get customer data including tags
 * @param {string} customerId - Shopify customer ID
 * @returns {Promise<{id: number, tags: string[]} | null>}
 */
export async function getCustomer(customerId) {
  const accessToken = await getAccessToken()

  const url = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/customers/${customerId}.json?fields=id,tags`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    }
  })

  if (res.status === 404) {
    return null
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Shopify API error ${res.status}: ${text}`)
  }

  const data = await res.json()
  const customer = data.customer

  // Parse tags from comma-separated string to array
  const tagsString = customer.tags || ''
  const tags = tagsString
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)

  return {
    id: customer.id,
    tags
  }
}

/**
 * Update customer tags
 * @param {string} customerId - Shopify customer ID
 * @param {string[]} tags - New tags array
 * @returns {Promise<boolean>}
 */
export async function updateCustomerTags(customerId, tags) {
  const accessToken = await getAccessToken()

  const url = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/customers/${customerId}.json`

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customer: {
        id: parseInt(customerId, 10),
        tags: tags.join(', ')
      }
    })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Shopify API error ${res.status}: ${text}`)
  }

  return true
}

// --- Tag Parsing Helpers ---

/**
 * Parse total purchased spins remaining from tags.
 * Handles multiple crate_spins:N tags (sums them) for robustness.
 * @param {string[]} tags
 * @returns {number}
 */
function parseSpinsRemaining(tags) {
  let total = 0
  for (const tag of tags) {
    if (tag.startsWith(TAG_PREFIX_SPINS)) {
      const n = parseInt(tag.slice(TAG_PREFIX_SPINS.length), 10)
      if (Number.isFinite(n) && n > 0) {
        total += n
      }
    }
  }
  return total
}

/**
 * Parse the most recent hat_won tag value.
 * @param {string[]} tags
 * @returns {string | null}
 */
function parseHatWon(tags) {
  for (const tag of tags) {
    if (tag.startsWith(TAG_PREFIX_HAT_WON)) {
      const hatId = tag.slice(TAG_PREFIX_HAT_WON.length)
      if (hatId.length > 0) return hatId
    }
  }
  return null
}

/**
 * Remove all crate_spins:* tags from a tag array
 * @param {string[]} tags
 * @returns {string[]}
 */
function removeSpinTags(tags) {
  return tags.filter(t => !t.startsWith(TAG_PREFIX_SPINS))
}

// --- Public API Functions ---

/**
 * Check eligibility status for a customer.
 * Returns numeric spin count and any previously won hat.
 * @param {string} customerId
 * @returns {Promise<{logged_in: boolean, spins_remaining: number, hat_won: string|null, tags: string[]}>}
 */
export async function checkEligibility(customerId) {
  const customer = await getCustomer(customerId)

  if (!customer) {
    return {
      logged_in: false,
      spins_remaining: 0,
      hat_won: null,
      tags: []
    }
  }

  return {
    logged_in: true,
    spins_remaining: parseSpinsRemaining(customer.tags),
    hat_won: parseHatWon(customer.tags),
    tags: customer.tags
  }
}

/**
 * Consume one purchased spin: decrement the crate_spins:N tag by 1.
 * If spins_remaining is 1, the tag is removed entirely.
 * If spins_remaining is >1, the tag is replaced with crate_spins:(N-1).
 * @param {string} customerId
 * @returns {Promise<{ok: boolean, spins_remaining?: number, reason?: string}>}
 */
export async function consumeSpin(customerId) {
  const customer = await getCustomer(customerId)

  if (!customer) {
    return { ok: false, reason: 'Customer not found' }
  }

  const spinsRemaining = parseSpinsRemaining(customer.tags)

  if (spinsRemaining <= 0) {
    return { ok: false, reason: 'No purchased spins remaining' }
  }

  // Build new tags: remove all spin tags, add decremented count if > 1
  const baseTags = removeSpinTags(customer.tags)
  const newCount = spinsRemaining - 1
  if (newCount > 0) {
    baseTags.push(`${TAG_PREFIX_SPINS}${newCount}`)
  }

  await updateCustomerTags(customerId, baseTags)

  return { ok: true, spins_remaining: newCount }
}

/**
 * Finalize the spin result: write the winning hat ID as a durable tag.
 * Also removes all remaining spin tags so no further spins are possible.
 * Rejects if a hat has already been finalized (no overwrite).
 * @param {string} customerId
 * @param {string} hatId - The hat ID to persist (e.g., "ZS-03")
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function finalizeResult(customerId, hatId) {
  if (!hatId || typeof hatId !== 'string' || hatId.length === 0) {
    return { ok: false, reason: 'Missing or invalid hat_id' }
  }

  const customer = await getCustomer(customerId)

  if (!customer) {
    return { ok: false, reason: 'Customer not found' }
  }

  // Reject if a hat has already been finalized
  const existingHat = parseHatWon(customer.tags)
  if (existingHat) {
    return { ok: false, reason: 'Hat already finalized' }
  }

  // Remove all spin tags (no more spins after finalize) and any stale hat_won tags
  const baseTags = customer.tags
    .filter(t => !t.startsWith(TAG_PREFIX_HAT_WON) && !t.startsWith(TAG_PREFIX_SPINS))
  baseTags.push(`${TAG_PREFIX_HAT_WON}${hatId}`)

  await updateCustomerTags(customerId, baseTags)

  return { ok: true }
}

export { TAG_PREFIX_SPINS, TAG_PREFIX_HAT_WON }
