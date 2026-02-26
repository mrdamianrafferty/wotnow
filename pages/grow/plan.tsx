import Head from 'next/head';
import { GrowLayout } from '../../components/grow/GrowLayout';
import { PlanPage } from '../../components/grow/PlanPage';

export default function GrowPlanRoute() {
  return (
    <>
      <Head>
        <title>Planting Plan | Grow Daisy</title>
        <meta name="description" content="Weekly planting calendar and garden task planner personalised to your climate zone" />
      </Head>
      <GrowLayout title="Plan">
        <div className="container mx-auto px-4 py-6">
          <PlanPage />
        </div>
      </GrowLayout>
    </>
  );
}
