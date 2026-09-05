/**
 * The 404 that actually renders.
 *
 * THERE ARE TWO, AND THIS IS THE ONE. `pages/404.tsx` has existed for longer
 * and is the file anyone looks in first, but this repo carries a small App
 * Router alongside the Pages Router and `app/not-found.tsx` takes precedence —
 * so the Pages one is dead for every route on the site. Redesigning that file
 * changed nothing at all, which is how this was found.
 *
 * `pages/404.tsx` is redesigned to match rather than deleted: it still holds
 * the Grow Daisy branch and the Sentry breadcrumb, and removing a live-looking
 * error page on the strength of one afternoon's routing archaeology is the
 * wrong direction to be wrong in.
 *
 * @module app/not-found
 */

import Link from 'next/link';

// Disable static generation
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <main className="gd-doc gd-oops">
      <div className="gd-doc-inner">
        {/* The number is the least useful thing here — nobody arrives wanting a
            status code — so the sentence leads and 404 is a quiet label above
            it, the same shape as the kicker on the call. */}
        <p className="call-label gd-doc-kicker">404</p>
        <h1 className="gd-doc-title">There is nothing here.</h1>
        <p>
          That page has either moved or never existed. Neither is your fault,
          and the forecast is still fine.
        </p>
        <div className="gd-oops-actions">
          <Link href="/" className="gd-btn">Today&rsquo;s call</Link>
          <Link href="/weather" className="gd-btn gd-btn--quiet">The conditions</Link>
        </div>
        <p className="gd-doc-updated">
          Something we broke? <a href="mailto:hello@godaisy.io">Tell us</a>.
        </p>
      </div>
    </main>
  );
}
