/**
 * Hat data for Mystery Crate
 *
 * To add new hats:
 * 1. Drop PNG image in /public/hats/
 * 2. Add entry below with unique id, name, image path, and weight
 *
 * Weight determines drop probability (higher = more likely)
 * All weights are normalized at runtime, so values are relative.
 */

const hats = [
  { id: 'ZS-01', name: 'Zombie Slayer ZS-01', image: '/hats/hat1.png', weight: 1 },
  { id: 'ZS-02', name: 'Zombie Slayer ZS-02', image: '/hats/hat2.png', weight: 1 },
  { id: 'ZS-03', name: 'Zombie Slayer ZS-03', image: '/hats/hat3.png', weight: 1 },
  { id: 'ZS-04', name: 'Zombie Slayer ZS-04', image: '/hats/hat4.png', weight: 1 },
  { id: 'ZS-05', name: 'Zombie Slayer ZS-05', image: '/hats/hat5.png', weight: 1 }
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
