/*
 * `'use client'` because `app/settings` is a React Server Component.
 *
 * This lives in `components/`, which both routers import from, and the Pages
 * Router does not need the directive — it is a no-op there. The App Router
 * does: this holds `useState` for the menu, and importing it into a server
 * component without the directive is a build error rather than a warning.
 */
'use client';

/**
 * The slim header for every page that is not the call.
 *
 * The call screen has no header — it is one photograph, one sentence, and the
 * menu behind a hamburger — and that is right for the thing the whole app is
 * for. But `/weather`, `/account` and the legal pages are ordinary pages, and
 * after the swap they had no shared chrome at all: no way home, and no way to
 * the menu, so the only route out of `/account` was the browser's back button.
 *
 * SLIM ON PURPOSE. It is a wordmark and a menu, on a hairline. Anything more
 * would be the fifth navigation system the redesign exists to have removed, and
 * these pages are places you visit rather than places you live.
 *
 * @module components/call/PageHeader
 */

import { useState } from 'react';
import Link from 'next/link';
import { MenuSheet } from './MenuSheet';

export function PageHeader({ title }: { title?: string }) {
  const [menu, setMenu] = useState(false);

  return (
    <>
      <header className="gd-head">
        <div className="gd-head-inner">
          {/*
            * Home is the call. The wordmark is the way back to it, which is the
            * one navigation every page needs and the only one this has.
            *
            * THE CHEVRON IS NOT DECORATION. Without it this is a bold display-
            * font wordmark with no underline, in the same ink as body text,
            * whose only interactive signal was `:hover` — and touch has no
            * hover. In the iOS app there is no browser back button and no
            * swipe-back, so this was the only way off `/account` and it did not
            * look like a control. One glyph is the smallest thing that fixes
            * that without becoming the second navigation system.
            */}
          <Link href="/" className="gd-head-mark">
            <svg className="gd-head-back" width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                 aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Go Daisy
          </Link>
          {title && <span className="gd-head-title">{title}</span>}
          <button
            type="button"
            className="gd-head-menu"
            aria-label="Menu"
            onClick={() => setMenu(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </header>
      {menu && <MenuSheet onClose={() => setMenu(false)} />}
    </>
  );
}
