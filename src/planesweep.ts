/**
 * Dev-only test harness for the closest-pair sweep. The algorithm now lives in
 * ./geometry/planesweep.ts — this file just checks it against known cases and
 * an O(n^2) brute-force reference. Run: `node src/planesweep.ts`
 */
import { closestPair, calcDistance } from './geometry/planesweep.ts'
import type { Point } from './geometry/types.ts'

const cases: [string, Point[], number][] = [
  ['baseline', [{ x: -2, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: -3 }], 1],
  ['vertical pair', [{ x: 0, y: 0 }, { x: 0, y: 0.5 }, { x: 5, y: 5 }, { x: 10, y: 0 }], 0.5],
  // closest here is (0,0)-(2,0) = 2, not the sqrt(4.01) the old literal assumed.
  ['spans strip', [{ x: 0, y: 0 }, { x: 1, y: 10 }, { x: 2, y: 0 }, { x: 3, y: 10 }, { x: 4, y: 0.1 }], 2],
  ['3-4-5 diagonal', [{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 10, y: 10 }, { x: -5, y: -5 }], 5],
  ['duplicate point', [{ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 8, y: 8 }], 0],
  ['two points', [{ x: 0, y: 0 }, { x: 7, y: 0 }], 7],
  ['tall strip', [{ x: 0, y: 0 }, { x: 1, y: 100 }, { x: 2, y: 0.5 }, { x: 3, y: 105 }, { x: 4, y: 2 }], Math.sqrt(4.25)],
  ['left point higher', [{ x: 0, y: 5 }, { x: 1, y: 4 }], Math.sqrt(2)],
  ['duplicate y', [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1.2, y: 1 }], 0.2],
]

function brute(points: Point[]): number {
  let min = Infinity
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++)
      min = Math.min(min, calcDistance(points[i], points[j]))
  return min
}

let failed = 0
for (const [label, pts, expected] of cases) {
  const got = closestPair(pts).dist
  const ref = brute(pts)
  const ok = Math.abs(got - expected) < 1e-9
  if (!ok) failed++
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}: got=${got} expected=${expected} brute=${ref}`,
  )
}
console.log(failed === 0 ? '\nAll cases passed.' : `\n${failed} case(s) failed.`)
