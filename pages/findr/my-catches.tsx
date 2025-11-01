/**
 * My Trophy Gallery Page
 *
 * Displays user's catch photos in a gallery format with carousel viewer.
 * Uses stock species photos as fallback when user hasn't uploaded a photo.
 */

import { useState, useMemo } from 'react';
import Head from 'next/head';
import { Camera, Upload, Info, ClipboardList, Fish, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { TrophyPhotoCarousel, PhotoGalleryGrid, type PhotoData } from '@/components/findr/TrophyPhotoCarousel';
import { useMyCatchPhotos } from '@/hooks/useMyCatchPhotos';
import { useAuth } from '@/context/AuthContext';
import { TranslatedText } from '@/components/translation/TranslatedFishCard';
import { FindrNavigation } from '@/components/findr/FindrNavigationMobile';
import { BadgeShowcase } from '@/components/findr/BadgeShowcase';
import { MemberStatus } from '@/components/findr/MemberStatus';

export default function MyCatchesPage() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useMyCatchPhotos();
  const photosRaw = data?.photos || [];
  const sessions = data?.sessions || [];
  const [_pinning, setPinning] = useState<string | null>(null);

  // Sort: pinned photos first, then by caught_at descending (if available)
  const photos = [...photosRaw].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    // fallback: sort by caught_at if available in metadata
    const aDate = a.metadata?.date ? new Date(a.metadata.date).getTime() : 0;
    const bDate = b.metadata?.date ? new Date(b.metadata.date).getTime() : 0;
    return bDate - aDate;
  });

  // Pin/unpin handler
  async function handlePinToggle(photo: PhotoData, _index: number) {
    if (!user) return;
    setPinning(photo.id);
    try {
      // Find catch id (strip -default or -assetIndex from the end)
      // Photo IDs are in format: {uuid}-{assetIndex} or {uuid}-default
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (contains 4 dashes)
      // So we need to remove only the LAST segment after the LAST dash
      const lastDashIndex = photo.id.lastIndexOf('-');
      const catchId = lastDashIndex > 0 ? photo.id.substring(0, lastDashIndex) : photo.id;
      const newPinned = !photo.pinned;
      // Get Supabase access token
      const { data: { session } } = await import('@/lib/supabase/client').then(m => m.supabase.auth.getSession());
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('Not authenticated');
      await fetch('/api/findr/pin-catch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ catchId, pinned: newPinned }),
      });
      await refetch();
    } catch (_err) {
      alert('Failed to update pin.');
    } finally {
      setPinning(null);
    }
  }
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const openPhoto = (index: number) => {
    setStartIndex(index);
    setCarouselOpen(true);
  };

  // Count user photos vs stock photos
  const userPhotos = photos.filter(p => p.metadata?.photographer !== 'Stock photo');
  const stockPhotos = photos.filter(p => p.metadata?.photographer === 'Stock photo');

  // Calculate species diversity and total fish count from sessions
  const speciesCount = useMemo(() => {
    const uniqueSpecies = new Set(sessions.map(s => s.species_common_name));
    return uniqueSpecies.size;
  }, [sessions]);

  const totalFishCount = useMemo(() => {
    return sessions.reduce((total, session) => total + session.quantity, 0);
  }, [sessions]);

  return (
    <>
      <Head>
        <title>My Trophy Gallery - findr</title>
        <meta name="description" content="View your catch photos and fishing history" />
      </Head>

      <main className="min-h-screen bg-base-200 pb-16">
        {/* Navigation */}
        <FindrNavigation />

        {/* Page Header */}
        <div className="bg-base-100 shadow-sm border-b border-base-200">
          <div className="container mx-auto px-2 sm:px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-primary flex items-center gap-2">
                  <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                  <TranslatedText text="My Trophy Gallery" />
                </h1>
                <p className="text-xs sm:text-sm text-base-content/70 mt-1">
                  {photos.length === 0 ? (
                    <TranslatedText text="No catches logged yet" />
                  ) : (
                    <>
                      {userPhotos.length > 0 && (
                        <span className="font-medium text-primary">
                          {userPhotos.length} <TranslatedText text={userPhotos.length === 1 ? 'your photo' : 'your photos'} />
                        </span>
                      )}
                      {userPhotos.length > 0 && stockPhotos.length > 0 && <span> · </span>}
                      {stockPhotos.length > 0 && (
                        <span>
                          {stockPhotos.length} <TranslatedText text={stockPhotos.length === 1 ? 'stock photo' : 'stock photos'} />
                        </span>
                      )}
                    </>
                  )}
                </p>
              </div>

              {user && photos.length > 0 && (
                <Link href="/findr/log" className="btn btn-primary btn-sm gap-2">
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline"><TranslatedText text="Log Catch" /></span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-2 sm:px-4 py-8">
          {!user ? (
            // Not signed in
            <div className="card bg-base-100 shadow-xl p-8 text-center max-w-2xl mx-auto">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold mb-3">
                <TranslatedText text="Sign in to view your catches" />
              </h2>
              <p className="text-base-content/70 mb-6 text-lg">
                <TranslatedText text="Create an account to log your catches and build your trophy gallery" />
              </p>

              {/* Feature highlights */}
              <div className="grid md:grid-cols-3 gap-4 mb-8 text-left">
                <div className="flex flex-col items-center p-4 bg-primary/5 rounded-lg">
                  <Camera className="w-8 h-8 text-primary mb-2" />
                  <h3 className="font-semibold text-sm mb-1">
                    <TranslatedText text="Upload Photos" />
                  </h3>
                  <p className="text-xs text-base-content/60 text-center">
                    <TranslatedText text="Add photos when logging catches to build your personal gallery" />
                  </p>
                </div>
                <div className="flex flex-col items-center p-4 bg-secondary/5 rounded-lg">
                  <ClipboardList className="w-8 h-8 text-secondary mb-2" />
                  <h3 className="font-semibold text-sm mb-1">
                    <TranslatedText text="Track Catches" />
                  </h3>
                  <p className="text-xs text-base-content/60 text-center">
                    <TranslatedText text="Log species, location, bait, and conditions for every catch" />
                  </p>
                </div>
                <div className="flex flex-col items-center p-4 bg-accent/5 rounded-lg">
                  <Fish className="w-8 h-8 text-accent mb-2" />
                  <h3 className="font-semibold text-sm mb-1">
                    <TranslatedText text="Stock Fallbacks" />
                  </h3>
                  <p className="text-xs text-base-content/60 text-center">
                    <TranslatedText text="No photo? We'll use beautiful species images as placeholders" />
                  </p>
                </div>
              </div>

              <Link href="/findr/auth" className="btn btn-primary btn-lg gap-2">
                <Camera className="w-5 h-5" />
                <TranslatedText text="Sign In to Get Started" />
              </Link>
            </div>
          ) : isLoading ? (
            // Loading state
            <div className="flex items-center justify-center py-20">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : error ? (
            // Error state
            <div className="alert alert-error">
              <span>
                <TranslatedText text="Failed to load photos" />: {(error as Error).message}
              </span>
            </div>
          ) : photos.length === 0 ? (
            // Empty state
            <div className="card bg-base-100 shadow-xl p-8 text-center">
              <div className="text-6xl mb-4">📸</div>
              <h2 className="text-xl font-bold mb-2">
                <TranslatedText text="No Catches Logged Yet!" />
              </h2>
              <p className="text-base-content/70 mb-6">
                <TranslatedText text="Start logging your catches to build your trophy gallery." />
                <br />
                <TranslatedText text="Photos are optional - we'll use stock images as placeholders!" />
              </p>
              <Link href="/findr/log" className="btn btn-primary gap-2">
                <Upload className="w-4 h-4" />
                <TranslatedText text="Log Your First Catch" />
              </Link>
            </div>
          ) : (
            // Gallery view
            <>
              {/* Info banner if showing stock photos */}
              {stockPhotos.length > 0 && (
                <div className="alert bg-info/10 border-info/20 mb-6">
                  <Info className="w-5 h-5 text-info" />
                  <div className="flex-1">
                    <p className="text-sm">
                      {userPhotos.length === 0 ? (
                        <TranslatedText text="Showing stock photos for your catches. Add your own photos when logging catches to personalize your gallery!" />
                      ) : (
                        <TranslatedText text="Catches without photos show stock images as placeholders. Add photos when logging to see your actual catches!" />
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Photo gallery */}
              <div className="card bg-base-100 shadow-xl p-6">
                <PhotoGalleryGrid
                  photos={photos}
                  onPhotoClickAction={openPhoto}
                  onPinToggle={handlePinToggle}
                  columns={3}
                  aspectRatio="wide"
                />
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="stat bg-base-100 shadow rounded-lg">
                  <div className="stat-figure text-primary">
                    <Fish className="w-8 h-8" />
                  </div>
                  <div className="stat-title">
                    <TranslatedText text="Species Caught" />
                  </div>
                  <div className="stat-value text-primary">{speciesCount}</div>
                </div>

                <div className="stat bg-base-100 shadow rounded-lg">
                  <div className="stat-figure text-success">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                  <div className="stat-title">
                    <TranslatedText text="Total Fish" />
                  </div>
                  <div className="stat-value text-success">{totalFishCount}</div>
                </div>

                {/* Member Status - Shows medals earned */}
                <MemberStatus sessions={sessions} />

                {/* Badge Showcase */}
                <BadgeShowcase sessions={sessions} />
              </div>
            </>
          )}
        </div>
      </main>

      {/* Trophy Photo Carousel */}
      {photos.length > 0 && (
        <TrophyPhotoCarousel
          photos={photos}
          initialPhotoIndex={startIndex}
          isOpen={carouselOpen}
          onClose={() => setCarouselOpen(false)}
          title="My Catches" // Note: Carousel titles are not currently translated by design
          showThumbnails={true}
          allowDownload={true}
          allowShare={userPhotos.length > 0} // Only allow sharing user's actual photos
          allowZoom={true}
        />
      )}
    </>
  );
}

// Server-side props to prevent static generation
export async function getServerSideProps() {
  return { props: {} };
}
