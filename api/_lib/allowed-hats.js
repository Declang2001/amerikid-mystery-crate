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

export function isValidHatId(hatId) {
  return typeof hatId === 'string' && ALLOWED_HAT_IDS.has(hatId)
}

export { ALLOWED_HAT_IDS }
