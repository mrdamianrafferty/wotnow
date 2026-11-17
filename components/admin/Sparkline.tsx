/**
 * A 14-day line for a KPI tile or an app row: no axes, just the shape.
 * Days with no figure (null) break the line rather
 * than drawing a zero. Draws nothing with fewer than two figures.
 */

interface Props {
  values: (number | null)[];
  color: string;
  /** Soft fill under the line. */
  fill?: string;
  height?: number;
  /** Read out instead of the line, e.g. "Daily active users, last 14 days". */
  label?: string;
  className?: string;
}

const W = 120;

export function Sparkline({ values, color, fill, height = 32, label, className }: Props) {
  const known = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (known.length < 2) return null;
  const min = Math.min(...known);
  const max = Math.max(...known);
  const span = max - min || 1;
  const pad = 3;
  const x = (i: number) => (values.length === 1 ? 0 : (i * W) / (values.length - 1));
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);

  // One run per stretch of consecutive figures
  const runs: [number, number][][] = [];
  let run: [number, number][] = [];
  values.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) {
      if (run.length) runs.push(run);
      run = [];
    } else run.push([x(i), y(v)]);
  });
  if (run.length) runs.push(run);

  const pts = (r: [number, number][]) => r.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');

  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {fill
        ? runs
            .filter((r) => r.length > 1)
            .map((r, i) => <polygon key={`f${i}`} points={`${r[0][0]},${height} ${pts(r)} ${r[r.length - 1][0]},${height}`} fill={fill} stroke="none" />)
        : null}
      {runs.map((r, i) =>
        r.length > 1 ? (
          <polyline
            key={i}
            points={pts(r)}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null,
      )}
    </svg>
  );
}
