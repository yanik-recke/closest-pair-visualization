import { scaleLinear, type ScaleLinear } from 'd3-scale'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

/** Screen-space padding (px) reserved for axis tick labels. */
const MARGIN = { top: 16, right: 16, bottom: 28, left: 36 }

/** The pixel<->data mapping handed to any layer drawn on the grid. */
export interface GridScales {
  /** data x -> pixel x */
  xScale: ScaleLinear<number, number>
  /** data y -> pixel y (inverted so +y points up) */
  yScale: ScaleLinear<number, number>
  /** inner plotting area in pixels */
  innerWidth: number
  innerHeight: number
}

interface CoordinateGridProps {
  /** total svg size in pixels */
  width: number
  height: number
  /** initial visible data range on each axis (pan/zoom changes it from here) */
  xDomain?: [number, number]
  yDomain?: [number, number]
  /** draw your segments / sweep line / points here, in data coordinates */
  children?: (scales: GridScales) => ReactNode
}

export function CoordinateGrid({
  width,
  height,
  xDomain = [-10, 10],
  yDomain = [-10, 10],
  children,
}: CoordinateGridProps) {
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom)

  const gRef = useRef<SVGGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGGElement, unknown> | null>(null)
  const [transform, setTransform] = useState(zoomIdentity)
  const clipId = useId()

  // Base "projection": data units -> pixels, with a single pixels-per-unit for
  // both axes so squares stay square. y is inverted (SVG y grows downward).
  const xCenter = (xDomain[0] + xDomain[1]) / 2
  const yCenter = (yDomain[0] + yDomain[1]) / 2
  const xSpan = xDomain[1] - xDomain[0]
  const ySpan = yDomain[1] - yDomain[0]
  const pxPerUnit = Math.min(innerWidth / xSpan, innerHeight / ySpan) || 1
  const xHalf = innerWidth / pxPerUnit / 2
  const yHalf = innerHeight / pxPerUnit / 2
  const x0 = scaleLinear()
    .domain([xCenter - xHalf, xCenter + xHalf])
    .range([0, innerWidth])
  const y0 = scaleLinear()
    .domain([yCenter - yHalf, yCenter + yHalf])
    .range([innerHeight, 0])

  // Apply the live zoom/pan transform. This shifts the *domain* (geometry
  // re-projects) while keeping fixed pixel sizes for points, strokes, labels.
  const xScale = transform.rescaleX(x0)
  const yScale = transform.rescaleY(y0)

  // Attach the d3-zoom behavior once; drag pans, wheel zooms, double-click resets.
  useEffect(() => {
    if (!gRef.current) return
    const g = select(gRef.current)
    const zb = zoom<SVGGElement, unknown>()
      .scaleExtent([0.15, 40])
      .on('zoom', (e) => setTransform(e.transform))
    zoomRef.current = zb
    g.call(zb).on('dblclick.zoom', null)
    const resetView = () => zb.transform(g, zoomIdentity)
    g.on('dblclick', resetView)
    return () => {
      g.on('.zoom', null)
      g.on('dblclick', null)
    }
  }, [])

  // Keep the zoom extent in sync with the panel size.
  useEffect(() => {
    zoomRef.current?.extent([
      [0, 0],
      [innerWidth, innerHeight],
    ])
  }, [innerWidth, innerHeight])

  const xTicks = xScale.ticks(10)
  const yTicks = yScale.ticks(10)
  const [xMin, xMax] = xScale.domain()
  const [yMin, yMax] = yScale.domain()

  const scales: GridScales = { xScale, yScale, innerWidth, innerHeight }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={innerWidth} height={innerHeight} />
        </clipPath>
      </defs>

      <g ref={gRef} transform={`translate(${MARGIN.left},${MARGIN.top})`}>
        {/* transparent surface so pan/zoom works over empty space too */}
        <rect
          x={0}
          y={0}
          width={innerWidth}
          height={innerHeight}
          fill="transparent"
          style={{ cursor: 'grab' }}
        />

        {/* clipped plotting area: grid, axes, and caller geometry */}
        <g clipPath={`url(#${clipId})`}>
          {xTicks.map((t) => (
            <line
              key={`gx-${t}`}
              className={t === 0 ? 'grid-line--major' : 'grid-line--minor'}
              x1={xScale(t)}
              x2={xScale(t)}
              y1={0}
              y2={innerHeight}
            />
          ))}
          {yTicks.map((t) => (
            <line
              key={`gy-${t}`}
              className={t === 0 ? 'grid-line--major' : 'grid-line--minor'}
              x1={0}
              x2={innerWidth}
              y1={yScale(t)}
              y2={yScale(t)}
            />
          ))}

          {/* axes through the origin (only if 0 is in view) */}
          {yMin <= 0 && yMax >= 0 && (
            <line
              className="axis-line"
              x1={0}
              x2={innerWidth}
              y1={yScale(0)}
              y2={yScale(0)}
            />
          )}
          {xMin <= 0 && xMax >= 0 && (
            <line
              className="axis-line"
              x1={xScale(0)}
              x2={xScale(0)}
              y1={0}
              y2={innerHeight}
            />
          )}

          {children?.(scales)}
        </g>

        {/* tick labels live in the margin, so they are not clipped */}
        {xTicks.map((t) => (
          <text
            key={`lx-${t}`}
            className="axis-tick-label"
            x={xScale(t)}
            y={innerHeight + 16}
            textAnchor="middle"
          >
            {t}
          </text>
        ))}
        {yTicks.map((t) => (
          <text
            key={`ly-${t}`}
            className="axis-tick-label"
            x={-8}
            y={yScale(t)}
            textAnchor="end"
            dominantBaseline="central"
          >
            {t}
          </text>
        ))}
      </g>
    </svg>
  )
}
