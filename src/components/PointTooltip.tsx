import type { Point } from '../geometry/types'

interface PointTooltipProps {
  /** the point, in data coordinates (for the label) */
  point: Point
  /** the point's position in pixels (for placement) */
  px: number
  py: number
}

/** Trim to at most 2 decimals without trailing zeros: 3 -> "3", 3.5 -> "3.5". */
function fmt(n: number): string {
  return Number(n.toFixed(2)).toString()
}

/** A small callout showing a point's (x, y), drawn above the point. */
export function PointTooltip({ point, px, py }: PointTooltipProps) {
  const label = `(${fmt(point.x)}, ${fmt(point.y)})`

  // Rough box sizing from the label length (SVG can't auto-size to text).
  const charWidth = 7
  const paddingX = 8
  const boxHeight = 20
  const boxWidth = label.length * charWidth + paddingX * 2
  const gap = 10 // space between the point and the callout

  const boxX = px - boxWidth / 2
  const boxY = py - gap - boxHeight

  return (
    // pointer-events: none so the tooltip never steals hover from the point
    <g className="point-tooltip" pointerEvents="none">
      <rect
        className="point-tooltip__box"
        x={boxX}
        y={boxY}
        width={boxWidth}
        height={boxHeight}
        rx={4}
      />
      {/* little pointer triangle toward the point */}
      <path
        className="point-tooltip__box"
        d={`M ${px - 4} ${boxY + boxHeight} L ${px + 4} ${boxY + boxHeight} L ${px} ${boxY + boxHeight + 4} Z`}
      />
      <text
        className="point-tooltip__text"
        x={px}
        y={boxY + boxHeight / 2}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {label}
      </text>
    </g>
  )
}
