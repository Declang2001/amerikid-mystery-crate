/**
 * Shopify Admin API helper for tag-based eligibility
 */

const SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN
const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10'

const TAG_SPIN_READY = 'spin_ready'
const TAG_SPIN_IN_PROGRESS = 'spin_in_progress'

/**
 * Get customer data including tags
 * @param {string} customerId - Shopify customer ID
 * @returns {Promise<{id: number, tags: string[]} | null>}
 */
export async function getCustomer(customerId) {
  if (!SHOP_DOMAIN || !ACCESS_TOKEN) {
    throw new Error('Missing Shopify credentials in environment')
  }

  const url = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/customers/${customerId}.json?fields=id,tags`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': ACCESS_TOKEN,
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
  if (!SHOP_DOMAIN || !ACCESS_TOKEN) {
    throw new Error('Missing Shopify credentials in environment')
  }

  const url = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/customers/${customerId}.json`

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'X-Shopify-Access-Token': ACCESS_TOKEN,
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
