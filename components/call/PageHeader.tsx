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
          {/* Home is the call. The wordmark is the way back to it, which is the
              one navigation every page needs and the only one this has. */}
          <Link href="/" className="gd-head-mark">Go Daisy</Link>
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
