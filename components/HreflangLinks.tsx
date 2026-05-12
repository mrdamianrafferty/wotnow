import Head from 'next/head';
import { buildHreflangLinks } from '@/lib/grow/i18n';

interface HreflangLinksProps {
  // The canonical English path, e.g. /grow/species/tomato
  enPath: string;
}

/**
 * Renders hreflang <link rel="alternate"> tags for all Grow Daisy language variants.
 * Place inside <Head> or as a sibling (it handles its own <Head> wrapper).
 *
 * Usage: <HreflangLinks enPath="/grow/species/tomato" />
 */
export function HreflangLinks({ enPath }: HreflangLinksProps) {
  const links = buildHreflangLinks(enPath);

  return (
    <Head>
      {links.map(({ hreflang, href }) => (
        <link key={hreflang} rel="alternate" hrefLang={hreflang} href={href} />
      ))}
    </Head>
  );
}
