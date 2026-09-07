/**
 * The wrapper for every page that is mostly words.
 *
 * The privacy policy, the terms, the cookie policy, "how the scoring works",
 * support, about, and the FAQ. Seven pages, all reachable from the hamburger or
 * the footer, and all of them still DaisyUI on `bg-base-100` after the swap —
 * so tapping "Privacy policy" from inside the redesigned app dropped you into
 * the previous one. It is also an App Store requirement, which makes it the
 * worst of the seven to leave looking borrowed.
 *
 * IT STYLES THE MARKUP, NOT THE CLASSES. Each of these pages carries hundreds
 * of Tailwind utilities — `text-xl font-semibold mb-4` on every heading — and
 * editing them all would be a day of work and a day of chances to break a legal
 * document. `.gd-doc h2` is specificity (0,1,1) and `.text-xl` is (0,1,0), so
 * the element-scoped rules simply win and the content is left alone. This is
 * the same cascade trick that bit the icon buttons through `button:not(.btn)`,
 * used deliberately and in one place.
 *
 * @module components/call/DocPage
 */

import Head from 'next/head';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { PageHeader } from './PageHeader';
import Footer from '@/components/footer';

export function DocPage({
  title, description, updated, kicker, children,
}: {
  title: string;
  description?: string;
  /** "Last updated: 1 January 2026" — the legal pages need it, the rest do not. */
  updated?: string;
  /** The quiet line above the title, where the title alone is not enough. */
  kicker?: string;
  children: ReactNode;
}) {
  /*
   * A canonical and a share card, which these pages had neither of.
   *
   * `/whether-weather` is 633 words on why forecasts get it wrong — the only
   * prose on the site nobody generated — and it went out with a title, a
   * description and nothing else. No canonical, so a query string made a
   * duplicate; no og:image, so a link to it in a message rendered as grey text.
   * The four of these are in the sitemap now, which makes both worth having.
   *
   * `asPath` minus its query: these are static documents, and every parameter
   * that reaches them is a campaign tag or a tracker, never a different page.
   */
  const { asPath } = useRouter();
  const canonical = `https://godaisy.io${asPath.split(/[?#]/)[0]}`;

  return (
    <>
      <Head>
        <title>{`${title} | Go Daisy`}</title>
        {description && <meta name="description" content={description} />}
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={`${title} | Go Daisy`} />
        {description && <meta property="og:description" content={description} />}
        <meta property="og:image" content="https://godaisy.io/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Go Daisy" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${title} | Go Daisy`} />
        {description && <meta name="twitter:description" content={description} />}
        <meta name="twitter:image" content="https://godaisy.io/og-image.png" />
      </Head>

      <PageHeader />
      <main className="gd-doc">
        <div className="gd-doc-inner">
          {kicker && <p className="call-label gd-doc-kicker">{kicker}</p>}
          <h1 className="gd-doc-title">{title}</h1>
          {updated && <p className="gd-doc-updated">{updated}</p>}
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
