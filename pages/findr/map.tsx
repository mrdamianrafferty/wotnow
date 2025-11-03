// pages/findr/map.tsx
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useUnifiedLocation } from '@/context/UnifiedLocationContext';

// Dynamically import the map component with no SSR
const DynamicMap = dynamic(() => import('../../components/findr/FullScreenMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-base-200">
      <div className="text-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
        <p className="mt-4 text-base-content/70">Loading map...</p>
      </div>
    </div>
  ),
});

export default function FullScreenMapPage() {
  const router = useRouter();
  const { activeLocation, findrLocation } = useUnifiedLocation();

  const userLocation = findrLocation || activeLocation;
  const initialLat = router.query.lat ? parseFloat(router.query.lat as string) : userLocation?.lat || 43.5;
  const initialLon = router.query.lon ? parseFloat(router.query.lon as string) : userLocation?.lon || -5.5;
  const initialZoom = router.query.zoom ? parseInt(router.query.zoom as string) : 8;
  const initialLayer = (router.query.layer as 'clear' | 'depth' | 'seabed') || 'depth';

  return (
    <DynamicMap
      initialLat={initialLat}
      initialLon={initialLon}
      initialZoom={initialZoom}
      initialLayer={initialLayer}
    />
  );
}

// SSR disabled via dynamic import, but add this for clarity
export async function getServerSideProps() {
  return { props: {} };
}
