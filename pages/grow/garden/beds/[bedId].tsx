import React from 'react';
import Head from 'next/head';
import { BedDetailPage } from '@/components/grow/BedDetailPage';
import { GrowLayout } from '@/components/grow/GrowLayout';

export default function GrowBedPage() {
  return (
    <GrowLayout>
      <Head>
        <title>Garden Bed - Grow Daisy</title>
        <meta name="description" content="View and manage plants in your garden bed." />
      </Head>
      <main className="container mx-auto px-4 py-8">
        <BedDetailPage />
      </main>
    </GrowLayout>
  );
}
