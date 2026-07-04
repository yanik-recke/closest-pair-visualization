import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { CoordinateGrid } from "./components/CoordinateGrid";
import { PointTooltip } from "./components/PointTooltip";
import { useElementSize } from "./hooks/useElementSize";
import { planesweepSteps, type SweepState } from "./geometry/planesweep";
import type { Point } from "./geometry/types";

const X_DOMAIN: [number, number] = [-2, 18];
const Y_DOMAIN: [number, number] = [-2, 12];

/** A point with a stable id, so React keys and add/remove stay correct. */
interface GridPoint extends Point {
  id: string;
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `p${Math.random().toString(36).slice(2)}`;

const INITIAL_POINTS: GridPoint[] = [
  { x: 10, y: 0 },
  { x: 5, y: 7 },
  { x: 13, y: 3 },
  { x: 2, y: 3 },
  { x: 16, y: 6 },
  { x: 8, y: 4 },
  { x: 11, y: 6 },
].map((p) => ({ ...p, id: uid() }));

const PHASE_HELP: Record<SweepState["phase"], string> = {
  advance:
    "The sweep line moves right to the next point (points are processed in order of increasing x).",
  evict:
    "Removes points that are now more than the best distance behind the sweep line — too far left to beat the current pair.",
  query:
    "Collects the active points within the best distance in y of the current point: the only candidates worth measuring.",
  compare:
    "Measures the distance from the current point to a candidate and keeps it as the new best pair if it is closer.",
  done: "The sweep is finished — the closest pair and its distance are final.",
};

function pointClass(
  p: Point,
  s: SweepState | null,
  sets: {
    active: Set<Point>;
    candidates: Set<Point>;
    compare: Set<Point>;
    best: Set<Point>;
  },
): string {
  if (s?.current === p) return "point point--current";
  if (sets.compare.has(p)) return "point point--compare";
  if (sets.best.has(p)) return "point point--best";
  if (sets.candidates.has(p)) return "point point--candidate";
  if (sets.active.has(p)) return "point point--active";
  return "point";
}

export default function App() {
  const { ref, width, height } = useElementSize<HTMLDivElement>();

  const [points, setPoints] = useState<GridPoint[]>(INITIAL_POINTS);
  // `cursor` points at the shown snapshot (-1 = before the first step).
  const [cursor, setCursor] = useState(-1);

  const [hovered, setHovered] = useState<Point | null>(null);

  const [inputX, setInputX] = useState("");
  const [inputY, setInputY] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  // The whole run is computed up front (it's small: O(n log n) snapshots), so
  // the total step count is known and Back/Step just move the cursor.
  const steps = useMemo(() => {
    const out: SweepState[] = [];
    const gen = planesweepSteps(points);
    let res = gen.next();
    while (!res.done) {
      out.push(res.value);
      res = gen.next();
    }
    return out;
  }, [points]);

  const state = cursor >= 0 ? steps[cursor] : null;
  const atEnd = cursor >= steps.length - 1;

  /** Adds a point unless one already exists there. Returns whether it added. */
  const addPoint = (x: number, y: number): boolean => {
    if (points.some((p) => p.x === x && p.y === y)) return false;
    setPoints((ps) => [...ps, { id: uid(), x, y }]);
    setCursor(-1); // editing restarts the sweep
    return true;
  };

  const removePoint = (id: string) => {
    setPoints((ps) => ps.filter((p) => p.id !== id));
    setHovered(null); // the removed circle can't fire mouseleave; clear tooltip
    setCursor(-1);
  };

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    const x = Number(inputX);
    const y = Number(inputY);
    if (
      inputX.trim() === "" ||
      inputY.trim() === "" ||
      Number.isNaN(x) ||
      Number.isNaN(y)
    ) {
      setAddError("Enter a number for both x and y.");
      return;
    }
    const added = addPoint(x, y);
    if (!added) {
      setAddError("A point already exists at those coordinates.");
      return;
    }
    setAddError(null);
    setInputX("");
    setInputY("");
  };

  // Parse "x,y; x,y; ..." then replace ALL existing points with the result.
  const handleImport = () => {
    const tokens = importText
      .split(";")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (tokens.length === 0) {
      setImportError('Paste at least one point, e.g. "1,2; 3,4".');
      return;
    }
    const parsed: GridPoint[] = [];
    const seen = new Set<string>();
    for (const tok of tokens) {
      // Accept both "x,y" and "(x,y)" by stripping any parentheses.
      const parts = tok
        .replace(/[()]/g, "")
        .split(",")
        .map((s) => s.trim());
      const x = Number(parts[0]);
      const y = Number(parts[1]);
      if (
        parts.length !== 2 ||
        parts[0] === "" ||
        parts[1] === "" ||
        Number.isNaN(x) ||
        Number.isNaN(y)
      ) {
        setImportError(`"${tok}" is not a valid "x,y" pair.`);
        return;
      }
      const key = `${x},${y}`;
      if (seen.has(key)) continue; // silently drop duplicates
      seen.add(key);
      parsed.push({ id: uid(), x, y });
    }
    setPoints(parsed); // replaces everything, clearing existing points
    setHovered(null);
    setCursor(-1);
    setImportError(null);
    setImportText("");
    setShowImport(false);
  };

  const step = () => setCursor((c) => Math.min(steps.length - 1, c + 1));
  const stepBack = () => setCursor((c) => Math.max(-1, c - 1));
  const runToEnd = () => setCursor(steps.length - 1);
  const reset = () => setCursor(-1);

  const sets = {
    active: new Set(state?.active ?? []),
    candidates: new Set(state?.candidates ?? []),
    compare: new Set(state?.compare ?? []),
    best: new Set(state?.best.pair ?? []),
  };

  const bestPair = state?.best.pair ?? null;

  const phaseHelp = state
    ? PHASE_HELP[state.phase]
    : "Which stage of the sweep this step is in: advance, evict, query, compare, or done.";

  return (
    <>
      <header className="app-header">
        <h1>Plane Sweep Visualizer</h1>
        <span className="subtitle">Closest Pair of Points Problem</span>
        <a
          className="github-link"
          href="https://github.com/yanik-recke/closest-pair-visualization"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="View source on GitHub"
          title="View source on GitHub"
        >
          <svg width="22" height="22" viewBox="0 0 16 16" aria-hidden="true">
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
        </a>
      </header>

      <main className="app-main">
        <div className="grid-column">
          <ul className="legend">
            <li>
              <span className="swatch point--current" /> Current point
            </li>
            <li>
              <span className="swatch point--active" /> Active set
            </li>
            <li>
              <span className="swatch point--candidate" /> In y-range
            </li>
            <li>
              <span className="swatch point--compare" /> Comparing
            </li>
            <li>
              <span className="swatch point--best" /> Best pair
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
                  const current = state?.current ?? null;
                  const best = state?.best.dist ?? Infinity;

                  // Candidate region: x-range [cx - best, cx] intersected with
                  // the y-range [cy - best, cy + best]. Only when best is finite.
                  let searchBox: ReactNode = null;
                  if (current && Number.isFinite(best)) {
                    const x1 = xScale(current.x - best);
                    const x2 = xScale(current.x);
                    const yTop = yScale(current.y + best);
                    const yBot = yScale(current.y - best);
                    searchBox = (
                      <rect
                        className="search-box"
                        pointerEvents="none"
                        x={Math.min(x1, x2)}
                        y={Math.min(yTop, yBot)}
                        width={Math.abs(x2 - x1)}
                        height={Math.abs(yBot - yTop)}
                      />
                    );
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
                            e.stopPropagation();
                            removePoint(p.id);
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
                  );
                }}
              </CoordinateGrid>
            )}
          </div>
        </div>

        <aside className="controls-panel">
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

          <dl className="status">
            <dt>Points</dt>
            <dd>{points.length}</dd>
            <dt>Progress</dt>
            <dd>{`${cursor + 1} / ${steps.length}`}</dd>
            <dt className="phase-label" tabIndex={0}>
              Phase
              <span className="phase-tip" role="tooltip">
                {phaseHelp}
              </span>
            </dt>
            <dd>{state?.phase ?? "—"}</dd>
            <dt>Step</dt>
            <dd>{state?.message ?? "Press Step to begin"}</dd>
            <dt>Best distance</dt>
            <dd>
              {state && Number.isFinite(state.best.dist)
                ? state.best.dist.toFixed(4)
                : "∞"}
            </dd>
          </dl>

          <form className="add-point-form" onSubmit={handleAddSubmit}>
            <div className="add-point-fields">
              <label>
                x
                <input
                  type="number"
                  step="any"
                  value={inputX}
                  onChange={(e) => {
                    setInputX(e.target.value);
                    setAddError(null);
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
                    setInputY(e.target.value);
                    setAddError(null);
                  }}
                />
              </label>
            </div>
            <button type="submit">Add point</button>
            {addError && <p className="add-error">{addError}</p>}

            <div className="import-section">
              <button
                type="button"
                className="import-toggle"
                onClick={() => setShowImport((v) => !v)}
                aria-expanded={showImport}
              >
                {showImport ? "Cancel import" : "Import points…"}
              </button>
              {showImport && (
                <>
                  <textarea
                    className="import-text"
                    rows={3}
                    value={importText}
                    onChange={(e) => {
                      setImportText(e.target.value);
                      setImportError(null);
                    }}
                    placeholder="(1,2); (3,4); -5,6"
                  />
                  <button type="button" onClick={handleImport}>
                    Replace all with these
                  </button>
                  {importError && <p className="add-error">{importError}</p>}
                </>
              )}
            </div>
          </form>
        </aside>
      </main>
    </>
  );
}
