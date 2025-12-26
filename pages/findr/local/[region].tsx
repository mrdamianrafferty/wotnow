import React from 'react';
import { GetServerSideProps } from 'next';
import SEO from '../../../../components/SEO';

interface Props {
  region: string;
  headline?: string | null;
  summary?: string | null;
}

const LocalLanding: React.FC<Props> = ({ region, headline, summary }) => {
  const title = `Findr — ${region} Fishing & Local Tips | Catch Guide`;

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Where are the best places to fish in ${region}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Coastal inshore zones and sheltered bays near ${region} are typically productive. Check local tide times and recent conditions.`,
        },
      },
      {
        '@type': 'Question',
        name: `When is the best time to fish around ${region}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Early morning and late afternoon around high tide are often best; species and seasonality vary — see species pages for specifics.`,
        },
      },
    ],
  };

  return (
    <>
      <SEO title={title} description={summary || `Local fishing guide and quick answers for ${region}.`} url={`https://fishfindr.eu/findr/local/${encodeURIComponent(region)}`} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />

      <main className="min-h-screen p-6 bg-base-200">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold">{headline || `Fishing around ${region}`}</h1>
          <p className="mt-3 text-base-content/80">{summary || `Quick local guidance for anglers fishing in ${region}. This page prioritises the answer-first content users and search engines prefer.`}</p>

          <section className="mt-6">
            <h2 className="text-xl font-semibold">Quick Answer</h2>
            <p className="mt-2">Expect the best results around structure (harbours, rocky points and inlets). Target species vary by season — visit species pages for targeted tips.</p>
          </section>

          <section className="mt-6">
            <h3 className="text-lg font-medium">What to bring</h3>
            <ul className="list-disc pl-5 mt-2">
              <li>Light spinning gear or bait rigs</li>
              <li>Small fish/crustacean baits</li>
              <li>Tide chart and safety kit</li>
            </ul>
          </section>

          <section className="mt-6">
            <h3 className="text-lg font-medium">Local species to look for</h3>
            <p className="mt-2">This page links to local species pages (example: seabass, mackerel, cod) with focused advice and bait choices.</p>
          </section>

        </div>
      </main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const region = Array.isArray(context.params?.region) ? context.params?.region[0] : context.params?.region;
  if (!region || typeof region !== 'string') return { notFound: true };

  // Example: server-side could fetch region summary, top species, and local rectangles.
  // For this template we keep content minimal and SEO-focused.
  const headline = `Local fishing in ${region}`;
  const summary = `Findr local guide for ${region} — best spots, species, tides and bait recommendations.`;

  return { props: { region, headline, summary } };
};

export default LocalLanding;
