/**
 * JSON-LD Structured Data Components
 *
 * Provides structured data for search engines to better understand
 * the content of our pages. This improves SEO and enables rich snippets.
 *
 * Usage:
 * ```tsx
 * import { OrganizationJsonLd, WebsiteJsonLd, BreadcrumbJsonLd } from '@/components/JsonLd';
 *
 * <OrganizationJsonLd />
 * <WebsiteJsonLd />
 * <BreadcrumbJsonLd items={[{ name: 'Home', url: '/' }, { name: 'Predictions', url: '/findr' }]} />
 * ```
 */

import Head from 'next/head';

export type AppId = 'godaisy' | 'grow' | 'findr';

const APP_CONFIGS: Record<AppId, { name: string; url: string; logo: string; description: string }> = {
  godaisy: {
    name: 'Go Daisy',
    url: 'https://godaisy.io',
    logo: 'https://godaisy.io/logo.png',
    description: 'Weather-informed activity recommendations for outdoor enthusiasts.',
  },
  grow: {
    name: 'Grow Daisy',
    url: 'https://grow.godaisy.io',
    logo: 'https://grow.godaisy.io/logo.png',
    description: 'Smart gardening assistant with weather-aware plant care recommendations.',
  },
  findr: {
    name: 'Findr',
    url: 'https://fishfindr.eu',
    logo: 'https://fishfindr.eu/findr-logo.png',
    description: 'AI-powered fishing predictions based on real marine environmental data.',
  },
};

// Determine current app and base URL.
// Pass `app` explicitly when rendering server-side so the correct identity
// is baked into the initial HTML (window is undefined on the server).
function getAppConfig(app?: AppId) {
  if (app) return APP_CONFIGS[app];

  if (typeof window === 'undefined') {
    return APP_CONFIGS.godaisy;
  }

  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  if (hostname.includes('fishfindr') || hostname.includes('findr') || pathname.startsWith('/findr')) {
    return APP_CONFIGS.findr;
  }

  if (hostname.includes('grow') || pathname.startsWith('/grow')) {
    return APP_CONFIGS.grow;
  }

  return APP_CONFIGS.godaisy;
}

interface JsonLdProps {
  data: Record<string, unknown>;
}

/**
 * Base component for rendering JSON-LD script tags
 */
function JsonLdScript({ data }: JsonLdProps) {
  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      />
    </Head>
  );
}

/**
 * Organization structured data
 * Helps search engines understand the organization behind the website
 */
export function OrganizationJsonLd({ app }: { app?: AppId } = {}) {
  const config = getAppConfig(app);

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: config.name,
    url: config.url,
    logo: config.logo,
    description: config.description,
    sameAs: [
      // Add social media URLs when available
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: `${config.url}/contact`,
    },
  };

  return <JsonLdScript data={data} />;
}

/**
 * Website structured data with search action
 * Enables sitelinks search box in Google search results
 */
export function WebsiteJsonLd({ app }: { app?: AppId } = {}) {
  const config = getAppConfig(app);

  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.name,
    url: config.url,
    description: config.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${config.url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return <JsonLdScript data={data} />;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
  app?: AppId;
}

/**
 * Breadcrumb structured data
 * Helps search engines understand page hierarchy
 */
export function BreadcrumbJsonLd({ items, app }: BreadcrumbJsonLdProps) {
  const config = getAppConfig(app);

  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${config.url}${item.url}`,
    })),
  };

  return <JsonLdScript data={data} />;
}

/**
 * Software Application structured data
 * For app store optimization and rich snippets
 */
export function SoftwareApplicationJsonLd({
  rating,
  ratingCount,
  app,
}: {
  rating?: number;
  ratingCount?: number;
  app?: AppId;
}) {
  const config = getAppConfig(app);

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: config.name,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'iOS, Android, Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
    },
    description: config.description,
    url: config.url,
  };

  // Add aggregate rating if provided
  if (rating && ratingCount) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating,
      ratingCount: ratingCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return <JsonLdScript data={data} />;
}

interface ArticleJsonLdProps {
  title: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  url: string;
  app?: AppId;
}

/**
 * Article structured data
 * For blog posts, guides, and informational content
 */
export function ArticleJsonLd({
  title,
  description,
  image,
  datePublished,
  dateModified,
  author,
  url,
  app,
}: ArticleJsonLdProps) {
  const config = getAppConfig(app);

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    image: image || config.logo,
    datePublished: datePublished,
    dateModified: dateModified || datePublished,
    author: {
      '@type': 'Organization',
      name: author || config.name,
      url: config.url,
    },
    publisher: {
      '@type': 'Organization',
      name: config.name,
      logo: {
        '@type': 'ImageObject',
        url: config.logo,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url.startsWith('http') ? url : `${config.url}${url}`,
    },
  };

  return <JsonLdScript data={data} />;
}

interface FishSpeciesJsonLdProps {
  name: string;
  scientificName?: string;
  description?: string;
  image?: string;
  url: string;
}

/**
 * Fish Species structured data (Findr-specific)
 * Uses schema.org/Thing or schema.org/Taxon for species pages
 */
export function FishSpeciesJsonLd({
  name,
  scientificName,
  description,
  image,
  url,
}: FishSpeciesJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Thing', // Could use 'Taxon' for more specific biological classification
    name: name,
    alternateName: scientificName,
    description: description,
    image: image,
    url: url.startsWith('http') ? url : `https://fishfindr.eu${url}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Findr',
      url: 'https://fishfindr.eu',
    },
  };

  return <JsonLdScript data={data} />;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQJsonLdProps {
  items: FAQItem[];
}

/**
 * FAQ structured data
 * Enables FAQ rich snippets in search results
 */
export function FAQJsonLd({ items }: FAQJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return <JsonLdScript data={data} />;
}

const JsonLdComponents = {
  OrganizationJsonLd,
  WebsiteJsonLd,
  BreadcrumbJsonLd,
  SoftwareApplicationJsonLd,
  ArticleJsonLd,
  FishSpeciesJsonLd,
  FAQJsonLd,
};

export default JsonLdComponents;
