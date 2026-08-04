/**
 * Localised Grow Daisy species directory.
 * URL: /grow/[lang]/species (e.g. /grow/fr/species)
 *
 * The English version at /grow/species is the canonical URL; this page is
 * the translated variant, server-rendering links to the localised species
 * pages (/grow/[lang]/species/[slug]) with hreflang alternates.
 *
 * The directory chrome (heading, search placeholder, category labels) uses
 * curated translations from lib/grow/speciesDirectoryLabels.ts rather than
 * DeepL — for this small, fixed set of UI strings, machine translation
 * mistranslates ambiguous words (e.g. "Plant" as an industrial plant).
 */

import React from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { GrowLayout } from '@/components/grow/GrowLayout';
import { HreflangLinks } from '@/components/HreflangLinks';
import { BreadcrumbJsonLd } from '@/components/JsonLd';
import { isValidGrowLang, type GrowPathCode } from '@/lib/grow/i18n';
import { getSupabaseServerClient } from '@/lib/supabase/serverClient';
import { PLANT_SPECIES_LANGUAGE_FIELDS } from '@/lib/grow/species';
import { getSpeciesDirectoryLabels } from '@/lib/grow/speciesDirectoryLabels';
import { SpeciesDirectoryView, type SpeciesDirectoryEntry } from '@/components/grow/SpeciesDirectoryView';

const LANG_TO_NAME_COLUMN: Partial<Record<GrowPathCode, string>> = Object.fromEntries(
  Object.entries(PLANT_SPECIES_LANGUAGE_FIELDS).map(([column, lang]) => [lang, column])
);

type LocalisedSpeciesDirectoryProps = {
  species: SpeciesDirectoryEntry[];
  lang: GrowPathCode;
};

export const getServerSideProps: GetServerSideProps<LocalisedSpeciesDirectoryProps> = async (ctx) => {
  const { lang } = ctx.params as { lang: string };

  if (!isValidGrowLang(lang) || lang === 'en') {
    return { notFound: true };
  }

  const supabase = getSupabaseServerClient();
  const nameColumn = LANG_TO_NAME_COLUMN[lang as GrowPathCode];
  const select = ['slug', 'name', 'scientific_name', 'category', 'image_key', ...(nameColumn ? [nameColumn] : [])].join(', ');

  const { data, error } = await supabase
    .from('plant_species')
    .select(select)
    .order('name', { ascending: true });

  const species: SpeciesDirectoryEntry[] = error || !data
    ? []
    : (data as unknown as Record<string, unknown>[]).map((row) => ({
        slug: row.slug as string,
        name: (nameColumn ? (row[nameColumn] as string | null) : null) ?? (row.name as string),
        scientificName: (row.scientific_name as string | null) ?? null,
        category: (row.category as string | null) ?? null,
        imageKey: (row.image_key as string | null) ?? null,
      }));

  return {
    props: {
      species,
      lang: lang as GrowPathCode,
    },
  };
};

export default function LocalisedSpeciesDirectoryPage({ species, lang }: LocalisedSpeciesDirectoryProps) {
  const labels = getSpeciesDirectoryLabels(lang);
  const enPath = '/grow/species';
  const canonicalUrl = `https://grow.godaisy.io${enPath}`;
  const langUrl = `https://grow.godaisy.io/grow/${lang}/species`;
  const title = `${labels.heading} — Grow Daisy`;
  const description = labels.intro(species.length);

  return (
    <GrowLayout title={labels.heading}>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        {/* Canonical always points to the English directory */}
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={langUrl} />
        <meta httpEquiv="content-language" content={lang} />
      </Head>

      <HreflangLinks enPath={enPath} />

      <BreadcrumbJsonLd
        items={[
          { name: 'Grow Daisy', url: 'https://grow.godaisy.io/grow' },
          { name: labels.heading, url: langUrl },
        ]}
      />

      <SpeciesDirectoryView species={species} basePath={`/grow/${lang}/species`} labels={labels} />
    </GrowLayout>
  );
}
