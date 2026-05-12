import React from 'react';
import Head from 'next/head';
import { GrowExperience } from '@/components/grow/GrowExperience';

export default function GrowPage() {
  return (
    <>
      <Head>
        <title>Grow Daisy - UK Garden Planner & Planting Calendar</title>
        <meta
          name="description"
          content="UK garden planner with personalised planting calendar, frost date alerts, and weather-aware tasks. Know exactly when to sow, plant, and harvest for your location."
        />
        <meta name="keywords" content="garden planner, planting calendar, UK gardening, when to plant, frost dates, weather-based gardening, smart garden" />

        {/* Open Graph */}
        <meta property="og:title" content="Grow Daisy - UK Garden Planner" />
        <meta property="og:description" content="Personalised planting calendar, frost alerts, and weather-aware tasks for UK gardeners." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://grow.godaisy.io/grow" />
        <meta property="og:image" content="https://grow.godaisy.io/og-grow.png" />
        <meta property="og:site_name" content="Grow Daisy" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Grow Daisy - UK Garden Planner" />
        <meta name="twitter:description" content="Personalised planting calendar, frost alerts, and weather-aware tasks for UK gardeners." />
        <meta name="twitter:image" content="https://grow.godaisy.io/og-grow.png" />

        <link rel="canonical" href="https://grow.godaisy.io/grow" />
      </Head>
      <GrowExperience />
    </>
  );
}
