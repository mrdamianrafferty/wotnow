import React from 'react';
import Head from 'next/head';
import { ActivitiesPage } from '@/components/grow/ActivitiesPage';
import { GrowLayout } from '@/components/grow/GrowLayout';

export default function GrowActivitiesPage() {
  return (
    <GrowLayout title="Activities">
      <Head>
        <title>Garden Activities - Grow Daisy</title>
        <meta
          name="description"
          content="Track and manage your garden activities, tasks, and accomplishments."
        />
        <link rel="canonical" href="https://godaisy.io/grow/activities" />
      </Head>
      <main className="container mx-auto px-4 py-8">
        <ActivitiesPage userInterests={null} />
      </main>
    </GrowLayout>
  );
}
