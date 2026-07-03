import { AVLTree } from 'avl'
import type { Point } from './types'

export function calcDistance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export interface ClosestPairResult {
  /** distance of the closest pair; Infinity if fewer than 2 points */
  dist: number
  /** the two closest points, or null if fewer than 2 points */
  pair: [Point, Point] | null
}

/**
 * A snapshot of the sweep after each atomic step. The UI can render a full
 * frame from one of these without knowing anything about the algorithm.
 */
export interface SweepState {
  phase: 'advance' | 'evict' | 'query' | 'compare' | 'done'
  /** human-readable description of the step that just happened */
  message: string
  /** x-position of the sweep line (the current point's x), or null when done */
  sweepX: number | null
  /** the point currently being processed */
  current: Point | null
  /** every point currently in the active set (status structure) */
  active: Point[]
  /** the y-range [current.y - best, current.y + best] being queried */
  band: [number, number] | null
  /** points returned by the range query, i.e. the ones we compare against */
  candidates: Point[]
  /** the specific pair being compared this step */
  compare: [Point, Point] | null
  /** distance computed this step (compare phase only) */
  distance?: number
  /** whether this compare produced a new best (compare phase only) */
  isNewBest?: boolean
  /** best pair found so far */
  best: ClosestPairResult
}

/**
 * Internal node. The AVL tree is keyed by this whole object so that keys are
 * *unique* even when points share a y-coordinate: we order by y, then x, then
 * insertion index `i`. Keying by y alone would let `remove` delete the wrong
 * node when two active points have equal y.
 */
interface Node {
  x: number
  y: number
  i: number
  point: Point
}

function compareNodes(a: Node, b: Node): number {
  if (a.y !== b.y) return a.y < b.y ? -1 : 1
  if (a.x !== b.x) return a.x < b.x ? -1 : 1
  return a.i - b.i
}

function fmt(p: Point): string {
  return `(${p.x}, ${p.y})`
}

/**
 * Closest-pair-of-points via plane sweep, as a generator. Each `yield` is one
 * atomic step (advance, evict, query, compare); the generator's return value is
 * the final result. Drive it with `.next()` — e.g. once per button click.
 */
export function* planesweepSteps(
  input: Point[],
): Generator<SweepState, ClosestPairResult> {
  const result: ClosestPairResult = { dist: Infinity, pair: null }

  // Sort a copy by x (ties by y) so we never mutate the caller's array.
  const nodes: Node[] = input
    .map((point, i) => ({ x: point.x, y: point.y, i, point }))
    .sort((a, b) => (a.x !== b.x ? a.x - b.x : a.y - b.y))

  const active: Point[] = []
  const snapshot = (
    phase: SweepState['phase'],
    message: string,
    fields: Partial<SweepState>,
  ): SweepState => ({
    phase,
    message,
    sweepX: fields.sweepX ?? null,
    current: fields.current ?? null,
    active: [...active],
    band: fields.band ?? null,
    candidates: fields.candidates ?? [],
    compare: fields.compare ?? null,
    distance: fields.distance,
    isNewBest: fields.isNewBest,
    best: { dist: result.dist, pair: result.pair ? [...result.pair] : null },
  })

  if (nodes.length < 2) {
    yield snapshot('done', 'Need at least 2 points', {})
    return result
  }

  // The sweep-line status structure: active points ordered by y.
  const line = new AVLTree<Node, Node>(compareNodes, /* noDuplicates */ true)

  const insert = (n: Node) => {
    line.insert(n, n)
    active.push(n.point)
  }
  const evict = (n: Node) => {
    line.remove(n)
    const idx = active.indexOf(n.point)
    if (idx >= 0) active.splice(idx, 1)
  }

  insert(nodes[0])
  let removeIdx = 0

  for (let r = 1; r < nodes.length; r++) {
    const curr = nodes[r]
    const band = (): [number, number] => [
      curr.y - result.dist,
      curr.y + result.dist,
    ]

    yield snapshot('advance', `Sweep to ${fmt(curr.point)}`, {
      sweepX: curr.x,
      current: curr.point,
    })

    // Evict points that have fallen behind the strip (x < curr.x - best).
    while (removeIdx < r && nodes[removeIdx].x < curr.x - result.dist) {
      const gone = nodes[removeIdx]
      evict(gone)
      removeIdx++
      yield snapshot('evict', `Evict ${fmt(gone.point)} — outside x-range`, {
        sweepX: curr.x,
        current: curr.point,
        band: band(),
      })
    }

    // Range query: active points whose y is within `best` of curr.y.
    const lo: Node = { x: -Infinity, y: curr.y - result.dist, i: -Infinity, point: curr.point }
    const hi: Node = { x: Infinity, y: curr.y + result.dist, i: Infinity, point: curr.point }
    const candidates: Point[] = []
    line.range(lo, hi, (node) => {
      candidates.push(node.data!.point)
    })

    yield snapshot('query', `Query y-range around ${fmt(curr.point)} — ${candidates.length} candidate(s)`, {
      sweepX: curr.x,
      current: curr.point,
      band: band(),
      candidates,
    })

    for (const cand of candidates) {
      const d = calcDistance(cand, curr.point)
      const newBest = d < result.dist
      if (newBest) {
        result.dist = d
        result.pair = [cand, curr.point]
      }
      yield snapshot(
        'compare',
        `d${fmt(cand)}–${fmt(curr.point)} = ${d.toFixed(3)}${newBest ? '  ← new best' : ''}`,
        {
          sweepX: curr.x,
          current: curr.point,
          band: band(),
          candidates,
          compare: [cand, curr.point],
          distance: d,
          isNewBest: newBest,
        },
      )
    }

    insert(curr)
  }

  yield snapshot(
    'done',
    result.pair
      ? `Closest pair ${fmt(result.pair[0])}–${fmt(result.pair[1])}, dist = ${result.dist.toFixed(4)}`
      : 'Done',
    { compare: result.pair ?? undefined },
  )
  return result
}

/** Run the sweep to completion and return just the result. */
export function closestPair(points: Point[]): ClosestPairResult {
  const gen = planesweepSteps(points)
  let step = gen.next()
  while (!step.done) step = gen.next()
  return step.value
}
