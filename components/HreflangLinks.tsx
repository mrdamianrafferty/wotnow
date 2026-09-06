import Head from 'next/head';
import { buildHreflangLinks, type GrowPathCode } from '@/lib/grow/i18n';

interface HreflangLinksProps {
  // The canonical English path, e.g. /grow/species/tomato
  enPath: string;
  /**
   * Which languages this page actually exists in.
   *
   * Omit for pages that exist in every language regardless — the static Grow
   * screens do, because their chrome is translated up front. Pass it for
   * anything translated on demand, so a language is only advertised once its
   * text is cached.
   *
   * IT MUST MATCH WHAT THE SITEMAP SAYS. hreflang is reciprocal: if the sitemap
   * advertises a narrower set than the page does, Google discounts the
   * annotation and believes neither claim. Both sides derive this from
   * `translatedLanguagesFor`, which is why that function exists.
   */
  available?: readonly GrowPathCode[];
}

/**
 * Renders hreflang <link rel="alternate"> tags for Grow Daisy language variants.
 * Place inside <Head> or as a sibling (it handles its own <Head> wrapper).
 *
 * Usage: <HreflangLinks enPath="/grow/species/tomato" available={['fr','es']} />
 */
export function HreflangLinks({ enPath, available }: HreflangLinksProps) {
  const links = buildHreflangLinks(enPath, available);

  return (
    <Head>
      {links.map(({ hreflang, href }) => (
        <link key={hreflang} rel="alternate" hrefLang={hreflang} href={href} />
      ))}
    </Head>
  );
}
