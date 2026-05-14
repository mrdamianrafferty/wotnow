// Grow Daisy i18n — supported languages, hreflang codes, and route helpers.
// English is the canonical language (no prefix). Other languages get a /grow/[lang]/ prefix.

export const GROW_BASE_URL = 'https://grow.godaisy.io';

// Supported languages — matches translation_cache and plant_species language columns.
// Path codes are used in URLs (/grow/fr/...). hreflang codes are sent in <link> tags.
export const GROW_LANGUAGES = [
  { pathCode: 'en',  hreflang: 'en-GB', label: 'English' },
  { pathCode: 'fr',  hreflang: 'fr',    label: 'Français' },
  { pathCode: 'es',  hreflang: 'es',    label: 'Español' },
  { pathCode: 'de',  hreflang: 'de',    label: 'Deutsch' },
  { pathCode: 'it',  hreflang: 'it',    label: 'Italiano' },
  { pathCode: 'pt',  hreflang: 'pt',    label: 'Português' },
  { pathCode: 'nl',  hreflang: 'nl',    label: 'Nederlands' },
  { pathCode: 'pl',  hreflang: 'pl',    label: 'Polski' },
] as const;

export type GrowPathCode = typeof GROW_LANGUAGES[number]['pathCode'];

// Path codes for non-English languages (these get the /grow/[lang]/ prefix)
export const GROW_TRANSLATED_PATH_CODES = GROW_LANGUAGES
  .filter((l) => l.pathCode !== 'en')
  .map((l) => l.pathCode);

export function isValidGrowLang(code: string): code is GrowPathCode {
  return GROW_LANGUAGES.some((l) => l.pathCode === code);
}

// Build the canonical URL for a given language and path.
// English is un-prefixed; others get /grow/[lang]/ inserted after /grow.
export function buildGrowUrl(pathCode: GrowPathCode, path: string): string {
  // path should start with /grow/...
  const normalised = path.startsWith('/') ? path : `/${path}`;
  if (pathCode === 'en') {
    return `${GROW_BASE_URL}${normalised}`;
  }
  // Insert lang after /grow: /grow/species/tomato → /grow/fr/species/tomato
  const withLang = normalised.replace(/^\/grow(\/|$)/, `/grow/${pathCode}$1`);
  return `${GROW_BASE_URL}${withLang}`;
}

// Given a localised URL path, strip the language prefix and return the English canonical path.
// /grow/fr/species/tomato → /grow/species/tomato
export function stripGrowLang(path: string): { enPath: string; lang: GrowPathCode } {
  const match = /^\/grow\/([a-z]{2})(\/|$)/.exec(path);
  if (match && isValidGrowLang(match[1]) && match[1] !== 'en') {
    return {
      enPath: path.replace(`/grow/${match[1]}`, '/grow'),
      lang: match[1] as GrowPathCode,
    };
  }
  return { enPath: path, lang: 'en' };
}

export interface HreflangEntry {
  hreflang: string;
  href: string;
}

// Build the full set of hreflang alternates for a given canonical English path.
// Returns objects ready to render as <link rel="alternate" hreflang="..." href="..." />
export function buildHreflangLinks(enPath: string): HreflangEntry[] {
  const links: HreflangEntry[] = GROW_LANGUAGES.map(({ pathCode, hreflang }) => ({
    hreflang,
    href: buildGrowUrl(pathCode, enPath),
  }));
  // x-default points to the English (canonical) URL
  links.push({ hreflang: 'x-default', href: `${GROW_BASE_URL}${enPath}` });
  return links;
}
