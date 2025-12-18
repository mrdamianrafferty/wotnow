// components/findr/NearbyTackleShops.tsx
import { useState, useEffect, useCallback } from 'react';
import { MapPin, Star, ExternalLink, Loader } from 'lucide-react';
import { useUnifiedLocation } from '@/context/UnifiedLocationContext';
import { findNearbyTackleShops, type TackleShop } from '@/lib/findNearbyTackleShops';
import { TranslatedText } from '../translation/TranslatedFishCard';

export function NearbyTackleShops() {
  const { location, loading: locationLoading } = useUnifiedLocation();
  const [shops, setShops] = useState<TackleShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!location?.lat || !location?.lon) {
      setError('Location not available. Please set your fishing location first.');
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const results = await findNearbyTackleShops(location.lat, location.lon);
      setShops(results);

      if (results.length === 0) {
        setError('No tackle shops found within 50km. Try searching in a different area.');
      }
    } catch (err) {
      console.error('Error finding tackle shops:', err);
      setError(
        err instanceof Error && err.message.includes('authorized')
          ? 'Google Maps API configuration issue. See docs/GOOGLE_MAPS_API_SETUP.md'
          : 'Failed to load tackle shops. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    // Auto-search when location is available
    if (location?.lat && location?.lon && !hasSearched) {
      handleSearch();
    }
  }, [location, hasSearched, handleSearch]);

  if (locationLoading) {
    return (
      <div className="flex items-center justify-center gap-3 p-6">
        <Loader className="animate-spin text-primary" size={24} />
        <span className="text-sm text-base-content/70">
          <TranslatedText text="Loading your saved location..." />
        </span>
      </div>
    );
  }

  if (!hasSearched && !loading) {
    return (
      <div className="alert alert-info">
        <MapPin className="shrink-0" size={20} />
        <div className="flex-1">
          <p className="text-sm">
            <TranslatedText text="Want to find tackle shops near your fishing spot?" />
          </p>
        </div>
        <button
          className="btn btn-sm btn-primary"
          onClick={handleSearch}
          disabled={!location?.lat || !location?.lon}
        >
          <TranslatedText text="Find Shops" />
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 p-6">
        <Loader className="animate-spin text-primary" size={24} />
        <span className="text-sm text-base-content/70">
          <TranslatedText text="Searching for tackle shops within 50km..." />
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning">
        <MapPin className="shrink-0" size={20} />
        <div className="flex-1">
          <p className="text-sm">{error}</p>
        </div>
        <button
          className="btn btn-sm btn-ghost"
          onClick={handleSearch}
        >
          <TranslatedText text="Try Again" />
        </button>
      </div>
    );
  }

  if (shops.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mt-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <MapPin size={16} className="text-primary" />
          <TranslatedText text={`${shops.length} Tackle Shop${shops.length !== 1 ? 's' : ''} Near You`} />
        </h4>
        <span className="text-xs text-base-content/50">
          <TranslatedText text="Updated regularly" />
        </span>
      </div>

      <div className="space-y-2">
        {shops.map((shop) => (
          <div
            key={shop.placeId}
            className="card bg-base-100 hover:bg-base-200 transition-colors border border-base-300"
          >
            <div className="card-body p-4">
              <div className="flex items-start justify-between gap-3">
                {/* Shop thumbnails disabled - Google Photos API requires complex auth */}

                <div className="flex-1 min-w-0">
                  <h5 className="font-semibold text-sm text-base-content truncate">{shop.name}</h5>
                  <p className="text-xs text-base-content/70 truncate">{shop.address}</p>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {shop.distance !== undefined && (
                      <span className="badge badge-sm badge-outline gap-1 text-base-content">
                        <MapPin size={12} />
                        {shop.distance}km
                      </span>
                    )}

                    {shop.rating && (
                      <span className="badge badge-sm badge-warning gap-1">
                        <Star size={12} fill="currentColor" />
                        {shop.rating}
                        {shop.userRatingsTotal && (
                          <span className="text-xs opacity-70">
                            ({shop.userRatingsTotal})
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <a
                  href={`https://www.google.com/maps/place/?q=place_id:${shop.placeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-circle btn-ghost"
                  title="View on Google Maps"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-center text-base-content/50 pt-2">
        <TranslatedText text="Data from Google Places • Showing up to 10 shops • Cached for 30 days" />
      </p>
    </div>
  );
}
