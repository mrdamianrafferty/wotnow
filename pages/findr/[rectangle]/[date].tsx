import React from 'react';
import { GetServerSideProps } from 'next';
import SEO from '../../../components/SEO';

interface PredictionSummary {
  id?: string;
  commonName?: string;
  scientificName?: string;
  confidence?: number | null;
  biteScore?: number | null;
  summary?: string | null;
}

interface Props {
  rectangle: string;
  date: string;
  topPrediction?: PredictionSummary | null;
  lastUpdated?: string | null;
}

const RectangleDatePage: React.FC<Props> = ({ rectangle, date, topPrediction, lastUpdated }) => {
  const jsonLd = topPrediction
    ? {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "headline": `${topPrediction.commonName} — ${rectangle} on ${date}`,
        "datePublished": date,
        "dateModified": lastUpdated || date,
        "mainEntity": {
          "@type": "Thing",
          "name": topPrediction.commonName,
          "description": topPrediction.summary || '',
        },
      }
    : null;

  return (
    <>
      <SEO
        title={`Findr — ${rectangle} on ${date}`}
        description={`Fishing predictions for rectangle ${rectangle} on ${date}. View bite scores, species recommendations and timing tips.`}
        url={`https://fishfindr.eu/findr/${rectangle}/${date}`}
      />
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <main className="min-h-screen bg-base-200 p-6">
        <h1 className="text-2xl font-bold">{`Predictions for ${rectangle} — ${date}`}</h1>

        {topPrediction ? (
          <article className="mt-4 card bg-base-100 p-4">
            <h2 className="card-title text-xl">
              {topPrediction.commonName}
              {topPrediction.scientificName && (
                <span className="text-sm italic font-normal ml-2">({topPrediction.scientificName})</span>
              )}
            </h2>
            <p className="text-sm text-base-content/70 mt-2">{topPrediction.summary}</p>
            <div className="mt-3 flex items-center gap-3">
              {typeof topPrediction.confidence === 'number' && (
                <span className="badge badge-outline">{topPrediction.confidence}% confidence</span>
              )}
              {typeof topPrediction.biteScore === 'number' && (
                <span className="badge badge-success">Bite score: {topPrediction.biteScore}</span>
              )}
            </div>
          </article>
        ) : (
          <p className="mt-4 text-base-content/70">No predictions available for this rectangle and date.</p>
        )}

        <p className="mt-6 text-xs text-base-content/60">This page is server-rendered to improve SEO and shareability.</p>
      </main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { rectangle, date } = context.params ?? {};
  if (!rectangle || !date || typeof rectangle !== 'string' || typeof date !== 'string') {
    return { notFound: true };
  }

  // Basic validation: date should be YYYY-MM-DD
  const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(date);
  if (!dateMatch) {
    return { notFound: true };
  }

  // Fetch top prediction server-side by calling internal API endpoint
  const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  try {
    const apiRes = await fetch(`${siteUrl}/api/findr/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rectangleCode: rectangle, predictionDate: date, language: 'en' }),
    });

    if (!apiRes.ok) {
      console.warn('[SSR] Predictions API returned', apiRes.status);
      return { props: { rectangle, date, topPrediction: null, lastUpdated: null } };
    }

    const data = await apiRes.json();
    const top = Array.isArray(data.predictions) && data.predictions.length > 0 ? data.predictions[0] : null;

    const topPrediction = top
      ? {
          id: top.id ?? top.species_id ?? top.species_code ?? null,
          commonName: top.common_name || top.species_common_name || top.name_en || null,
          scientificName: top.scientific_name || null,
          confidence: top.confidence ?? top.confidence_percent ?? null,
          biteScore: top.bite_score ?? null,
          summary: top.summary ?? top.playful_bio ?? null,
        }
      : null;

    return { props: { rectangle, date, topPrediction, lastUpdated: data.metadata?.requestedAt ?? null } };
  } catch (err) {
    console.error('[SSR] Failed to fetch predictions for SSR:', err);
    return { props: { rectangle, date, topPrediction: null, lastUpdated: null } };
  }
};

export default RectangleDatePage;
