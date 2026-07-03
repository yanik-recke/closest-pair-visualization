import { CoordinateGrid } from './components/CoordinateGrid'
import { useElementSize } from './hooks/useElementSize'
import type { Segment } from './geometry/types'

// A few demo segments so the grid isn't empty. These will later come from
// user input / the plane-sweep event queue.
const DEMO_SEGMENTS: Segment[] = [
  { id: 's1', p1: { x: -8, y: -4 }, p2: { x: 6, y: 5 } },
  { id: 's2', p1: { x: -6, y: 6 }, p2: { x: 7, y: -5 } },
  { id: 's3', p1: { x: -9, y: 2 }, p2: { x: 8, y: 1 } },
]

export default function App() {
  const { ref, width, height } = useElementSize<HTMLDivElement>()

  return (
    <>
      <header className="app-header">
        <h1>Plane Sweep Visualizer</h1>
        <span className="subtitle">
          line-segment intersection · coordinate grid
        </span>
      </header>

      <main className="app-main">
        <div className="canvas-panel" ref={ref}>
          {width > 0 && height > 0 && (
            <CoordinateGrid width={width} height={height}>
              {({ xScale, yScale }) => (
                <g>
                  {DEMO_SEGMENTS.map((s) => (
                    <g key={s.id}>
                      <line
                        className="segment"
                        x1={xScale(s.p1.x)}
                        y1={yScale(s.p1.y)}
                        x2={xScale(s.p2.x)}
                        y2={yScale(s.p2.y)}
                      />
                      <circle
                        className="segment-endpoint"
                        cx={xScale(s.p1.x)}
                        cy={yScale(s.p1.y)}
                        r={3}
                      />
                      <circle
                        className="segment-endpoint"
                        cx={xScale(s.p2.x)}
                        cy={yScale(s.p2.y)}
                        r={3}
                      />
                    </g>
                  ))}
                </g>
              )}
            </CoordinateGrid>
          )}
        </div>
      </main>
    </>
  )
}
