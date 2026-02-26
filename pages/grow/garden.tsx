import Head from 'next/head';
import { GrowLayout } from '../../components/grow/GrowLayout';
import { GardenPage } from '../../components/grow/GardenPage';

export default function GrowGardenRoute() {
  return (
    <>
      <Head>
        <title>My Garden | Grow Daisy</title>
        <meta name="description" content="Manage your garden plants, guilds, and growing spaces" />
      </Head>
      <GrowLayout title="Garden">
        <div className="container mx-auto px-4 py-6">
          <GardenPage />
        </div>
      </GrowLayout>
    </>
  );
}
