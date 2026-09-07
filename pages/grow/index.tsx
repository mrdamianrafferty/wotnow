import React from 'react';
import Head from 'next/head';
import { GrowExperience } from '@/components/grow/GrowExperience';

export default function GrowPage() {
  return (
    <>
      <Head>
        <title>Grow Daisy — Smart Garden Planner for UK Gardeners</title>
        <meta
          name="description"
          content="UK garden planner with RHS hardiness ratings, postcode-aware frost dates, and weather-driven tasks for your allotment, veg patch, or kitchen garden."
        />
        <meta name="keywords" content="garden planner UK, vegetable garden planner, allotment planner, RHS hardiness, planting calendar UK, when to plant, frost dates UK, companion planting, kitchen garden, veg patch" />

        {/* Open Graph */}
        <meta property="og:title" content="Grow Daisy — Smart Garden Planner for UK Gardeners" />
        <meta property="og:description" content="UK garden planner with RHS hardiness ratings, postcode-aware frost dates, and weather-driven tasks for your allotment, veg patch, or kitchen garden." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://grow.godaisy.io/grow" />
        {/*
          * `og-grow.png` did not exist until 7 Sep 2026. It was referenced here
          * and by the twitter:image below, and returned 404, so every share of
          * this page rendered as a bare grey link. It is generated now by
          * `scripts/generate-og-grow.ts` — six species tiles beside the
          * tagline — and the dimensions are declared so a scraper can reserve
          * the card's space before the image lands rather than falling back to
          * no card when it times out.
          */}
        <meta property="og:image" content="https://grow.godaisy.io/og-grow.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Grow Daisy — what to plant, and when" />
        <meta property="og:site_name" content="Grow Daisy" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Grow Daisy — Smart Garden Planner for UK Gardeners" />
        <meta name="twitter:description" content="UK garden planner with RHS hardiness ratings, postcode-aware frost dates, and weather-driven tasks for your allotment, veg patch, or kitchen garden." />
        <meta name="twitter:image" content="https://grow.godaisy.io/og-grow.png" />
        <meta name="twitter:image:alt" content="Grow Daisy — what to plant, and when" />

        <link rel="canonical" href="https://grow.godaisy.io/grow" />
      </Head>
      <GrowExperience />
    </>
  );
}
