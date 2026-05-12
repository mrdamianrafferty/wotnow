/**
 * Localised Grow Daisy species page.
 * URL: /grow/[lang]/species/[slug] (e.g. /grow/fr/species/tomato)
 *
 * The English version at /grow/species/[slug] is the canonical URL; this
 * page is the translated variant. It fetches the same data as the English
 * page, translates the title, description, and advice via DeepL (cached),
 * and renders hreflang tags to all language variants.
 *
 * Content (howto_steps, faqs) is populated by Cowork's CSV/SQL workflow.
 * This route renders gracefully when those columns are null.
 */

import React from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { GrowLayout } from '@/components/grow/GrowLayout';
import { HreflangLinks } from '@/components/HreflangLinks';
import {
  ArticleJsonLd,
  BreadcrumbJsonLd,
  FAQJsonLd,
  HowToJsonLd,
  PlantJsonLd,
} from '@/components/JsonLd';
import { isValidGrowLang, type GrowPathCode } from '@/lib/grow/i18n';
import { getSupabaseServerClient } from '@/lib/supabase/serverClient';
import { serializePlantSpecies, type PlantSpeciesRow } from '@/lib/grow/species';
import type { PlantSpecies } from '@/lib/grow/species';

// We import autoTranslate dynamically so Next.js doesn't bundle it on the client.
// It throws if called client-side, so we keep it behind a server-side guard.
async function translateText(text: string | null, lang: string): Promise<string | null> {
  if (!text || lang === 'en') return text;
  try {
    const { autoTranslate } = await import('@/lib/translation/autoTranslate');
    return await autoTranslate(text, lang);
  } catch {
    return text; // Graceful fallback — return English if DeepL unavailable
  }
}

type LocalisedSpeciesProps = {
  species: PlantSpecies;
  lang: GrowPathCode;
  translatedName: string;
  translatedDescription: string | null;
  translatedAdvice: string | null;
};

export const getServerSideProps: GetServerSideProps<LocalisedSpeciesProps> = async (ctx) => {
  const { lang, slug } = ctx.params as { lang: string; slug: string };

  if (!isValidGrowLang(lang) || lang === 'en') {
    return { notFound: true };
  }

  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('plant_species')
    .select(
      [
        'slug', 'name', 'scientific_name', 'description', 'advice',
        'category', 'sun_requirements', 'soil_type', 'plant_size',
        'usda_zone_min', 'usda_zone_max', 'image_key', 'name_en_aliases',
        'search_terms', 'perenual_id', 'perenual_family', 'perenual_other_names',
        'growth_rate', 'maintenance', 'watering', 'watering_general_benchmark',
        'watering_period', 'drought_tolerant', 'salt_tolerant', 'thorny',
        'invasive', 'tropical', 'indoor', 'care_level', 'dimension', 'dimensions',
        'average_height_cm', 'maximum_height_cm', 'average_spread_cm', 'maximum_spread_cm',
        'sunlight', 'soil', 'hardiness_min', 'hardiness_max', 'hardiness_location',
        'flowers', 'flowering_season', 'flower_color', 'cones', 'fruits',
        'edible_fruit', 'edible_fruit_taste_profile', 'fruit_nutritional_value',
        'fruit_color', 'harvest_season', 'harvest_method', 'leaf', 'leaf_color',
        'edible_leaf', 'edible_leaf_taste_profile', 'leaf_nutritional_value',
        'cuisine', 'cuisine_list', 'medicinal', 'medicinal_use', 'medicinal_method',
        'poisonous_to_humans', 'poisonous_to_pets', 'poison_effects_to_humans',
        'poison_effects_to_pets', 'poison_to_humans_cure', 'poison_to_pets_cure',
        'attracts', 'pest_susceptibility', 'pest_susceptibility_api',
        'pest_resilience_score', 'pest_resilience_note', 'propagation', 'seeds',
        'perenual_default_image', 'perenual_other_images', 'care_guides',
        'perenual_last_synced_at', 'companions_with', 'companions_avoid',
        'rotation_group', 'days_to_maturity_min', 'days_to_maturity_max',
        'maturity_basis', 'maturity_notes', 'years_to_first_crop',
        'years_to_full_production', 'cropping_timeline_note',
        'rhs_hardiness_min', 'rhs_hardiness_max',
        'howto_steps', 'faqs', 'date_published', 'date_modified',
        'name_fr', 'name_es', 'name_it', 'name_de', 'name_pt', 'name_nl', 'name_pl',
      ].join(', ')
    )
    .eq('slug', slug as string)
    .single();

  if (error || !data) {
    return { notFound: true };
  }

  const species = serializePlantSpecies(data as unknown as PlantSpeciesRow);

  // Prefer DB translations (plant_species.name_fr etc.) before calling DeepL.
  // Many plants already have curated translations in the table.
  const dbName = species.translations[lang as keyof typeof species.translations] ?? null;

  const [translatedName, translatedDescription, translatedAdvice] = await Promise.all([
    dbName ? Promise.resolve(dbName) : translateText(species.name, lang),
    translateText(species.description, lang),
    translateText(species.advice, lang),
  ]);

  return {
    props: {
      species,
      lang: lang as GrowPathCode,
      translatedName: translatedName ?? species.name,
      translatedDescription: translatedDescription,
      translatedAdvice: translatedAdvice,
    },
  };
};

export default function LocalisedSpeciesPage({
  species,
  lang,
  translatedName,
  translatedDescription,
}: LocalisedSpeciesProps) {
  const router = useRouter();
  const enPath = `/grow/species/${species.slug}`;
  const canonicalUrl = `https://grow.godaisy.io${enPath}`;
  const langUrl = `https://grow.godaisy.io/grow/${lang}/species/${species.slug}`;

  const title = `${translatedName} — Grow Daisy`;
  const description = translatedDescription ??
    `${translatedName}${species.scientificName ? ` (${species.scientificName})` : ''}. Care, timing, and what to do now.`;

  return (
    <GrowLayout>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        {/* Canonical always points to the English page */}
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={langUrl} />
        <meta httpEquiv="content-language" content={lang} />
      </Head>

      <HreflangLinks enPath={enPath} />

      {/* JSON-LD — same schema as English page */}
      <BreadcrumbJsonLd
        items={[
          { name: 'Grow Daisy', url: 'https://grow.godaisy.io/grow' },
          { name: 'Plants', url: 'https://grow.godaisy.io/grow/garden' },
          { name: translatedName, url: langUrl },
        ]}
      />
      <ArticleJsonLd
        title={title}
        description={description}
        datePublished={species.datePublished ?? '2024-01-01'}
        dateModified={species.dateModified ?? species.datePublished ?? '2024-01-01'}
        author="Grow Daisy"
        url={langUrl}
      />
      <PlantJsonLd
        name={species.name}
        scientificName={species.scientificName}
        description={species.description}
        url={langUrl}
        rhsHardinessMin={species.rhsHardinessMin}
        rhsHardinessMax={species.rhsHardinessMax}
        sunRequirements={species.sunRequirements}
        soilType={species.soilType}
      />
      {species.howtoSteps && species.howtoSteps.length > 0 && (
        <HowToJsonLd
          name={`How to grow ${translatedName}`}
          steps={species.howtoSteps}
          description={description}
        />
      )}
      {species.faqs && species.faqs.length > 0 && (
        <FAQJsonLd items={species.faqs} />
      )}

      {/* Redirect to the English page for the full interactive experience.
          The localized route exists primarily for search engine indexing.
          In a future iteration, the full species page UI will be rendered here
          with translated content cards. */}
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">{translatedName}</h1>
        {species.scientificName && (
          <p className="text-muted-foreground italic mb-4">{species.scientificName}</p>
        )}
        {translatedDescription && (
          <p className="max-w-prose text-muted-foreground mb-6">{translatedDescription}</p>
        )}
        <a
          href={enPath}
          onClick={(e) => { e.preventDefault(); void router.push(enPath); }}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          View full growing guide →
        </a>
      </div>
    </GrowLayout>
  );
}
