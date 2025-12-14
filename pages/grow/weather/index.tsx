import React from 'react';
import Head from 'next/head';
import { WeatherPage } from '@/components/grow/WeatherPage';
import { GrowLayout } from '@/components/grow/GrowLayout';

export default function GrowWeatherPage() {
  return (
    <GrowLayout>
      <Head>
        <title>Garden Weather Conditions - Grow Daisy</title>
        <meta
          name="description"
          content="Track weather conditions for your garden including temperature, precipitation, frost warnings, and optimal gardening windows for your location."
        />
        <meta name="keywords" content="garden weather, frost warnings, precipitation forecast, growing conditions, soil temperature" />

        {/* Open Graph */}
        <meta property="og:title" content="Garden Weather Conditions - Grow Daisy" />
        <meta property="og:description" content="Track weather conditions and optimal gardening windows for your location." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://godaisy.io/grow/weather" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Garden Weather Conditions - Grow Daisy" />
        <meta name="twitter:description" content="Track weather conditions and optimal gardening windows for your location." />

        <link rel="canonical" href="https://godaisy.io/grow/weather" />
      </Head>
      <main className="container mx-auto px-4 py-8">
        <WeatherPage />
      </main>
    </GrowLayout>
  );
}
