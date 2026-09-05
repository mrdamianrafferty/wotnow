/**
 * Fit the verdict to its box.
 *
 * The verdict is the whole product, it is one sentence, and that sentence
 * is machine-translated into ten locales. Measured across 39 realistic
 * verdicts in the shipped locale set, in the call screen's 338px column:
 *
 *   - 12 of 39 do not fit at 62px within three lines
 *   - the worst ("Tira a bicicleta antes das onze.") needs 46px
 *   - four have a SINGLE WORD wider than the column at 62px, e.g. French
 *     "Aujourd'hui," at 408px, which overflows sideways rather than wrapping
 *
 * So 62px is a ceiling, not a size. This binary-searches the largest size
 * that fits `maxLines` with no word overflowing, and writes it to the
 * element as --call-verdict-size.
 */

const MIN = 44;
const MAX = 62;
const MAX_LINES = 3;
/** Slack, as a fraction of one line, to absorb subpixel layout noise. */
const LINE_TOLERANCE = 0.25;

export interface FitOptions {
  min?: number;
  max?: number;
  maxLines?: number;
}

/** Largest px size at which `el`'s text fits. Reads layout; call in an effect. */
export function fitVerdict(el: HTMLElement, opts: FitOptions = {}): number {
  const min = opts.min ?? MIN;
  const max = opts.max ?? MAX;
  const maxLines = opts.maxLines ?? MAX_LINES;

  const styles = getComputedStyle(el);
  const lineHeightRatio = parseFloat(styles.lineHeight) / parseFloat(styles.fontSize) || 0.96;

  const fits = (px: number): boolean => {
    el.style.setProperty('--call-verdict-size', `${px}px`);
    // A word wider than the box overflows horizontally; wrapping cannot help.
    if (el.scrollWidth > el.clientWidth + 1) return false;

    // Compare height against a threshold rather than rounding to a line count.
    // Math.round() on `height / lineHeight` can undercount: a box that renders
    // maxLines + 1 lines but sits just below the .5 boundary — because of
    // subpixel layout, or a lineHeightRatio that drifts from the rendered
    // leading — rounds down and is wrongly accepted. The tolerance is a
    // fraction of one line, so it absorbs subpixel noise without ever
    // admitting a whole extra line.
    const lineHeight = px * lineHeightRatio;
    const maxHeight = lineHeight * maxLines + lineHeight * LINE_TOLERANCE;
    return el.getBoundingClientRect().height <= maxHeight;
  };

  let lo = min;
  let hi = max;
  let best = min;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fits(mid)) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  el.style.setProperty('--call-verdict-size', `${best}px`);
  return best;
}
