/**
 * Hat data for Mystery Crate -- 15-hat launch pool
 *
 * Each entry:
 *   id       - Tag-safe unique ID (written to Shopify as crate_hat_won:<id>)
 *   name     - Display name shown in the result panel
 *   image    - Path to PNG in public/hats/ (served from root by Vite)
 *   weight   - Relative drop probability (higher = more likely, normalized at runtime)
 *   mainline - true only for the mainline hat (Zombie Slayer OG)
 *
 * To add or remove hats:
 *   1. Drop/remove the PNG in public/hats/
 *   2. Add/remove the entry below
 *   3. Update api/_lib/allowed-hats.js to match (server-side validation)
 *
 * Weights are provisional and not locked. Adjust as needed before launch.
 */

const hats = [
  // --- Mainline hat ---
  { id: 'CF-ZS-OG',          name: 'Zombie Slayer OG',  image: '/hats/ZOMBIE SLAYER OG FRONT.png',  weight: 1, mainline: true },

  // --- Custom / 1-of-1 hats ---
  { id: 'CF-CROSS-RED',      name: 'Cross Red',         image: '/hats/CROSS RED (CF).png',           weight: 1, mainline: false },
  { id: 'CF-KINDER',         name: 'Kinder',            image: '/hats/KINDER (CF).png',              weight: 1, mainline: false },
  { id: 'CF-MOUNTAIN-RUSH',  name: 'Mountain Rush',     image: '/hats/MOUNTAIN RUSH (CF).png',       weight: 1, mainline: false },
  { id: 'CF-PINK-PANTHER',   name: 'Pink Panther',      image: '/hats/PINK PANTHER (CF).png',        weight: 1, mainline: false },
  { id: 'CF-SKITTLES-BLACK', name: 'Skittles Black',    image: '/hats/SKITTLES BLACK (CF).png',      weight: 1, mainline: false },
  { id: 'CF-SKITTLES-RED',   name: 'Skittles Red',      image: '/hats/SKITTLES RED (CF).png',        weight: 1, mainline: false },
  { id: 'CF-STUDDED-MELON',  name: 'Studded Melon',     image: '/hats/STUDDED MELON (CF).png',       weight: 1, mainline: false },
  { id: 'CF-10',             name: 'Candy Facts 10',    image: '/hats/CANDYFACTSHAT-10-1.png',       weight: 1, mainline: false },
  { id: 'CF-11',             name: 'Candy Facts 11',    image: '/hats/CANDYFACTSHAT-11-1.png',       weight: 1, mainline: false },
  { id: 'CF-12',             name: 'Candy Facts 12',    image: '/hats/CANDYFACTSHAT-12-1.png',       weight: 1, mainline: false },
  { id: 'CF-13',             name: 'Candy Facts 13',    image: '/hats/CANDYFACTSHAT-13-1.png',       weight: 1, mainline: false },
  { id: 'CF-14',             name: 'Candy Facts 14',    image: '/hats/CANDYFACTSHAT-14-1.png',       weight: 1, mainline: false },
  { id: 'CF-15',             name: 'Candy Facts 15',    image: '/hats/CANDYFACTSHAT-15-1.png',       weight: 1, mainline: false },
  { id: 'CF-16',             name: 'Candy Facts 16',    image: '/hats/CANDYFACTSHAT-16-1.png',       weight: 1, mainline: false }
]

/**
 * Select a random hat using weighted probability
 * @returns {number} Index of selected hat
 */
export function selectWeightedHat() {
  const totalWeight = hats.reduce((sum, h) => sum + h.weight, 0)
  let random = Math.random() * totalWeight
  for (let i = 0; i < hats.length; i++) {
    random -= hats[i].weight
    if (random <= 0) return i
  }
  return hats.length - 1
}

export default hats
