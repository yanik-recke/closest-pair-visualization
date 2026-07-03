/**
 * Fuzz the sweep against an O(n^2) brute force. Emphasis on duplicate
 * y-coordinates, which was the risky case for the tree keying.
 * Run: `node src/geometry/planesweep.fuzz.ts`
 */
import { closestPair, calcDistance } from './planesweep.ts'
import type { Point } from './types.ts'

function brute(points: Point[]): number {
  let min = Infinity
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++)
      min = Math.min(min, calcDistance(points[i], points[j]))
  return min
}

// Small integer coordinates => lots of duplicate x and y values on purpose.
function randomPoints(n: number, spread: number): Point[] {
  const pts: Point[] = []
  for (let i = 0; i < n; i++) {
    pts.push({
      x: Math.floor(Math.random() * spread),
      y: Math.floor(Math.random() * spread),
    })
  }
  return pts
}

const TRIALS = 20000
let fails = 0
let worstMsg = ''

for (let t = 0; t < TRIALS; t++) {
  const n = 2 + Math.floor(Math.random() * 10)
  // Narrow spread forces frequent y-collisions (the case we fixed).
  const spread = 1 + Math.floor(Math.random() * 6)
  const pts = randomPoints(n, spread)

  const got = closestPair(pts).dist
  const ref = brute(pts)

  if (Math.abs(got - ref) > 1e-9) {
    fails++
    if (!worstMsg) {
      worstMsg = `sweep=${got} brute=${ref} points=${JSON.stringify(pts)}`
    }
  }
}

if (fails === 0) {
  console.log(`PASS  ${TRIALS} trials, all match brute force (duplicate-heavy)`)
} else {
  console.log(`FAIL  ${fails}/${TRIALS} mismatched`)
  console.log('first mismatch:', worstMsg)
  process.exit(1)
}
