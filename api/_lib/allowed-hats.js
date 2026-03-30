/**
 * Allowed hat IDs for server-side validation.
 * Must stay in sync with src/hats.js.
 *
 * Any hat_id submitted to /api/finalize is checked against this set.
 * If it is not present, the request is rejected with 400.
 */

const ALLOWED_HAT_IDS = new Set([
  // Mainline
  'CF-ZS-OG',
  // Custom / 1-of-1
  'CF-CROSS-RED',
  'CF-KINDER',
  'CF-MOUNTAIN-RUSH',
  'CF-PINK-PANTHER',
  'CF-SKITTLES-BLACK',
  'CF-SKITTLES-RED',
  'CF-STUDDED-MELON',
  // Numbered
  'CF-10',
  'CF-11',
  'CF-12',
  'CF-13',
  'CF-14',
  'CF-15',
  'CF-16'
])

/**
 * Shopify variant ID -> hat ID mapping for the hidden mystery-hat product.
 * These variant IDs match the shopifyVariantId values in src/hats.js.
 * Used by /api/available-hats to translate inventory data to hat IDs.
 */
const VARIANT_TO_HAT_ID = {
  '51863308304664': 'CF-ZS-OG',
  '51863308337432': 'CF-CROSS-RED',
  '51863308370200': 'CF-KINDER',
  '51863308402968': 'CF-MOUNTAIN-RUSH',
  '51863308435736': 'CF-PINK-PANTHER',
  '51863308468504': 'CF-SKITTLES-BLACK',
  '51863308501272': 'CF-SKITTLES-RED',
  '51863308534040': 'CF-STUDDED-MELON',
  '51863308566808': 'CF-10',
  '51863308599576': 'CF-11',
  '51863308632344': 'CF-12',
  '51863308665112': 'CF-13',
  '51863308697880': 'CF-14',
  '51863308730648': 'CF-15',
  '51863308763416': 'CF-16'
}

export function isValidHatId(hatId) {
  return typeof hatId === 'string' && ALLOWED_HAT_IDS.has(hatId)
}

export { ALLOWED_HAT_IDS, VARIANT_TO_HAT_ID }
