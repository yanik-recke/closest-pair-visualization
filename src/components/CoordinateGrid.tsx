import { scaleLinear, type ScaleLinear } from 'd3-scale'
import { type ReactNode } from 'react'

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
  /** visible data range on each axis */
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

  // The "projection": data units -> pixels within the plotting area.
  // y is inverted because SVG's y grows downward but math grows upward.
  const xScale = scaleLinear().domain(xDomain).range([0, innerWidth])
  const yScale = scaleLinear().domain(yDomain).range([innerHeight, 0])

  const xTicks = xScale.ticks(10)
  const yTicks = yScale.ticks(10)

  const scales: GridScales = { xScale, yScale, innerWidth, innerHeight }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
        {/* --- grid lines --- */}
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

        {/* --- axes through the origin (only if 0 is in view) --- */}
        {yDomain[0] <= 0 && yDomain[1] >= 0 && (
          <line
            className="axis-line"
            x1={0}
            x2={innerWidth}
            y1={yScale(0)}
            y2={yScale(0)}
          />
        )}
        {xDomain[0] <= 0 && xDomain[1] >= 0 && (
          <line
            className="axis-line"
            x1={xScale(0)}
            x2={xScale(0)}
            y1={0}
            y2={innerHeight}
          />
        )}

        {/* --- tick labels --- */}
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

        {/* --- axis names --- */}
        <text className="axis-name" x={innerWidth} y={yScale(0) - 6} textAnchor="end">
          x
        </text>
        <text className="axis-name" x={xScale(0) + 8} y={2} dominantBaseline="hanging">
          y
        </text>

        {/* --- geometry layers drawn by the parent --- */}
        {children?.(scales)}
      </g>
    </svg>
  )
}
