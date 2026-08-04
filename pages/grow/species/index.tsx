import React from 'react';
import type { GetStaticProps } from 'next';
import Head from 'next/head';
import { GrowLayout } from '@/components/grow/GrowLayout';
import { HreflangLinks } from '@/components/HreflangLinks';
import { BreadcrumbJsonLd } from '@/components/JsonLd';
import { getSupabaseServerClient } from '@/lib/supabase/serverClient';
import { SpeciesDirectoryView, type SpeciesDirectoryEntry } from '@/components/grow/SpeciesDirectoryView';

type SpeciesDirectoryProps = {
  species: SpeciesDirectoryEntry[];
};

export const getStaticProps: GetStaticProps<SpeciesDirectoryProps> = async () => {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('plant_species')
    .select('slug, name, scientific_name, category, image_key')
    .order('name', { ascending: true });

  if (error || !data) {
    return { props: { species: [] }, revalidate: 300 };
  }

  const species: SpeciesDirectoryEntry[] = data.map((row) => ({
    slug: row.slug,
    name: row.name,
    scientificName: row.scientific_name ?? null,
    category: row.category ?? null,
    imageKey: row.image_key ?? null,
  }));

  return { props: { species }, revalidate: 3600 };
};

export default function SpeciesDirectoryPage({ species }: SpeciesDirectoryProps) {
  const canonicalUrl = 'https://grow.godaisy.io/grow/species';
  const title = 'Plant Directory — Browse All Species | Grow Daisy';
  const description = `Browse all ${species.length} plants in the Grow Daisy database — vegetables, herbs, fruit, trees, shrubs and ornamentals, with growing advice for each.`;

  const breadcrumbs = [
    { label: 'Grow', href: '/grow' },
    { label: 'Plants' },
  ];

  return (
    <GrowLayout title="Plant Directory" breadcrumbs={breadcrumbs}>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
      </Head>

      <HreflangLinks enPath="/grow/species" />

      <BreadcrumbJsonLd
        items={[
          { name: 'Grow Daisy', url: 'https://grow.godaisy.io/grow' },
          { name: 'Plants', url: canonicalUrl },
        ]}
      />

      <SpeciesDirectoryView species={species} basePath="/grow/species" />
    </GrowLayout>
  );
}
