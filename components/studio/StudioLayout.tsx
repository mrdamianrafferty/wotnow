/**
 * Shell for the Daisy Studio showcase pages under /studio.
 *
 * The pages are styled by the Daisy Studio design system (public/studio/studio.css),
 * loaded here rather than in _app so nothing leaks into the rest of godaisy.io.
 * Every page passes its own title, description and path for SEO and sharing.
 */
import { DM_Sans } from 'next/font/google';
import localFont from 'next/font/local';
import Head from 'next/head';
import type { ReactNode } from 'react';

// Self-hosted and preloaded by next/font, only on the studio pages. studio.css points
// the design system's --font-sans and --font-serif tokens at these two variables.
const studioSans = DM_Sans({ weight: ['400', '600'], subsets: ['latin'], display: 'swap', variable: '--font-studio-sans' });
const studioSerif = localFont({
  src: [
    { path: '../../public/fonts/daisy-serif/DaisySerif-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/daisy-serif/DaisySerif-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../../public/fonts/daisy-serif/DaisySerif-Italic.woff2', weight: '400', style: 'italic' },
  ],
  display: 'swap',
  variable: '--font-studio-serif',
});

const SITE = process.env.NEXT_PUBLIC_BASE_URL_GODAISY || 'https://godaisy.io';

interface Props {
  title: string;
  description: string;
  path: string;
  image?: string;
  /** Structured data for the page, from components/studio/studioJsonLd. */
  jsonLd?: Record<string, unknown>;
  children: ReactNode;
}

export default function StudioLayout({ title, description, path, image = '/studio/og/studio.png', jsonLd, children }: Props) {
  const url = `${SITE}${path}`;
  const og = image.startsWith('http') ? image : `${SITE}${image}`;
  const fullTitle = path === '/studio' ? 'Daisy Studio · Fishing, outdoor and data-driven app developers' : `${title} · Daisy Studio`;
  return (
    <>
      <Head>
        <title>{fullTitle}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Daisy Studio" />
        <meta property="og:url" content={url} />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={og} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={fullTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={og} />
        {/* The studio styles load here, not in _app, so nothing leaks into the rest of godaisy.io. */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/studio/studio.css" />
        {jsonLd && (
          <script
            type="application/ld+json"
            // JSON.stringify output is safe here: the data is our own constants, with "<" escaped.
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
          />
        )}
      </Head>
      <div className={`${studioSans.variable} ${studioSerif.variable}`}>{children}</div>
    </>
  );
}
