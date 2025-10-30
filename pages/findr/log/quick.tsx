import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { savePendingCatch } from '../../../utils/pendingCatchLogs';
import { useRouter } from 'next/router';
import { ArrowLeft, Flame, Circle } from 'lucide-react';
import { useUnifiedLocation } from '../../../context/UnifiedLocationContext';
import { useQuickLogSpecies } from '../../../hooks/useQuickLogSpecies';
import { useQuickCatchLog } from '../../../hooks/useCatchLogger';
import SEO from '../../../components/SEO';
import Image from 'next/image';

/**
 * Quick Catch Logging - Species Selection
 *
 * Flow:
 * 1. Display grid of regional species with thumbnails
 * 2. User taps species → show quantity picker
 * 3. User confirms → catch logged
 *
 * Goal: 10 seconds from page load to logged catch
 */
export default function QuickCatchLogPage() {
  const router = useRouter();
  const { location } = useUnifiedLocation();
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);

  // Fetch regional species based on current location
  const { species, isLoading, error } = useQuickLogSpecies(
    location?.lat || 0,
    location?.lon || 0,
    { maxSpecies: 12 }
  );

  const { logCatch, loading: isSubmitting } = useQuickCatchLog();

  const selectedSpecies = species.find(s => s.id === selectedSpeciesId);

  const handleSpeciesSelect = (speciesId: string) => {
    setSelectedSpeciesId(speciesId);
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity(Math.max(1, quantity + delta));
  };

  const [pendingMsg, setPendingMsg] = useState<string | null>(null);
  const handleSubmit = async () => {
    if (!selectedSpecies || !location) return;

    if (typeof window !== 'undefined' && !navigator.onLine) {
      // Offline: save to IndexedDB
      const pending = {
        id: crypto.randomUUID(),
        data: {
          speciesId: selectedSpecies.id,
          speciesCommonName: selectedSpecies.name,
          scientificName: selectedSpecies.scientificName || null,
          rectangleCode: location.rectangleCode || null,
          catchDate: new Date().toISOString(),
          quantity,
          baitUsed: null,
          habitatType: null,
          notes: null,
        },
        image: undefined,
        createdAt: Date.now(),
      };
      await savePendingCatch(pending);
      setPendingMsg('You are offline. Catch saved for upload when online.');
      setTimeout(() => router.push('/findr'), 1200);
      return;
    }
    try {
      await logCatch({
        speciesId: selectedSpecies.id,
        speciesCommonName: selectedSpecies.name,
        scientificName: selectedSpecies.scientificName || null,
        rectangleCode: location.rectangleCode || null,
        catchDate: new Date().toISOString(),
        quantity,
        photo: null,
        baitUsed: null,
        habitatType: null,
        notes: null,
      });
      router.push('/findr');
    } catch (err) {
      console.error('Failed to log catch:', err);
    }
  };

  return (
    <>
      <SEO
        title="Quick Log - Findr"
        description="Quick catch logging with regional species"
      />

      <div className="min-h-screen bg-base-200">
        {pendingMsg && (
          <div className="alert alert-info shadow-sm flex items-center gap-2 justify-center mb-4">
            <Sparkles className="h-5 w-5" />
            <span>{pendingMsg}</span>
          </div>
        )}
        {/* Header - No Global Navigation */}
        <div className="bg-base-100 border-b border-base-300">
          <div className="container mx-auto px-4 py-4">
            <button
              onClick={() => router.back()}
              className="btn btn-ghost btn-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-6 max-w-2xl">

          {/* Location Display */}
          {location && (
            <div className="text-sm text-base-content/60 mb-4">
              {location.rectangleLabel || (location.lat && location.lon ? `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}` : 'Unknown location')}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="alert alert-error">
              <span>Failed to load species. Please check your location.</span>
            </div>
          )}

          {/* Species Selection Grid */}
          {!isLoading && !error && !selectedSpeciesId && (
            <>
              <h2 className="text-lg font-bold mb-4">What did you catch?</h2>
              <div className="grid grid-cols-3 gap-3">
                {species.map((sp) => (
                  <button
                    key={sp.id}
                    onClick={() => handleSpeciesSelect(sp.id)}
                    className="relative card bg-base-100 hover:bg-base-200 transition-all hover:shadow-md cursor-pointer p-3"
                  >
                    {/* Thumbnail */}
                    {sp.thumbnail ? (
                      <div className="relative w-full aspect-[4/3] mb-2">
                        <Image
                          src={sp.thumbnail}
                          alt={sp.name}
                          fill
                          className="object-cover rounded"
                          sizes="(max-width: 768px) 33vw, 150px"
                        />
                      </div>
                    ) : (
                      <div className="relative w-full aspect-[4/3] mb-2 bg-base-300 rounded flex items-center justify-center">
                        <span className="text-4xl">🐟</span>
                      </div>
                    )}

                    {/* Confidence Badge */}
                    {sp.badge && (
                      <div className="absolute top-2 right-2">
                        {sp.badge === 'hot' ? (
                          <div className="badge badge-sm bg-error text-error-content border-0 gap-1">
                            <Flame className="w-3 h-3" />
                            Hot
                          </div>
                        ) : (
                          <div className="badge badge-sm bg-success text-success-content border-0 gap-1">
                            <Circle className="w-2 h-2 fill-current" />
                            Good
                          </div>
                        )}
                      </div>
                    )}

                    {/* Species Name */}
                    <div className="text-xs font-medium text-center line-clamp-2">
                      {sp.name}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Quantity Picker (After Species Selected) */}
          {selectedSpeciesId && selectedSpecies && (
            <div className="space-y-6">
              {/* Selected Species Display */}
              <div className="card bg-base-100 p-4">
                <div className="flex items-center gap-4">
                  {selectedSpecies.thumbnail && (
                    <div className="relative w-20 h-20">
                      <Image
                        src={selectedSpecies.thumbnail}
                        alt={selectedSpecies.name}
                        fill
                        className="object-cover rounded"
                        sizes="80px"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{selectedSpecies.name}</h3>
                    {selectedSpecies.scientificName && (
                      <p className="text-sm text-base-content/60 italic">
                        {selectedSpecies.scientificName}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="card bg-base-100 p-6">
                <h3 className="text-lg font-bold mb-4">How many did you catch?</h3>
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    className="btn btn-circle btn-lg"
                    disabled={quantity <= 1}
                  >
                    <span className="text-2xl">−</span>
                  </button>
                  <div className="text-4xl font-bold w-20 text-center">
                    {quantity}
                  </div>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    className="btn btn-circle btn-lg"
                  >
                    <span className="text-2xl">+</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedSpeciesId(null);
                    setQuantity(1);
                  }}
                  className="btn btn-ghost flex-1"
                  disabled={isSubmitting}
                >
                  Change Species
                </button>
                <button
                  onClick={handleSubmit}
                  className="btn btn-primary flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Logging...
                    </>
                  ) : (
                    'Log Catch'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
