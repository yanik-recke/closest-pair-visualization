# Plane Sweep Visualizer

An in-browser visualization of the **plane sweep** (Bentley–Ottmann) algorithm
for line-segment intersection. All geometry is computed client-side; there is no
backend.

## Stack

| Concern            | Choice                          | Why                                            |
| ------------------ | ------------------------------- | ---------------------------------------------- |
| Build tool / app   | Vite + React + TypeScript       | Fast dev server, standard, deploys anywhere    |
| Rendering          | SVG                             | Crisp, styleable, easy hit-testing             |
| Coordinate mapping | [`d3-scale`](https://github.com/d3/d3-scale) | Data-units ↔ pixels ("projection") |

The `CoordinateGrid` component owns the scales (the data→pixel mapping) and draws
the grid, axes, and tick labels. Any geometry layer (segments, sweep line,
intersection points) is drawn on top via its render-prop, always in **data
coordinates** — you never do pixel math yourself.

```tsx
<CoordinateGrid width={w} height={h}>
  {({ xScale, yScale }) => (
    <line x1={xScale(p1.x)} y1={yScale(p1.y)} x2={xScale(p2.x)} y2={yScale(p2.y)} />
  )}
</CoordinateGrid>
```

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build

```bash
npm run build    # type-checks, then emits static assets to dist/
npm run preview  # serve the production build locally
```

## Deploy (Railway)

Railway auto-detects the Node app via Nixpacks. On deploy it runs
`npm install` → `npm run build` → `npm run start`. The `start` script serves the
built `dist/` with `vite preview` bound to Railway's injected `$PORT`. Config
lives in [`railway.json`](./railway.json).

## Project layout

```
src/
  App.tsx                  # wires the grid together, holds demo segments
  components/
    CoordinateGrid.tsx     # grid + axes + d3 scales (the "projection")
  geometry/
    types.ts               # Point, Segment
  hooks/
    useElementSize.ts      # responsive sizing via ResizeObserver
```

## Next steps

- [ ] Segment input (click / drag to add segments)
- [ ] Plane-sweep core: event queue + sweep-line status structure
- [ ] Animated sweep line with step / play controls
- [ ] Highlight intersection events as they are discovered
```
