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
// Fallback-only pending-result bridge.
// Tag shape: crate_pending_result:<HAT-ID>:<UNIX-MS>
// Written on winner-landed, cleared on finalize, read by checkEligibility.
const TAG_PREFIX_PENDING = 'crate_pending_result:'

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

/**
 * Parse the most recent pending-result tag. Returns null if no valid tag exists.
 * Tag format: crate_pending_result:<HAT-ID>:<UNIX-MS>
 * @param {string[]} tags
 * @returns {{ hat_id: string, timestamp: number } | null}
 */
function parsePendingResult(tags) {
  let best = null
  for (const tag of tags) {
    if (!tag.startsWith(TAG_PREFIX_PENDING)) continue
    const rest = tag.slice(TAG_PREFIX_PENDING.length)
    const idx = rest.lastIndexOf(':')
    if (idx <= 0) continue
    const hatId = rest.slice(0, idx)
    const ts = parseInt(rest.slice(idx + 1), 10)
    if (!hatId || !Number.isFinite(ts)) continue
    if (!best || ts > best.timestamp) {
      best = { hat_id: hatId, timestamp: ts }
    }
  }
  return best
}

/**
 * Remove all crate_pending_result:* tags from a tag array
 * @param {string[]} tags
 * @returns {string[]}
 */
function removePendingTags(tags) {
  return tags.filter(t => !t.startsWith(TAG_PREFIX_PENDING))
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
    pending_result: parsePendingResult(customer.tags),
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

  // Remove all spin tags, any stale hat_won tags, and any pending-result tags
  // (pending bridge is resolved by finalize, so it must not survive the write).
  const baseTags = customer.tags
    .filter(t =>
      !t.startsWith(TAG_PREFIX_HAT_WON) &&
      !t.startsWith(TAG_PREFIX_SPINS) &&
      !t.startsWith(TAG_PREFIX_PENDING)
    )
  baseTags.push(`${TAG_PREFIX_HAT_WON}${hatId}`)

  await updateCustomerTags(customerId, baseTags)

  return { ok: true }
}

/**
 * Write a fallback-only pending-result tag. Replaces any prior pending tag.
 * Rejects if a hat has already been finalized (no-op by design).
 * @param {string} customerId
 * @param {string} hatId
 * @returns {Promise<{ok: boolean, reason?: string, timestamp?: number}>}
 */
export async function writePendingResult(customerId, hatId) {
  if (!hatId || typeof hatId !== 'string' || hatId.length === 0) {
    return { ok: false, reason: 'Missing or invalid hat_id' }
  }

  const customer = await getCustomer(customerId)

  if (!customer) {
    return { ok: false, reason: 'Customer not found' }
  }

  // If a hat has already been finalized, do not overwrite with a pending tag.
  if (parseHatWon(customer.tags)) {
    return { ok: false, reason: 'Hat already finalized' }
  }

  const timestamp = Date.now()
  const baseTags = removePendingTags(customer.tags)
  baseTags.push(`${TAG_PREFIX_PENDING}${hatId}:${timestamp}`)

  await updateCustomerTags(customerId, baseTags)

  return { ok: true, timestamp }
}

/**
 * Query inventory for a list of Shopify variant IDs via GraphQL Admin API.
 * Returns a Map of variantId -> inventoryQuantity for each queried variant.
 * Requires `read_products` scope on the app.
 *
 * @param {string[]} variantIds - Numeric Shopify variant IDs
 * @returns {Promise<Map<string, number>>}
 */
export async function getVariantInventory(variantIds) {
  if (!variantIds || variantIds.length === 0) {
    return new Map()
  }

  const accessToken = await getAccessToken()

  // Build GraphQL query using variant GIDs
  const gids = variantIds.map(id => `"gid://shopify/ProductVariant/${id}"`)
  const query = `{
    nodes(ids: [${gids.join(', ')}]) {
      ... on ProductVariant {
        id
        inventoryQuantity
      }
    }
  }`

  const url = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Shopify GraphQL error ${res.status}: ${text}`)
  }

  const json = await res.json()

  if (json.errors && json.errors.length > 0) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`)
  }

  const result = new Map()
  const nodes = json.data?.nodes || []
  for (const node of nodes) {
    if (!node || !node.id) continue
    // Extract numeric ID from GID (gid://shopify/ProductVariant/123)
    const numericId = node.id.split('/').pop()
    result.set(numericId, node.inventoryQuantity ?? 0)
  }

  return result
}

export { TAG_PREFIX_SPINS, TAG_PREFIX_HAT_WON }
