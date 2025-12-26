import React from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import SEO from '../../../components/SEO';
import { getSupabaseServerClient } from '../../../lib/supabase/serverClient';

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

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const supabase = getSupabaseServerClient();
    const { data: speciesList, error } = await supabase.from('species').select('slug').limit(1000);
    if (error || !speciesList) {
      console.warn('[getStaticPaths] Failed to fetch species list', error?.message || error);
      return { paths: [], fallback: 'blocking' };
    }

    const paths = (speciesList as Array<any>)
      .filter((s) => s?.slug)
      .map((s) => ({ params: { slug: s.slug } }));

    return { paths, fallback: 'blocking' };
  } catch (err) {
    console.error('[getStaticPaths] Unexpected error', err);
    return { paths: [], fallback: 'blocking' };
  }
};

export const getStaticProps: GetStaticProps = async (context) => {
  const slug = Array.isArray(context.params?.slug) ? context.params?.slug[0] : context.params?.slug;
  if (!slug || typeof slug !== 'string') return { notFound: true };

  try {
    const supabase = getSupabaseServerClient();

    const { data: speciesData, error: speciesError } = await supabase
      .from('species')
      .select(
        `id, species_code, name_en, scientific_name, inaturalist_url, advice, eating_quality, conservation_status, fun_fact, min_depth, max_depth, guild, species_badges, recommended_baits, temp_opt_c, seasonality_profile, is_seasonal, peak_months, good_months, possible_months`
      )
      .eq('slug', slug)
      .maybeSingle();

    if (speciesError || !speciesData) {
      console.warn('[getStaticProps] Species not found for slug', slug, speciesError?.message || speciesError);
      return { props: { slug, species: null }, revalidate: 3600 };
    }

    const speciesId = (speciesData as any).id;

    const [{ data: techniquesData }, { data: baitData }, { data: substratesData }] = await Promise.all([
      supabase
        .from('species_technique')
        .select(`technique_id,effectiveness,notes,beginner_tips,technique!inner(id,technique_code,name_en)`)
        .eq('species_id', speciesId)
        .order('effectiveness', { ascending: false }),
      supabase
        .from('species_bait')
        .select(`bait_id,effectiveness,notes,bait!inner(id,name_en)`)
        .eq('species_id', speciesId)
        .order('effectiveness', { ascending: false }),
      supabase
        .from('species_substrates')
        .select('name_en,has_sand,has_gravel,has_rock,has_mud,has_mixed')
        .eq('id', speciesId)
        .maybeSingle(),
    ]);

    const species = {
      ...speciesData,
      techniques: Array.isArray(techniquesData) ? techniquesData.map((t: any) => ({
        technique_name: t?.technique?.name_en || t?.technique_name,
        technique_code: t?.technique?.technique_code || null,
      })) : [],
      bait: Array.isArray(baitData) ? baitData.map((b: any) => ({ bait_name: b?.bait?.name_en || null })) : [],
      substrates: substratesData || null,
    };

    return { props: { slug, species }, revalidate: 3600 };
  } catch (err) {
    console.error('[getStaticProps] Unexpected error', err);
    return { props: { slug, species: null }, revalidate: 3600 };
  }
};

export default SpeciesPage;
