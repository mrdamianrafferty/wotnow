import React from 'react';
import Head from 'next/head';
import { PlanPage } from '@/components/grow/PlanPage';
import { GrowLayout } from '@/components/grow/GrowLayout';

export default function GrowPlanPage() {
  return (
    <GrowLayout>
      <Head>
        <title>Garden Planning Calendar - Grow Daisy</title>
        <meta
          name="description"
          content="View your personalized planting calendar, track seasonal tasks, and plan your garden timeline based on your growing zone and frost dates."
        />
        <meta name="keywords" content="planting calendar, garden timeline, frost dates, seasonal planting, growing schedule" />

        {/* Open Graph */}
        <meta property="og:title" content="Garden Planning Calendar - Grow Daisy" />
        <meta property="og:description" content="View your personalized planting calendar and seasonal garden timeline." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://grow.godaisy.io/grow/plan" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Garden Planning Calendar - Grow Daisy" />
        <meta name="twitter:description" content="View your personalized planting calendar and seasonal garden timeline." />

        <link rel="canonical" href="https://grow.godaisy.io/grow/plan" />
      </Head>
      <main className="container mx-auto px-4 py-8">
        <PlanPage />
      </main>
    </GrowLayout>
  );
}
