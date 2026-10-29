/**
 * "{Activity} in {place}, month by month": measured averages, and which months
 * our own seasonal guide calls in season. Facts, not a verdict: see
 * lib/seo/climate.ts for why this is not a "best months" score.
 *
 * Server-rendered into the static page, so the words and the numbers are in the
 * HTML a crawler reads. The bars are decoration over real numbers; every figure
 * is also text.
 */

import { MONTH_NAMES, type MonthByMonth as Block } from '../../lib/seo/climate';

/** Each value as a share of its own row's range, floored so the smallest month still draws. */
function widths(values: number[]): number[] {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (hi === lo) return values.map(() => 50);
  return values.map((v) => 12 + ((v - lo) / (hi - lo)) * 88);
}

/** The page's activity name reads mid-sentence ("surfing"); a heading starts with a capital. */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const fmt = (n: number, decimals: number) => (decimals === 0 ? String(Math.round(n)) : n.toFixed(decimals));

export default function MonthByMonth({ block }: { block: Block }) {
  const inSeason = new Set(block.seasonal ?? []);
  const bars = block.rows.map((r) => widths(r.values));

  return (
    <section className="gd-spot-section" aria-labelledby="gd-month-title">
      <div className="gd-spot-inner">
        <h2 className="gd-spot-h2" id="gd-month-title">
          {cap(block.activityName)} in {block.place}, month by month
        </h2>
        <p className="gd-spot-prose">{block.sentences.join(' ')}</p>
        {block.seasonSentence && <p className="gd-spot-prose">{block.seasonSentence}</p>}

        <div className="gd-month-scroll">
          <table className="gd-month">
            <caption className="sr-only">
              Average {block.rows.map((r) => r.label.toLowerCase()).join(', ')} for each month in {block.place}
            </caption>
            <thead>
              <tr>
                <th scope="col">Month</th>
                {block.rows.map((r) => (
                  <th scope="col" key={r.key}>
                    {r.label} <span className="gd-month-unit">({r.unit})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MONTH_NAMES.map((name, i) => (
                <tr key={name} className={inSeason.has(i + 1) ? 'is-season' : undefined}>
                  <th scope="row">
                    <span aria-hidden="true">{name.slice(0, 3)}</span>
                    <span className="sr-only">{name}</span>
                    {inSeason.has(i + 1) && <span className="sr-only"> (in season)</span>}
                  </th>
                  {block.rows.map((r, j) => (
                    <td key={r.key}>
                      <span className="gd-month-val">{fmt(r.values[i], r.decimals)}</span>
                      <span className="gd-month-bar" style={{ width: `${bars[j][i]}%` }} aria-hidden="true" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {block.seasonal && <p className="gd-month-key"><span className="gd-month-swatch" aria-hidden="true" /> In season, by our seasonal guide</p>}
        <p className="gd-spot-note">{block.basis}</p>
      </div>
    </section>
  );
}
