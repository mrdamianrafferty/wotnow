import React, { useState, useRef, useEffect } from 'react';
import { savePendingCatch } from '../../../utils/pendingCatchLogs';
import { useRouter } from 'next/router';
import { ArrowLeft, Camera, Flame, Circle, X, Sparkles, AlertCircle, Check } from 'lucide-react';
import { useUnifiedLocation } from '../../../context/UnifiedLocationContext';
import { useQuickLogSpecies } from '../../../hooks/useQuickLogSpecies';
import { useCatchLogger } from '../../../hooks/useCatchLogger';
import { useFishIdentification } from '../../../hooks/useFishIdentification';
import { useImageCompression } from '../../../hooks/useImageCompression';
import SEO from '../../../components/SEO';
import Image from 'next/image';

/**
 * Catch Logging with Camera Capture + AI Identification
 *
 * Flow:
 * 1. Capture photo using device camera (PWA capture="environment")
 * 2. AI automatically identifies species (with regional candidates)
 * 3. Show AI result OR manual species grid
 * 4. Set quantity
 * 5. Submit with photo
 *
 * Goal: Smart identification that reduces to manual selection when uncertain
 */
export default function TakePhotoCatchLogPage() {
  const router = useRouter();
  const { location } = useUnifiedLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [showManualGrid, setShowManualGrid] = useState(false);

  // Image compression for consistent upload size
  const {
    compress: compressImage,
    statusMessage: compressionMessage,
    savingsText,
    isProcessing: isCompressing,
  } = useImageCompression();

  // Fetch regional species based on current location
  const { species, isLoading: loadingSpecies, error: speciesError } = useQuickLogSpecies(
    location?.lat || 0,
    location?.lon || 0,
    { maxSpecies: 12 }
  );

  // AI fish identification hook
  const { identify, isIdentifying, result: aiResult, stats } = useFishIdentification({
    onSuccess: (result) => {
      console.log('[TakePhoto] AI identification complete:', result.method, result.confidence);

      // If AI identified with high confidence, auto-select
      if (result.method === 'ai' && !Array.isArray(result.species) && result.confidence >= 0.7) {
        setSelectedSpeciesId(result.species.id);
      }
    }
  });

  const { logCatch, loading: isSubmitting } = useCatchLogger();

  const selectedSpecies = species.find(s => s.id === selectedSpeciesId);

  // Auto-trigger AI identification when photo is captured
  useEffect(() => {
    if (photoFile && species.length > 0 && !aiResult && !isIdentifying) {
      console.log('[TakePhoto] Auto-triggering AI identification');
  // ...existing code...
      identify(photoFile, species, {
        location: {
          coords: location?.lat && location?.lon ? [location.lat, location.lon] : undefined,
          rectangleCode: location?.rectangleCode || undefined,
          rectangleLabel: location?.rectangleLabel || undefined
        }
      });
    }
  }, [photoFile, species, aiResult, isIdentifying, identify, location]);

  const handleCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create preview URL from original
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Compress the image for upload
      try {
        const compressionResult = await compressImage(file, {
          maxSizeMB: 4,
          maxDimension: 1920,
          preserveExif: true,
        });
        setPhotoFile(compressionResult.file);
      } catch (err) {
        console.error('[TakePhoto] Compression failed, using original:', err);
        setPhotoFile(file);
      }

      // Reset states for new identification
      setSelectedSpeciesId(null);
      setShowManualGrid(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setSelectedSpeciesId(null);
    setShowManualGrid(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSpeciesSelect = (speciesId: string) => {
    setSelectedSpeciesId(speciesId);
  };

  const handleChangeSpecies = () => {
    setSelectedSpeciesId(null);
    setShowManualGrid(true);
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
        image: photoFile || undefined,
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
        photo: photoFile,
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
        title="Take Photo - Findr"
        description="Capture your catch with AI-powered identification"
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

          {/* AI Budget Status (if stats available) */}
          {stats && stats.aiAvailable && (
            <div className="text-xs text-base-content/50 mb-4 flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              AI Budget: €{stats.remainingBudget.toFixed(2)} remaining this month
            </div>
          )}

          {/* Camera Capture Section - Show first if no photo */}
          {!photoFile && !selectedSpeciesId && (
            <div className="card bg-base-100 p-6 mb-6">
              <h2 className="text-lg font-bold mb-4">Take a Photo</h2>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCapture}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-primary btn-block btn-lg"
              >
                <Camera className="w-5 h-5 mr-2" />
                Open Camera
              </button>
              <p className="text-sm text-base-content/60 mt-3 text-center">
                Takes a photo with your device camera
              </p>
              <p className="text-xs text-base-content/40 mt-2 text-center flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI will automatically identify your catch
              </p>
            </div>
          )}

          {/* Photo Preview - Show after capture */}
          {photoPreview && !selectedSpeciesId && (
            <div className="card bg-base-100 p-4 mb-6">
              <div className="relative">
                <div className="relative w-full aspect-[4/3] rounded overflow-hidden">
                  <Image
                    src={photoPreview}
                    alt="Catch photo"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 600px"
                  />
                </div>
                <button
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 btn btn-circle btn-sm bg-base-100/80 hover:bg-base-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Compression Status/Savings */}
              {isCompressing && (
                <div className="mt-2 text-center text-sm text-base-content/70 flex items-center justify-center gap-2">
                  <span className="loading loading-spinner loading-xs"></span>
                  {compressionMessage || 'Optimizing image...'}
                </div>
              )}
              {!isCompressing && savingsText && (
                <div className="mt-2 text-center text-xs text-success flex items-center justify-center gap-1">
                  <Check className="w-3 h-3" />
                  Image optimized: {savingsText}
                </div>
              )}
            </div>
          )}

          {/* AI Identifying Animation */}
          {isIdentifying && (
            <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 p-8 mb-6">
              <div className="flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="mt-4 text-lg font-medium flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Identifying your catch...
                </p>
                <p className="text-sm text-base-content/60 mt-2">
                  Using AI and {species.length} regional species
                </p>
              </div>
            </div>
          )}

          {/* AI Result - High Confidence Match */}
          {aiResult && !Array.isArray(aiResult.species) && aiResult.method === 'ai' && !showManualGrid && (
            <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-primary/20 p-4 mb-6">
              <div className="flex items-start gap-2 mb-3">
                <div className="badge badge-primary gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Identified
                </div>
                <div className="badge badge-ghost">
                  {Math.round(aiResult.confidence * 100)}% confident
                </div>
              </div>

              <div className="flex gap-4">
                {aiResult.species.thumbnail && (
                  <div className="relative w-32 h-24 rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={aiResult.species.thumbnail}
                      alt={aiResult.species.name}
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  </div>
                )}

                <div className="flex-1">
                  <h3 className="text-xl font-bold">{aiResult.species.name}</h3>
                  {aiResult.species.scientificName && (
                    <p className="text-sm text-base-content/70 italic">
                      {aiResult.species.scientificName}
                    </p>
                  )}

                  {aiResult.reasoning && (
                    <p className="text-xs text-base-content/60 mt-2">
                      {aiResult.reasoning}
                    </p>
                  )}

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        if (!Array.isArray(aiResult.species)) {
                          setSelectedSpeciesId(aiResult.species.id);
                        }
                      }}
                      className="btn btn-primary btn-sm"
                    >
                      Correct!
                    </button>
                    <button
                      onClick={handleChangeSpecies}
                      className="btn btn-ghost btn-sm"
                    >
                      Not right? Change
                    </button>
                  </div>
                </div>
              </div>

              {aiResult.cost > 0 && (
                <div className="text-center text-xs text-base-content/50 mt-3">
                  AI usage: €{aiResult.cost.toFixed(3)}
                </div>
              )}
            </div>
          )}

          {/* AI Result - Database/Manual Fallback */}
          {aiResult && (Array.isArray(aiResult.species) || showManualGrid) && !selectedSpeciesId && (
            <>
              {aiResult.message && (
                <div className="alert mb-4 bg-base-100">
                  <AlertCircle className="w-4 h-4" />
                  <span>{aiResult.message}</span>
                </div>
              )}

              <h2 className="text-lg font-bold mb-4">What did you catch?</h2>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {(Array.isArray(aiResult.species) ? aiResult.species : species).slice(0, 12).map((sp) => (
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

          {/* Loading Species */}
          {loadingSpecies && photoFile && (
            <div className="flex items-center justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          )}

          {/* Error State */}
          {speciesError && (
            <div className="alert alert-error">
              <span>Failed to load species. Please check your location.</span>
            </div>
          )}

          {/* Quantity Picker and Photo Review (After Species Selected) */}
          {selectedSpeciesId && selectedSpecies && (
            <div className="space-y-6">
              {/* Photo and Species Display */}
              <div className="card bg-base-100 p-4">
                <div className="flex gap-4">
                  {/* Photo thumbnail */}
                  {photoPreview && (
                    <div className="relative w-24 h-24 rounded overflow-hidden flex-shrink-0">
                      <Image
                        src={photoPreview}
                        alt="Catch"
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                  )}

                  {/* Species info */}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{selectedSpecies.name}</h3>
                    {selectedSpecies.scientificName && (
                      <p className="text-sm text-base-content/60 italic">
                        {selectedSpecies.scientificName}
                      </p>
                    )}
                    {selectedSpecies.badge && (
                      <div className="mt-2">
                        {selectedSpecies.badge === 'hot' ? (
                          <div className="badge badge-sm bg-error text-error-content gap-1">
                            <Flame className="w-3 h-3" />
                            Hot right now
                          </div>
                        ) : (
                          <div className="badge badge-sm bg-success text-success-content gap-1">
                            <Circle className="w-2 h-2 fill-current" />
                            Good conditions
                          </div>
                        )}
                      </div>
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
                    setShowManualGrid(true);
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
