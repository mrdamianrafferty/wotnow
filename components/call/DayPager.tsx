/**
 * The day pager — dots that are buttons, and arrows where swipe cannot reach.
 *
 * This was a row of decorative `<i>` dots with `aria-hidden` and the words
 * "swipe for tomorrow" beside them. On a phone that sentence is true. In a
 * desktop browser it is a promise the page cannot keep: there are no touch
 * events behind a mouse, so the only way to reach tomorrow was an arrow key
 * that nothing on screen mentioned — and the dots, being decoration, could not
 * be clicked either. The screen advertised its one navigation gesture to the
 * people who could not perform it.
 *
 * So the dots became real buttons — they cost nothing on a phone and they are
 * the whole control for a screen reader, which previously could not move the
 * day at all — and a fine pointer additionally gets ‹ ›. Swipe is untouched
 * where swipe works; see `.call-dots` in godaisy-call.css for which device
 * sees which affordance.
 *
 * @module components/call/DayPager
 */

export interface DayPagerProps {
  /** One unix timestamp (seconds) per day, in order. */
  dates: number[];
  index: number;
  onSelect: (index: number) => void;
}

const DAY_LABEL = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long',
});

export function DayPager({ dates, index, onSelect }: DayPagerProps) {
  const last = dates.length - 1;

  return (
    // Not a <nav>: seven dots and two arrows in the bottom margin are a
    // control, and landmarking them would put a second "navigation" in the
    // rotor next to the menu, which is the one the screen actually has.
    <div className="call-dots" role="group" aria-label="Day">
      <button
        type="button"
        className="call-dots__arrow"
        aria-label="Previous day"
        disabled={index <= 0}
        onClick={() => onSelect(index - 1)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <span className="call-dots__row">
        {dates.map((date, i) => (
          <button
            key={date}
            type="button"
            className="call-dots__dot"
            // aria-current, not aria-pressed: these are seven views of one
            // thing, not seven independent toggles.
            aria-current={i === index ? 'true' : undefined}
            aria-label={DAY_LABEL.format(new Date(date * 1000))}
            onClick={() => onSelect(i)}
          />
        ))}
      </span>

      <button
        type="button"
        className="call-dots__arrow"
        aria-label="Next day"
        disabled={index >= last}
        onClick={() => onSelect(index + 1)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Hidden by CSS on a fine pointer — it is the sentence that was lying. */}
      <span className="call-dots__hint">swipe for tomorrow</span>
    </div>
  );
}
