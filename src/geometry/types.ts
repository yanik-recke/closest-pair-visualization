/** Core geometry types shared across the visualizer. */

export interface Point {
  x: number
  y: number
}

export interface Segment {
  id: string
  p1: Point
  p2: Point
}
