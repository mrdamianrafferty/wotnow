// pages/findr/bait-shops.tsx
/**
 * Bait Shops Page
 *
 * Helps anglers find local tackle shops and bait suppliers near their fishing location.
 * Uses Google Places API to search for nearby shops.
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import FindrHeader from '../../components/findr/FindrHeader';
import FindrFooter from '../../components/FindrFooter';
import FindrBottomNav from '../../components/findr/FindrBottomNav';
import { TranslatedText } from '../../components/translation/TranslatedFishCard';
import { MapPin, ExternalLink, Phone, Navigation, ChevronLeft, Search, Store } from 'lucide-react';

interface PlaceResult {
  name: string;
  address: string;
  rating?: number;
  totalRatings?: number;
  isOpen?: boolean;
  phone?: string;
  website?: string;
  distance?: string;
  lat: number;
  lng: number;
  placeId: string;
}

export default function BaitShopsPage() {
  const router = useRouter();
  const { rect, bait } = router.query;

  const [shops, setShops] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string>('');

  // Get location from rectangle code or user's current location
  useEffect(() => {
    if (!router.isReady) return;

    const getLocation = async () => {
      // Try to get location from rectangle code via API
      if (rect && typeof rect === 'string') {
        try {
          const response = await fetch(`/api/findr/rectangles?code=${encodeURIComponent(rect)}`);
          if (response.ok) {
            const data = await response.json();
            const rectangle = data.options?.find((r: { code: string }) => r.code === rect);
            if (rectangle && rectangle.centerLat && rectangle.centerLon) {
              setSearchLocation({ lat: rectangle.centerLat, lng: rectangle.centerLon });
              setLocationName(rectangle.region || rect);
              return;
            }
          }
        } catch (err) {
          console.warn('Could not fetch rectangle location:', err);
        }
      }

      // Fall back to browser geolocation
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setSearchLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            setLocationName('Your location');
          },
          () => {
            setError('Could not determine location. Please enable location services.');
            setLoading(false);
          }
        );
      } else {
        setError('Location services not available.');
        setLoading(false);
      }
    };

    getLocation();
  }, [router.isReady, rect]);

  // Search for tackle shops near the location
  const searchTackleShops = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/places/nearby?lat=${lat}&lng=${lng}&type=tackle_shop&radius=25000`
      );

      if (!response.ok) {
        throw new Error('Failed to search for shops');
      }

      const data = await response.json();
      setShops(data.results || []);
    } catch (err) {
      console.error('Error searching for tackle shops:', err);
      setError('Could not find tackle shops. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger search when location is available
  useEffect(() => {
    if (searchLocation) {
      searchTackleShops(searchLocation.lat, searchLocation.lng);
    }
  }, [searchLocation, searchTackleShops]);

  // Generate Google Maps directions URL
  const getDirectionsUrl = (shop: PlaceResult) => {
    const origin = searchLocation
      ? `${searchLocation.lat},${searchLocation.lng}`
      : '';
    const destination = `${shop.lat},${shop.lng}`;
    return `https://www.google.com/maps/dir/${origin}/${destination}`;
  };

  // Generate Google Maps search URL as fallback
  const getGoogleMapsSearchUrl = () => {
    if (!searchLocation) return 'https://www.google.com/maps/search/tackle+shop+fishing+bait';
    return `https://www.google.com/maps/search/tackle+shop+fishing+bait/@${searchLocation.lat},${searchLocation.lng},12z`;
  };

  const baitName = typeof bait === 'string' ? bait : '';

  return (
    <>
      <Head>
        <title>Find Bait & Tackle Shops - Findr</title>
        <meta
          name="description"
          content="Find local tackle shops and bait suppliers near your fishing spot. Get directions, opening hours, and contact details."
        />
      </Head>

      <div data-theme="light" className="min-h-screen bg-base-100 text-base-content pb-20 md:pb-0">
        <FindrHeader />

        <main className="max-w-2xl mx-auto px-4 py-6">
          {/* Back button */}
          <Link
            href="/findr"
            className="inline-flex items-center gap-1 text-sm text-base-content/70 hover:text-primary mb-4"
          >
            <ChevronLeft className="h-4 w-4" />
            <TranslatedText text="Back to predictions" />
          </Link>

          <h1 className="text-2xl font-bold mb-2">
            <TranslatedText text="Find Bait & Tackle" />
          </h1>

          {/* Bait reminder */}
          {baitName && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-700 dark:text-green-300 font-medium">
                  <TranslatedText text="Looking for:" />
                </span>
                <span className="badge badge-success badge-sm">{baitName}</span>
              </div>
            </div>
          )}

          {/* Location indicator */}
          {locationName && (
            <div className="flex items-center gap-2 text-sm text-base-content/70 mb-6">
              <MapPin className="h-4 w-4" />
              <span>
                <TranslatedText text="Searching near" /> {locationName}
              </span>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="loading loading-spinner loading-lg text-primary" />
              <p className="mt-4 text-base-content/70">
                <TranslatedText text="Finding tackle shops nearby..." />
              </p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="alert alert-warning mb-6">
              <div>
                <p>{error}</p>
                <a
                  href={getGoogleMapsSearchUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline mt-2"
                >
                  <Search className="h-4 w-4" />
                  <TranslatedText text="Search on Google Maps" />
                </a>
              </div>
            </div>
          )}

          {/* Results */}
          {!loading && !error && shops.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-base-content/70">
                <TranslatedText text="Found" /> {shops.length}{' '}
                <TranslatedText text="tackle shops nearby" />
              </p>

              {shops.map((shop) => (
                <div
                  key={shop.placeId}
                  className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="card-body p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{shop.name}</h3>
                        <p className="text-sm text-base-content/70 truncate">{shop.address}</p>

                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          {/* Rating */}
                          {shop.rating && (
                            <div className="flex items-center gap-1 text-sm">
                              <span className="text-yellow-500">★</span>
                              <span>{shop.rating.toFixed(1)}</span>
                              {shop.totalRatings && (
                                <span className="text-base-content/50">({shop.totalRatings})</span>
                              )}
                            </div>
                          )}

                          {/* Open status */}
                          {shop.isOpen !== undefined && (
                            <span
                              className={`badge badge-sm ${
                                shop.isOpen ? 'badge-success' : 'badge-error'
                              }`}
                            >
                              {shop.isOpen ? 'Open' : 'Closed'}
                            </span>
                          )}

                          {/* Distance */}
                          {shop.distance && (
                            <span className="text-sm text-base-content/60">{shop.distance}</span>
                          )}
                        </div>
                      </div>

                      {/* Store icon */}
                      <div className="shrink-0 p-2 bg-primary/10 rounded-lg">
                        <Store className="h-6 w-6 text-primary" />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <a
                        href={getDirectionsUrl(shop)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-primary gap-1"
                      >
                        <Navigation className="h-4 w-4" />
                        <TranslatedText text="Directions" />
                      </a>

                      {shop.phone && (
                        <a href={`tel:${shop.phone}`} className="btn btn-sm btn-outline gap-1">
                          <Phone className="h-4 w-4" />
                          <TranslatedText text="Call" />
                        </a>
                      )}

                      {shop.website && (
                        <a
                          href={shop.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline gap-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <TranslatedText text="Website" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No results */}
          {!loading && !error && shops.length === 0 && searchLocation && (
            <div className="text-center py-12">
              <Store className="h-12 w-12 text-base-content/30 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">
                <TranslatedText text="No tackle shops found nearby" />
              </h3>
              <p className="text-sm text-base-content/70 mb-4">
                <TranslatedText text="Try searching on Google Maps for more options" />
              </p>
              <a
                href={getGoogleMapsSearchUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary gap-2"
              >
                <Search className="h-4 w-4" />
                <TranslatedText text="Search on Google Maps" />
              </a>
            </div>
          )}

          {/* Helpful tips */}
          <div className="mt-8 p-4 bg-base-200 rounded-lg">
            <h3 className="font-semibold mb-2">
              <TranslatedText text="Tips for buying bait" />
            </h3>
            <ul className="text-sm text-base-content/70 space-y-1">
              <li>
                • <TranslatedText text="Call ahead to check bait availability" />
              </li>
              <li>
                • <TranslatedText text="Fresh bait is always better - ask when it arrived" />
              </li>
              <li>
                • <TranslatedText text="Local shops often know what's working best" />
              </li>
              <li>
                • <TranslatedText text="Consider frozen bait as a backup option" />
              </li>
            </ul>
          </div>
        </main>

        <FindrFooter />
        <FindrBottomNav />
      </div>
    </>
  );
}
