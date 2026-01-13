/**
 * Shopify Admin API helper for tag-based eligibility
 * Uses Client Credentials Grant for auto-minting access tokens
 */

const SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10'

const TAG_SPIN_READY = 'spin_ready'
const TAG_SPIN_IN_PROGRESS = 'spin_in_progress'

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
    throw new Error(`Shopify OAuth error ${res.status}: ${text}`)
  }

  const data = await res.json()

  // Cache the token
  // Shopify returns expires_in in seconds; convert to ms and add to current time
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

/**
 * Check eligibility status for a customer
 * @param {string} customerId
 * @returns {Promise<{logged_in: boolean, ready: boolean, in_progress: boolean, tags: string[]}>}
 */
export async function checkEligibility(customerId) {
  const customer = await getCustomer(customerId)

  if (!customer) {
    return {
      logged_in: false,
      ready: false,
      in_progress: false,
      tags: []
    }
  }

  return {
    logged_in: true,
    ready: customer.tags.includes(TAG_SPIN_READY),
    in_progress: customer.tags.includes(TAG_SPIN_IN_PROGRESS),
    tags: customer.tags
  }
}

/**
 * Consume a spin: remove spin_ready, add spin_in_progress
 * @param {string} customerId
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function consumeSpin(customerId) {
  const customer = await getCustomer(customerId)

  if (!customer) {
    return { ok: false, reason: 'Customer not found' }
  }

  if (!customer.tags.includes(TAG_SPIN_READY)) {
    return { ok: false, reason: 'No spin_ready tag present' }
  }

  if (customer.tags.includes(TAG_SPIN_IN_PROGRESS)) {
    return { ok: false, reason: 'Spin already in progress' }
  }

  // Build new tags: remove spin_ready, add spin_in_progress
  const newTags = customer.tags
    .filter(t => t !== TAG_SPIN_READY)
    .concat(TAG_SPIN_IN_PROGRESS)

  await updateCustomerTags(customerId, newTags)

  return { ok: true }
}

/**
 * Claim a spin: remove spin_in_progress
 * @param {string} customerId
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function claimSpin(customerId) {
  const customer = await getCustomer(customerId)

  if (!customer) {
    return { ok: false, reason: 'Customer not found' }
  }

  if (!customer.tags.includes(TAG_SPIN_IN_PROGRESS)) {
    return { ok: false, reason: 'No spin_in_progress tag present' }
  }

  // Build new tags: remove spin_in_progress
  const newTags = customer.tags.filter(t => t !== TAG_SPIN_IN_PROGRESS)

  await updateCustomerTags(customerId, newTags)

  return { ok: true }
}

export { TAG_SPIN_READY, TAG_SPIN_IN_PROGRESS }
