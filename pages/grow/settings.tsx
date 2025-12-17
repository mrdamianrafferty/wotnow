import Head from 'next/head';
import { GrowLayout } from '../../components/grow/GrowLayout';
import { SettingsPage } from '../../components/grow/SettingsPage';

export default function GrowSettingsRoute() {
  return (
    <>
      <Head>
        <title>Settings | Grow Daisy</title>
        <meta name="description" content="Manage your garden profile, location, and preferences" />
      </Head>
      <GrowLayout title="Settings">
        <div className="container mx-auto px-4 py-6">
          <SettingsPage />
        </div>
      </GrowLayout>
    </>
  );
}
