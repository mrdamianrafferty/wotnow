/**
 * Everything else, behind the dot.
 *
 * `ScreenChrome` has always described itself as "the ONE navigation control —
 * everything else lives behind the dot", replacing five navigation systems. In
 * practice the dot opened the evidence drawer and nothing else, so the new
 * surface — `/call`, `/start`, `/app` — had no route to settings, to an
 * account, or to a privacy policy. None at all.
 *
 * THE PRIVACY LINK IS AN APP STORE REQUIREMENT, not a nicety. Apple asks for a
 * privacy policy reachable from inside the app, and Go Daisy ships as a
 * Capacitor app whose web layer is this. Until now a reviewer opening it would
 * have found a forecast and no way to any of it.
 *
 * It is a sheet rather than a page because it is a detour: you are looking at
 * today's call and you want one thing — to change your sports, or to read the
 * policy. A route would lose the call and make you find it again.
 *
 * @module components/call/MenuSheet
 */

import { useEffect, useRef } from 'react';
import Link from 'next/link';

interface Item {
  href: string;
  label: string;
  /** The quiet half — what this is for, where the label alone is not obvious. */
  note?: string;
  external?: boolean;
}

/**
 * The lowercase routes, deliberately.
 *
 * There are two of most of these — `/CookiePolicy` and `/cookies`,
 * `/TermsAndConditions` and `/terms` — and the old footer points at the
 * capitalised ones. `/PrivacyPolicy` already 301s to `/privacy`, so lowercase
 * is the direction the site was already moving; the rest follow it rather than
 * this becoming a third opinion.
 */
const GROUPS: ReadonlyArray<{ title: string; items: readonly Item[] }> = [
  {
    title: 'Yours',
    items: [
      /*
       * THE CALL ITSELF WAS MISSING FROM A LIST HEADED "YOURS".
       *
       * Every other route out of `/account` had been removed by the redesign,
       * leaving exactly one: the wordmark in `PageHeader`. That is a bold
       * display-font logo with no underline and no chevron, whose only
       * interactive signal was a `:hover` colour — and touch has no hover. So
       * in the iOS app, where there is no browser back button, the only way off
       * the account screen was an element that does not look like a control.
       *
       * This is the cheapest of the three fixes and the one that adds no new
       * navigation: the menu already exists, and the app's main screen being
       * absent from it reads as an oversight rather than a decision.
       */
      { href: '/', label: 'The call', note: "Back to today's answer" },
      /*
       * `/weather` had no way in. The old bottom nav and header linked to it,
       * and the swap replaced both — so the conditions page became reachable
       * only by typing the URL, which is the same way `/call` was orphaned
       * before phase 7. It goes first because it is a destination, not a
       * setting.
       */
      { href: '/weather', label: 'Conditions', note: 'Every reading for where you are' },
      { href: '/start', label: 'Sports and spots', note: 'Change what Go Daisy tells you about' },
      /*
       * "Account" alone hid the one setting people go looking for.
       *
       * The hour the call arrives lives on `/account`, and the two routes to it
       * — this item and "Sports and spots" — between them said nothing about
       * timing or notifications. Someone wanting to change WHEN they are called
       * had no word to follow, which is a good working definition of a setting
       * that does not exist.
       */
      { href: '/account', label: 'Account', note: 'When Go Daisy calls, and everything else' },
    ],
  },
  {
    title: 'The small print',
    items: [
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/terms', label: 'Terms' },
      { href: '/cookies', label: 'Cookies' },
    ],
  },
  {
    title: 'Go Daisy',
    items: [
      { href: '/whether-weather', label: 'How the scoring works' },
      { href: '/support', label: 'Support Go Daisy' },
      { href: '/app', label: 'Get it on your iPhone' },
    ],
  },
];

export function MenuSheet({ onClose }: { onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="call-drawer-scrim" onClick={onClose} role="presentation">
      <div
        className="call-drawer call-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabIndex={-1}
        ref={panel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="call-drawer-grab" aria-hidden="true" />

        <header className="call-drawer-head">
          <p className="call-drawer-headline">Go Daisy</p>
          <button type="button" className="call-drawer-close" onClick={onClose}>
            Close
          </button>
        </header>

        {GROUPS.map((group) => (
          <section key={group.title} className="call-menu-group">
            <p className="call-label call-menu-group-title">{group.title}</p>
            <ul className="call-menu-list">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link className="call-menu-item" href={item.href} onClick={onClose}>
                    <span className="call-menu-label">{item.label}</span>
                    {item.note && <span className="call-menu-note">{item.note}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="call-drawer-foot">
          Free and ad-free. Weather from Open-Meteo.
        </p>
      </div>
    </div>
  );
}
