import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { CoordinateGrid } from './components/CoordinateGrid'
import { PointTooltip } from './components/PointTooltip'
import { useElementSize } from './hooks/useElementSize'
import { planesweepSteps, type SweepState } from './geometry/planesweep'
import type { Point } from './geometry/types'

const X_DOMAIN: [number, number] = [-10, 10]
const Y_DOMAIN: [number, number] = [-10, 10]

/** A point with a stable id, so React keys and add/remove stay correct. */
interface GridPoint extends Point {
  id: string
}

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `p${Math.random().toString(36).slice(2)}`

const INITIAL_POINTS: GridPoint[] = [
  { x: -8, y: 3 },
  { x: -6, y: -4 },
  { x: -3, y: 5 },
  { x: -1, y: 0 },
  { x: 1, y: -6 },
  { x: 2, y: 4 },
  { x: 4, y: -2 },
  { x: 5, y: 6 },
  { x: 7, y: 1 },
  { x: 8, y: -5 },
].map((p) => ({ ...p, id: uid() }))

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v))

function pointClass(
  p: Point,
  s: SweepState | null,
  sets: {
    active: Set<Point>
    candidates: Set<Point>
    compare: Set<Point>
    best: Set<Point>
  },
): string {
  if (s?.current === p) return 'point point--current'
  if (sets.compare.has(p)) return 'point point--compare'
  if (sets.best.has(p)) return 'point point--best'
  if (sets.candidates.has(p)) return 'point point--candidate'
  if (sets.active.has(p)) return 'point point--active'
  return 'point'
}

export default function App() {
  const { ref, width, height } = useElementSize<HTMLDivElement>()

  const [points, setPoints] = useState<GridPoint[]>(INITIAL_POINTS)
  // `cursor` points at the shown snapshot (-1 = before the first step).
  const [cursor, setCursor] = useState(-1)

  const [hovered, setHovered] = useState<Point | null>(null)

  const [inputX, setInputX] = useState('')
  const [inputY, setInputY] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  // The whole run is computed up front (it's small: O(n log n) snapshots), so
  // the total step count is known and Back/Step just move the cursor.
  const steps = useMemo(() => {
    const out: SweepState[] = []
    const gen = planesweepSteps(points)
    let res = gen.next()
    while (!res.done) {
      out.push(res.value)
      res = gen.next()
    }
    return out
  }, [points])

  const state = cursor >= 0 ? steps[cursor] : null
  const atEnd = cursor >= steps.length - 1

  /** Adds a point unless one already exists there. Returns whether it added. */
  const addPoint = (x: number, y: number): boolean => {
    if (points.some((p) => p.x === x && p.y === y)) return false
    setPoints((ps) => [...ps, { id: uid(), x, y }])
    setCursor(-1) // editing restarts the sweep
    return true
  }

  const removePoint = (id: string) => {
    setPoints((ps) => ps.filter((p) => p.id !== id))
    setHovered(null) // the removed circle can't fire mouseleave; clear tooltip
    setCursor(-1)
  }

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault()
    const x = Number(inputX)
    const y = Number(inputY)
    if (
      inputX.trim() === '' ||
      inputY.trim() === '' ||
      Number.isNaN(x) ||
      Number.isNaN(y)
    ) {
      setAddError('Enter a number for both x and y.')
      return
    }
    const added = addPoint(clamp(x, ...X_DOMAIN), clamp(y, ...Y_DOMAIN))
    if (!added) {
      setAddError('A point already exists at those coordinates.')
      return
    }
    setAddError(null)
    setInputX('')
    setInputY('')
  }

  const step = () => setCursor((c) => Math.min(steps.length - 1, c + 1))
  const stepBack = () => setCursor((c) => Math.max(-1, c - 1))
  const runToEnd = () => setCursor(steps.length - 1)
  const reset = () => setCursor(-1)

  const sets = {
    active: new Set(state?.active ?? []),
    candidates: new Set(state?.candidates ?? []),
    compare: new Set(state?.compare ?? []),
    best: new Set(state?.best.pair ?? []),
  }

  const bestPair = state?.best.pair ?? null

  return (
    <>
      <header className="app-header">
        <h1>Plane Sweep Visualizer</h1>
        <span className="subtitle">closest pair of points · sweep line</span>
      </header>

      <main className="app-main">
        <div className="grid-column">
          <ul className="legend">
            <li>
              <span className="swatch point--current" /> current point
            </li>
            <li>
              <span className="swatch point--active" /> active set
            </li>
            <li>
              <span className="swatch point--candidate" /> in y-range
            </li>
            <li>
              <span className="swatch point--compare" /> comparing
            </li>
            <li>
              <span className="swatch point--best" /> best pair
            </li>
          </ul>
          <div className="canvas-panel" ref={ref}>
            {width > 0 && height > 0 && (
              <CoordinateGrid
                width={width}
                height={height}
                xDomain={X_DOMAIN}
                yDomain={Y_DOMAIN}
              >
                {({ xScale, yScale, innerHeight }) => {
                  const current = state?.current ?? null
                  const best = state?.best.dist ?? Infinity

                  // Candidate region: x-range [cx - best, cx] intersected with
                  // the y-range [cy - best, cy + best]. Only when best is finite.
                  let searchBox: ReactNode = null
                  if (current && Number.isFinite(best)) {
                    const x1 = xScale(clamp(current.x - best, ...X_DOMAIN))
                    const x2 = xScale(clamp(current.x, ...X_DOMAIN))
                    const yTop = yScale(clamp(current.y + best, ...Y_DOMAIN))
                    const yBot = yScale(clamp(current.y - best, ...Y_DOMAIN))
                    searchBox = (
                      <rect
                        className="search-box"
                        pointerEvents="none"
                        x={Math.min(x1, x2)}
                        y={Math.min(yTop, yBot)}
                        width={Math.abs(x2 - x1)}
                        height={Math.abs(yBot - yTop)}
                      />
                    )
                  }

                  return (
                    <g>
                      {searchBox}

                      {current && (
                        <line
                          className="sweep-line"
                          pointerEvents="none"
                          x1={xScale(current.x)}
                          x2={xScale(current.x)}
                          y1={0}
                          y2={innerHeight}
                        />
                      )}

                      {bestPair && (
                        <line
                          className="best-pair-line"
                          pointerEvents="none"
                          x1={xScale(bestPair[0].x)}
                          y1={yScale(bestPair[0].y)}
                          x2={xScale(bestPair[1].x)}
                          y2={yScale(bestPair[1].y)}
                        />
                      )}

                      {state?.compare && (
                        <line
                          className="compare-line"
                          pointerEvents="none"
                          x1={xScale(state.compare[0].x)}
                          y1={yScale(state.compare[0].y)}
                          x2={xScale(state.compare[1].x)}
                          y2={yScale(state.compare[1].y)}
                        />
                      )}

                      {/* the points */}
                      {points.map((p) => (
                        <circle
                          key={p.id}
                          className={pointClass(p, state, sets)}
                          cx={xScale(p.x)}
                          cy={yScale(p.y)}
                          r={5}
                          onMouseEnter={() => setHovered(p)}
                          onMouseLeave={() =>
                            setHovered((cur) => (cur === p ? null : cur))
                          }
                          onClick={(e) => {
                            e.stopPropagation()
                            removePoint(p.id)
                          }}
                        />
                      ))}

                      {hovered && points.includes(hovered as GridPoint) && (
                        <PointTooltip
                          point={hovered}
                          px={xScale(hovered.x)}
                          py={yScale(hovered.y)}
                        />
                      )}
                    </g>
                  )
                }}
              </CoordinateGrid>
            )}
          </div>
        </div>

          <aside className="controls-panel">
            <form className="add-point-form" onSubmit={handleAddSubmit}>
              <div className="add-point-fields">
                <label>
                  x
                  <input
                    type="number"
                    step="any"
                    value={inputX}
                    onChange={(e) => {
                      setInputX(e.target.value)
                      setAddError(null)
                    }}
                  />
                </label>
                <label>
                  y
                  <input
                    type="number"
                    step="any"
                    value={inputY}
                    onChange={(e) => {
                      setInputY(e.target.value)
                      setAddError(null)
                    }}
                  />
                </label>
              </div>
              <button type="submit">Add point</button>
              {addError && <p className="add-error">{addError}</p>}
            </form>

            <div className="controls-buttons">
              <div className="controls-row">
                <button onClick={stepBack} disabled={cursor < 0}>
                  ◂ Back
                </button>
                <button onClick={step} disabled={atEnd}>
                  Step ▸
                </button>
              </div>
              <button onClick={runToEnd} disabled={atEnd}>
                Run to end ⏭
              </button>
              <button onClick={reset} className="secondary">
                Reset ↺
              </button>
            </div>

            <p className="hint">
              Click a point on the grid to remove it. Adding or removing points
              restarts the sweep.
            </p>

            <dl className="status">
              <dt>Points</dt>
              <dd>{points.length}</dd>
              <dt>Progress</dt>
              <dd>{`${cursor + 1} / ${steps.length}`}</dd>
              <dt>Phase</dt>
              <dd>{state?.phase ?? '—'}</dd>
              <dt>Step</dt>
              <dd>{state?.message ?? 'Press Step to begin'}</dd>
              <dt>Best distance</dt>
              <dd>
                {state && Number.isFinite(state.best.dist)
                  ? state.best.dist.toFixed(4)
                  : '∞'}
              </dd>
            </dl>
          </aside>
        </main>
    </>
  )
}
