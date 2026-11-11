/**
 * Structured data (JSON-LD) for the Daisy Studio pages.
 *
 * Only facts the pages already state: names, web addresses and store listings.
 * No prices or offers, by design.
 */

const SITE = process.env.NEXT_PUBLIC_BASE_URL_GODAISY || 'https://godaisy.io';

type Json = Record<string, unknown>;

const ORG_ID = `${SITE}/studio#organization`;

export const studioOrganization: Json = {
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'Daisy Studio',
  legalName: 'Fly Industries Ltd',
  url: `${SITE}/studio`,
  email: 'hello@godaisy.io',
  description:
    'Daisy Studio builds apps for fishing clubs, fisheries and outdoor organisations, and apps that read rivers, seas, skies and gardens.',
  sameAs: [
    'https://risedaisy.com',
    'https://fishfindr.eu',
    'https://flycastcoach.com',
    'https://grewp.org',
    'https://godaisy.io',
    'https://grow.godaisy.io',
  ],
};

interface StudioApp {
  name: string;
  path: string;
  url?: string;
  category: string;
  os: string;
  stores: string[];
}

export const STUDIO_APPS: Record<string, StudioApp> = {
  'rise-daisy': {
    name: 'Rise Daisy',
    path: '/studio/rise-daisy',
    url: 'https://risedaisy.com',
    category: 'SportsApplication',
    os: 'Web, iOS, Android',
    stores: ['https://apps.apple.com/app/id6761378447', 'https://play.google.com/store/apps/details?id=com.risedaisy.app'],
  },
  'hungerford-fishery': {
    name: 'Hungerford Fishery',
    path: '/studio/hungerford-fishery',
    category: 'SportsApplication',
    os: 'iOS',
    stores: ['https://apps.apple.com/app/id6804752331'],
  },
  findr: {
    name: 'Findr',
    path: '/studio/findr',
    url: 'https://fishfindr.eu',
    category: 'SportsApplication',
    os: 'Web, iOS, Android',
    stores: ['https://apps.apple.com/app/id6755045700', 'https://play.google.com/store/apps/details?id=eu.fishfindr.app'],
  },
  'fly-cast-coach': {
    name: 'Fly Cast Coach',
    path: '/studio/fly-cast-coach',
    url: 'https://flycastcoach.com',
    category: 'SportsApplication',
    os: 'iOS, watchOS, Android',
    stores: ['https://apps.apple.com/app/id6785914297', 'https://play.google.com/store/apps/details?id=com.flycastcoach.app'],
  },
  grewp: {
    name: 'Grewp',
    path: '/studio/grewp',
    url: 'https://grewp.org',
    category: 'LifestyleApplication',
    os: 'Web, iOS, Android',
    stores: ['https://apps.apple.com/app/id6756231693', 'https://play.google.com/store/apps/details?id=org.grewp.app'],
  },
  'go-daisy': {
    name: 'Go Daisy',
    path: '/studio/go-daisy',
    url: 'https://godaisy.io',
    category: 'WeatherApplication',
    os: 'Web, iOS, Android',
    stores: ['https://apps.apple.com/app/id6755695873', 'https://play.google.com/store/apps/details?id=io.godaisy.app'],
  },
  'grow-daisy': {
    name: 'Grow Daisy',
    path: '/studio/grow-daisy',
    url: 'https://grow.godaisy.io',
    category: 'LifestyleApplication',
    os: 'Web, iOS',
    stores: ['https://apps.apple.com/app/id6756812661'],
  },
};

function breadcrumb(name: string, path: string): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Daisy Studio', item: `${SITE}/studio` },
      { '@type': 'ListItem', position: 2, name, item: `${SITE}${path}` },
    ],
  };
}

function graph(...nodes: Json[]): Json {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

/** The hub: the studio itself and the list of case studies. */
export function hubJsonLd(): Json {
  return graph(studioOrganization, {
    '@type': 'ItemList',
    name: 'Apps built by Daisy Studio',
    itemListElement: Object.values(STUDIO_APPS).map((app, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: app.name,
      url: `${SITE}${app.path}`,
    })),
  });
}

/** Build your app: the service, for the audiences the page names. */
export function buildJsonLd(): Json {
  return graph(studioOrganization, breadcrumb('Build your app', '/studio/build'), {
    '@type': 'Service',
    name: 'App design and development',
    serviceType: 'Mobile and web app development',
    provider: { '@id': ORG_ID },
    areaServed: ['GB', 'IE', 'EU'],
    audience: {
      '@type': 'Audience',
      audienceType: 'Fishing clubs, fisheries, angling associations and outdoor organisations',
    },
    url: `${SITE}/studio/build`,
  });
}

/** A case study: the app it describes, made by the studio. */
export function caseStudyJsonLd(slug: keyof typeof STUDIO_APPS): Json {
  const app = STUDIO_APPS[slug];
  return graph(breadcrumb(app.name, app.path), {
    '@type': 'SoftwareApplication',
    name: app.name,
    applicationCategory: app.category,
    operatingSystem: app.os,
    ...(app.url ? { url: app.url } : {}),
    sameAs: app.stores,
    creator: { '@id': ORG_ID, '@type': 'Organization', name: 'Daisy Studio' },
  });
}

/** A page with only a breadcrumb (Partner, Kitten Bingo). */
export function pageJsonLd(name: string, path: string): Json {
  return graph(breadcrumb(name, path));
}
