import React from 'react';
import Head from 'next/head';
import { GrowExperience } from '@/components/grow/GrowExperience';

export default function GrowPage() {
  return (
    <>
      <Head>
        <title>Grow Daisy - Smart Garden Planning & Task Management</title>
        <meta
          name="description"
          content="Plan your garden with weather-based task recommendations. Get personalized planting calendars, care reminders, and optimal timing for your growing zone."
        />
        <meta name="keywords" content="garden planning, planting calendar, growing zone, gardening tasks, weather-based gardening, smart garden" />

        {/* Open Graph */}
        <meta property="og:title" content="Grow Daisy - Smart Garden Planning" />
        <meta property="og:description" content="Plan your garden with weather-based task recommendations and personalized planting calendars." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://godaisy.io/grow" />
        <meta property="og:image" content="https://godaisy.io/og-grow.png" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Grow Daisy - Smart Garden Planning" />
        <meta name="twitter:description" content="Plan your garden with weather-based task recommendations and personalized planting calendars." />
        <meta name="twitter:image" content="https://godaisy.io/og-grow.png" />

        <link rel="canonical" href="https://godaisy.io/grow" />
      </Head>
      <GrowExperience />
    </>
  );
}
