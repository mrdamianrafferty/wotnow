import React from 'react';
import { GetServerSideProps } from 'next';
import SEO from '../../../components/SEO';

interface BaitItem {
  bait_name?: string;
}

interface TechniqueItem {
  technique_name?: string;
  technique_code?: string;
  technique?: { name_en?: string };
}

interface AdviceData {
  shore?: { regions?: string };
  [key: string]: unknown;
}

interface SpeciesDetails {
  species_id: string;
  species_code: string;
  name_en: string;
  scientific_name?: string | null;
  fun_fact?: string | null;
  advice?: AdviceData | null;
  techniques?: TechniqueItem[];
  bait?: BaitItem[];
  seasonalityCurve?: { peak_months?: number[]; good_months?: number[] } | null;
}

interface Props {
  slug: string;
  species?: SpeciesDetails | null;
}

const SpeciesPage: React.FC<Props> = ({ slug, species }) => {
  const title = species ? `${species.name_en} — Where & When to Catch | Findr` : `Species — Findr`;

  const faqLd = species
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': `Where can I catch ${species.name_en}?`,
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': species.advice?.shore?.regions || `Coastal areas where ${species.name_en} are present.`,
            },
          },
          {
            '@type': 'Question',
            'name': `What bait works best for ${species.name_en}?`,
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': (species.bait && species.bait.length > 0) ? species.bait.map(b=>b.bait_name).slice(0,3).join(', ') : 'Natural baits like small fish and crustaceans.',
            },
          },
        ],
      }
    : null;

  return (
    <>
      <SEO title={title} description={species ? `Quick fishing advice for ${species.name_en}. Where to fish, when, and what bait to use.` : 'Species information on Findr.'} url={`https://fishfindr.eu/findr/species/${slug}`} />

      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      <main className="min-h-screen p-6 bg-base-200">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold">{species ? species.name_en : 'Species'}</h1>
          {species?.scientific_name && <p className="italic text-sm">{species.scientific_name}</p>}

          <section className="mt-4">
            <h2 className="text-xl font-semibold">Quick answer</h2>
            <p className="mt-2 text-base-content/80">
              {species
                ? `Best fished in coastal/nearshore areas during ${species.seasonalityCurve?.peak_months?.length ? 'peak months' : 'seasonal peaks'}. Use ${species.bait && species.bait.length ? species.bait[0].bait_name : 'natural baits'} and prefer shore/boat tactics listed below.`
                : 'Species information not found.'}
            </p>
          </section>

          {species && (
            <section className="mt-6">
              <h3 className="text-lg font-medium">How to fish for {species.name_en}</h3>
              <div className="mt-3 prose">
                {species.fun_fact && <p>{species.fun_fact}</p>}
                <h4>Top techniques</h4>
                <ul>
                  {species.techniques && species.techniques.length > 0 ? (
                    species.techniques.slice(0,5).map((t, i) => <li key={i}>{t.technique_name || t.technique?.name_en || t.technique_code}</li>)
                  ) : (
                    <li>Standard shore/boat bait presentation</li>
                  )}
                </ul>

                <h4 className="mt-3">Recommended bait</h4>
                <p>{species.bait && species.bait.length ? species.bait.map(b=>b.bait_name).slice(0,5).join(', ') : 'Small fish, crabs or natural bait'}</p>
              </div>
            </section>
          )}

        </div>
      </main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const slug = Array.isArray(context.params?.slug) ? context.params?.slug[0] : context.params?.slug;
  if (!slug || typeof slug !== 'string') return { notFound: true };

  const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    const res = await fetch(`${siteUrl}/api/findr/species-details?species_code=${encodeURIComponent(slug)}`);
    if (!res.ok) {
      return { props: { slug, species: null } };
    }
    const species = await res.json();
    return { props: { slug, species } };
  } catch (err) {
    console.error('[species page] fetch error', err);
    return { props: { slug, species: null } };
  }
};

export default SpeciesPage;
