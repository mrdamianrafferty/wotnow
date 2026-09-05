/**
 * Where a shared Go Daisy card lands.
 *
 * THIS IS THE FRONT DOOR OF THE WHOLE BET. The premise is that every session
 * produces an object a non-user sees; this is the page that non-user arrives
 * at, and until now it was a generic three-app receipt — a card with an icon,
 * a badge and a "%", in the design system the app is moving off.
 *
 * A receipt is the wrong shape. Someone arriving here has just been sent a
 * sentence by a friend, and the page should show them that sentence, then offer
 * them their own. Not explain what Go Daisy is: they can see what it is, it is
 * on the screen.
 *
 * Only Go Daisy shares render this. Findr and Grow Daisy land on the original
 * template, which is theirs and has its own design.
 *
 * @module components/call/ShareLanding
 */

import Link from 'next/link';
import GetTheApp from '../GetTheApp';
import { BAND_LABEL, bandFor } from '@/lib/godaisy/call/bands';

export interface ShareLandingProps {
  place?: string;
  /** ISO date the call was for. */
  date: string;
  activityName: string;
  score: number;
  reason?: string;
  /** Where a visitor goes to get their own. */
  ctaHref: string;
}

/** "Sat 5 Sep" — the same short form the share card prints. */
function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
}

/**
 * Whether the day being shared has already gone.
 *
 * A card sent on Friday and opened on Monday is about a day that no longer
 * exists, and showing "Today is a prime day" over it is a lie the reader can
 * check against the window. The verdict stays — it is what their friend sent —
 * but it is put in the past where it belongs.
 */
function isPast(iso: string): boolean {
  const d = new Date(`${iso}T23:59:59`);
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

export function ShareLanding({ place, date, activityName, score, reason, ctaHref }: ShareLandingProps) {
  const band = bandFor(score);
  const past = isPast(date);
  const activity = activityName.replace(/^(?:Go to|Do Some|Go|Play|Do|Have|Take|Try|Hit|Visit)\s+/i, '').toLowerCase();

  return (
    <main className="gd-share">
      <div className="gd-share-inner">
        <p className="call-label gd-share-kicker">
          {[place, shortDate(date)].filter(Boolean).join(' · ')}
        </p>

        <p className="gd-share-verdict">
          {past ? 'It was ' : 'It is '}
          <span className="gd-share-activity">{activity}</span>
          {' weather.'}
        </p>

        {reason && <p className="gd-share-reason">{reason}</p>}

        <p className={`gd-spot-band is-${band}`}>
          <span className="gd-spot-band-label">{BAND_LABEL[band]}</span>
          <span className="gd-spot-band-score">{score}<span>/100</span></span>
        </p>

        <p className="gd-share-said">
          {past
            ? 'That was what Go Daisy said about that day.'
            : 'That is what Go Daisy says about today.'}{' '}
          It works out the answer before you ask, for wherever you are and whatever you do.
        </p>

        <Link href={ctaHref} className="gd-app-store gd-share-cta">
          See what today is good for
        </Link>
      </div>

      <GetTheApp placement="share_landing" />
    </main>
  );
}
