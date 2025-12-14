import React from 'react';
import Head from 'next/head';
import { GardenPage } from '@/components/grow/GardenPage';
import { GrowLayout } from '@/components/grow/GrowLayout';

export default function GrowGardenPage() {
  return (
    <GrowLayout>
      <Head>
        <title>My Garden - Grow Daisy</title>
        <meta
          name="description"
          content="Manage your garden plants, track growth, and get personalized care recommendations based on your growing zone and weather conditions."
        />
        <meta name="keywords" content="garden management, plant tracking, companion planting, growing zone, plant care" />

        {/* Open Graph */}
        <meta property="og:title" content="My Garden - Grow Daisy" />
        <meta property="og:description" content="Manage your garden plants and get personalized care recommendations." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://godaisy.io/grow/garden" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="My Garden - Grow Daisy" />
        <meta name="twitter:description" content="Manage your garden plants and get personalized care recommendations." />

        <link rel="canonical" href="https://godaisy.io/grow/garden" />
      </Head>
      <main className="container mx-auto px-4 py-8">
        <GardenPage />
      </main>
    </GrowLayout>
  );
}
