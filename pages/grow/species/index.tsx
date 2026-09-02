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

/** Empty directory, retried soon. The degraded path, used when the data is
 *  unreachable at build time — never a reason to fail the build. */
const EMPTY_WITH_RETRY: { props: SpeciesDirectoryProps; revalidate: number } = {
  props: { species: [] },
  revalidate: 300,
};

export const getStaticProps: GetStaticProps<SpeciesDirectoryProps> = async () => {
  // The `error || !data` branch below was written to degrade gracefully when
  // the directory could not be loaded — but it could never run in the case it
  // was written for. getSupabaseServerClient() THROWS on absent credentials,
  // and that throw happens a line earlier, so the whole build died here with
  // "Export encountered an error on /grow/species, exiting the build".
  //
  // This is the only page in pages/ that queries Supabase from getStaticProps
  // (every sibling species route already uses getServerSideProps), so it alone
  // decided whether a credential-less build succeeded — and CI Build had
  // therefore never passed on any branch.
  //
  // Deliberately still SSG + ISR rather than getServerSideProps: Vercel's
  // build DOES have the credentials, so production continues to prerender the
  // full directory with real data and serve it from cache. Only a build
  // without credentials degrades, and it now degrades to an empty page that
  // repopulates on the next revalidation instead of a failed build. Moving to
  // per-request SSR would have traded that away for a query against a
  // 50k-row table on every hit.
  try {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('plant_species')
      .select('slug, name, scientific_name, category, image_key')
      .order('name', { ascending: true });

    if (error || !data) {
      return EMPTY_WITH_RETRY;
    }

    const species: SpeciesDirectoryEntry[] = data.map((row) => ({
      slug: row.slug,
      name: row.name,
      scientificName: row.scientific_name ?? null,
      category: row.category ?? null,
      imageKey: row.image_key ?? null,
    }));

    return { props: { species }, revalidate: 3600 };
  } catch (err) {
    // Loud, because a production build reaching this means the directory
    // shipped empty and someone needs to know why.
    console.warn(
      '[grow/species] Could not load the plant directory at build time; ' +
      'serving an empty directory that will retry in 300s.',
      err instanceof Error ? err.message : err
    );
    return EMPTY_WITH_RETRY;
  }
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
