import Head from 'next/head';
import { GrowLayout } from '../../components/grow/GrowLayout';
import { InfoPage } from '../../components/grow/InfoPage';

export default function GrowInfoRoute() {
  return (
    <>
      <Head>
        <title>Info & Help | Grow Daisy</title>
        <meta name="description" content="Gardening guides, tips, and helpful information" />
      </Head>
      <GrowLayout title="Info">
        <div className="container mx-auto px-4 py-6">
          <InfoPage />
        </div>
      </GrowLayout>
    </>
  );
}
