/**
 * QuickLogModal Component - Photo-First Workflow with AI Enhancement
 *
 * Streamlined catch logging with intelligent features:
 * - Photo-first options: Take photo, add from gallery, or skip
 * - AI species identification (GPT-4 Vision)
 * - EXIF data extraction (GPS coordinates, timestamp)
 * - Location-aware species selection
 * - Progressive disclosure UX
 *
 * @see docs/QUICKLOG_MODAL_PHOTO_FIRST_WORKFLOW.md for complete workflow documentation
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Camera, ImageIcon, Zap, AlertCircle, Plus, Minus, Check, Sparkles, Loader2 } from 'lucide-react';
import { useFishIdentification } from '@/hooks/useFishIdentification';
import { useQuickLogSpecies, type QuickLogSpecies } from '@/hooks/useQuickLogSpecies';
import { useUnifiedLocation } from '@/context/UnifiedLocationContext';
import { SPECIES_IMAGE_MAP } from '@/data/speciesImageMap';
import { TranslatedText } from '../translation/TranslatedFishCard';
import type { QuickLogParams } from '@/hooks/useCatchLogger';

// Types
interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickLog: (params: QuickLogParams) => Promise<unknown>;
  onSuccess?: () => void;
  rectangleCode?: string;
}

type Step = 'photo-decision' | 'photo-captured' | 'species-selection' | 'quantity' | 'submitting' | 'success';
type PhotoSource = 'camera' | 'gallery' | 'skip';

interface ExifData {
  location?: [number, number];
  timestamp?: Date;
}

// EXIF extraction utility
async function extractExif(file: File): Promise<ExifData | null> {
  try {
    const exifr = await import('exifr');
    const exif = await exifr.parse(file, {
      gps: true,
      pick: ['DateTimeOriginal', 'GPSLatitude', 'GPSLongitude']
    });

    return {
      location: exif?.latitude && exif?.longitude
        ? [exif.latitude, exif.longitude]
        : undefined,
      timestamp: exif?.DateTimeOriginal
        ? new Date(exif.DateTimeOriginal)
        : undefined
    };
  } catch (err) {
    console.log('[QuickLog] No EXIF data found:', err);
    return null;
  }
}

// Main component
export function QuickLogModal({
  isOpen,
  onClose,
  onQuickLog,
  onSuccess,
  rectangleCode,
}: QuickLogModalProps) {
  // Context
  const { location } = useUnifiedLocation();

  // Location-aware species
  const { species: regionalSpecies, isLoading: loadingSpecies } = useQuickLogSpecies(
    location?.lat || 43.5, // Fallback coordinates
    location?.lon || -5.25,
    { maxSpecies: 12 }
  );

  // AI identification
  const { identify, isIdentifying, result: aiResult, error: aiError } = useFishIdentification({
    onSuccess: (result) => {
      // Auto-select if high confidence and single species
      if (
        !Array.isArray(result.species) &&
        result.method === 'ai' &&
        result.confidence >= 0.7
      ) {
        setSelectedSpecies(result.species);
      }
    }
  });

  // State
  const [currentStep, setCurrentStep] = useState<Step>('photo-decision');
  const [photoSource, setPhotoSource] = useState<PhotoSource | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [exifData, setExifData] = useState<ExifData | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState<QuickLogSpecies | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [showAllSpecies, setShowAllSpecies] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Handle photo selection (camera or gallery)
  const handlePhotoChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>, source: PhotoSource) => {
      const file = event.target.files?.[0] ?? null;
      event.target.value = ''; // Reset input

      if (!file) return;

      setPhotoFile(file);
      setPhotoSource(source);

      // Create preview
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);

      // Extract EXIF data
      const exif = await extractExif(file);
      setExifData(exif);

      // Move to captured step
      setCurrentStep('photo-captured');

      // Auto-trigger AI identification
      if (regionalSpecies.length > 0) {
        const context = {
          location: {
            coords: exif?.location || (location?.lat && location?.lon ? [location.lat, location.lon] : undefined),
            rectangleCode: location?.rectangleCode || rectangleCode,
            rectangleLabel: location?.rectangleLabel,
          }
        };

        void identify(file, regionalSpecies, context);
      }
    },
    [regionalSpecies, location, rectangleCode, identify]
  );

  // Skip photo and go directly to species selection
  const handleSkipPhoto = useCallback(() => {
    setPhotoSource('skip');
    setCurrentStep('species-selection');
  }, []);

  // Species selection handlers
  const handleSpeciesSelect = useCallback((species: QuickLogSpecies) => {
    setSelectedSpecies(species);
    setCurrentStep('quantity');
  }, []);

  const handleChangeSpecies = useCallback(() => {
    setSelectedSpecies(null);
    setCurrentStep('species-selection');
  }, []);

  // Quantity handlers
  const incrementQuantity = useCallback(() => setQuantity(q => q + 1), []);
  const decrementQuantity = useCallback(() => setQuantity(q => Math.max(1, q - 1)), []);
  const setQuickQuantity = useCallback((q: number) => setQuantity(q), []);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!selectedSpecies) {
      setError('Please select a species');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const speciesInfo = SPECIES_IMAGE_MAP[selectedSpecies.code];

      // Use EXIF location if available, otherwise current location
      const userLocation = exifData?.location
        ? { lat: exifData.location[0], lon: exifData.location[1] }
        : (location?.lat && location?.lon ? { lat: location.lat, lon: location.lon } : undefined);

      const result = await onQuickLog({
        speciesId: selectedSpecies.id,
        speciesCommonName: speciesInfo?.name || selectedSpecies.name,
        scientificName: selectedSpecies.scientificName,
        rectangleCode: rectangleCode || location?.rectangleCode,
        quantity,
        photo: photoFile || undefined,
        userLocation,
        catchDate: exifData?.timestamp
          ? exifData.timestamp.toISOString().split('T')[0]
          : undefined,
        catchTime: exifData?.timestamp
          ? exifData.timestamp.toISOString().split('T')[1]?.slice(0, 8)
          : undefined,
      });

      if (result == null) {
        throw new Error('Failed to log catch. Please try again.');
      }

      setCurrentStep('success');
      onSuccess?.();

      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      console.error('[QuickLog] Failed to log catch:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to log catch';

      if (errorMessage.includes('Authentication') || errorMessage.includes('auth')) {
        setError('You need to sign in to log catches. Please sign in and try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedSpecies, quantity, photoFile, exifData, location, rectangleCode, onQuickLog, onSuccess]);

  // Close handler with cleanup
  const handleClose = useCallback(() => {
    setCurrentStep('photo-decision');
    setPhotoSource(null);
    setPhotoFile(null);
    setPhotoPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setExifData(null);
    setSelectedSpecies(null);
    setQuantity(1);
    setShowAllSpecies(false);
    setIsSubmitting(false);
    setError(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
    onClose();
  }, [onClose]);

  // Auto-advance from photo-captured to species-selection when AI is done
  useEffect(() => {
    if (
      currentStep === 'photo-captured' &&
      !isIdentifying &&
      aiResult &&
      !selectedSpecies
    ) {
      // If AI auto-selected (high confidence), go to quantity
      if (!Array.isArray(aiResult.species) && aiResult.confidence >= 0.7) {
        setCurrentStep('quantity');
      } else {
        // Otherwise show species selection
        setCurrentStep('species-selection');
      }
    }
  }, [currentStep, isIdentifying, aiResult, selectedSpecies]);

  // All species list (fallback)
  const allSpecies = Object.keys(SPECIES_IMAGE_MAP)
    .map(code => {
      const existing = regionalSpecies.find(s => s.code === code);
      if (existing) return existing;

      const info = SPECIES_IMAGE_MAP[code];
      return {
        id: code,
        code,
        name: info.name,
        scientificName: info.scientificName,
        thumbnail: info.thumb || info.image,
        confidence: 0,
        biteScore: 0,
        badge: null as null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-base-100 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2 text-primary">
            <Zap className="w-5 h-5" />
            <TranslatedText text="Quick Log Catch" />
          </h3>
          <button
            onClick={handleClose}
            className="btn btn-sm btn-circle btn-ghost"
            disabled={isSubmitting}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-error mb-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-sm">{error}</span>
              {error.includes('sign in') && (
                <Link href="/findr/auth" className="btn btn-sm btn-ghost mt-2">
                  <TranslatedText text="Go to Sign In" />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Step 1: Photo Decision */}
        {currentStep === 'photo-decision' && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <p className="text-sm opacity-70">
                <TranslatedText text="How would you like to log your catch?" />
              </p>
            </div>

            {/* Take Photo */}
            <button
              onClick={() => photoInputRef.current?.click()}
              className="btn btn-lg btn-primary w-full gap-2 h-auto p-4 flex-col"
              disabled={isSubmitting}
            >
              <Camera className="w-6 h-6" />
              <div className="text-center">
                <div className="font-semibold"><TranslatedText text="Take Photo" /></div>
                <div className="text-xs opacity-80 font-normal">
                  <TranslatedText text="Capture with your camera" />
                </div>
              </div>
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handlePhotoChange(e, 'camera')}
              className="hidden"
            />

            {/* Add from Gallery */}
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => handlePhotoChange(e as any, 'gallery');
                input.click();
              }}
              className="btn btn-lg btn-secondary w-full gap-2 h-auto p-4 flex-col"
              disabled={isSubmitting}
            >
              <ImageIcon className="w-6 h-6" />
              <div className="text-center">
                <div className="font-semibold"><TranslatedText text="Add from Gallery" /></div>
                <div className="text-xs opacity-80 font-normal">
                  <TranslatedText text="Choose existing photo" />
                </div>
              </div>
            </button>

            {/* Skip Photo */}
            <button
              onClick={handleSkipPhoto}
              className="btn btn-lg btn-outline w-full gap-2 h-auto p-4 flex-col"
              disabled={isSubmitting}
            >
              <Zap className="w-6 h-6" />
              <div className="text-center">
                <div className="font-semibold"><TranslatedText text="Skip Photo" /></div>
                <div className="text-xs opacity-80 font-normal">
                  <TranslatedText text="Log catch quickly (fastest)" />
                </div>
              </div>
            </button>

            <div className="alert alert-info mt-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">
                <TranslatedText text="Photos enable AI identification and save location automatically" />
              </span>
            </div>
          </div>
        )}

        {/* Step 2: Photo Captured - AI Identifying */}
        {currentStep === 'photo-captured' && (
          <div className="space-y-4">
            {/* Photo Preview */}
            {photoPreview && (
              <div className="bg-base-200 rounded-lg overflow-hidden">
                <div className="aspect-video w-full bg-base-300">
                  <img
                    src={photoPreview}
                    alt="Catch preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* AI Identifying State */}
            {isIdentifying && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
                <h4 className="font-semibold text-lg mb-2 flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <TranslatedText text="Identifying your catch..." />
                </h4>
                <p className="text-sm opacity-70">
                  <TranslatedText text="Using AI and regional species data" />
                </p>
              </div>
            )}

            {/* EXIF Info */}
            {exifData && (
              <div className="alert alert-info">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div className="text-xs">
                  {exifData.location && (
                    <div>
                      <TranslatedText text="Location" />: {exifData.location[0].toFixed(4)}°N, {exifData.location[1].toFixed(4)}°W
                    </div>
                  )}
                  {exifData.timestamp && (
                    <div>
                      <TranslatedText text="Captured" />: {exifData.timestamp.toLocaleString()}
                    </div>
                  )}
                  {!exifData.location && !exifData.timestamp && (
                    <div><TranslatedText text="No EXIF data found - using current location" /></div>
                  )}
                </div>
              </div>
            )}

            {/* AI Error */}
            {aiError && (
              <div className="alert alert-warning">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">
                  <TranslatedText text="AI identification unavailable - please select species manually" />
                </span>
              </div>
            )}

            {/* Continue Button - always show after photo is captured */}
            <button
              onClick={() => setCurrentStep('species-selection')}
              className="btn btn-primary btn-lg w-full"
              disabled={isSubmitting}
            >
              {isIdentifying ? (
                <>
                  <TranslatedText text="Skip AI & Continue" />
                </>
              ) : (
                <>
                  <TranslatedText text="Continue" />
                </>
              )}
            </button>

            {isIdentifying && (
              <p className="text-xs text-center opacity-60">
                <TranslatedText text="AI identification will continue in background" />
              </p>
            )}
          </div>
        )}

        {/* Step 3: Species Selection */}
        {currentStep === 'species-selection' && (
          <div className="space-y-4">
            {/* AI Result - High Confidence */}
            {aiResult && !Array.isArray(aiResult.species) && aiResult.confidence >= 0.7 && (
              <div className="card bg-success/10 border border-success/30">
                <div className="card-body p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="badge badge-success gap-2">
                      <Sparkles className="w-3 h-3" />
                      <TranslatedText text="AI Identified" />
                    </span>
                    <span className="text-sm font-semibold text-success">
                      {Math.round(aiResult.confidence * 100)}% <TranslatedText text="confident" />
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {aiResult.species.thumbnail && (
                      <div className="w-16 h-16 relative rounded overflow-hidden bg-base-200 flex-shrink-0">
                        <Image
                          src={aiResult.species.thumbnail}
                          alt={aiResult.species.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-semibold">{aiResult.species.name}</div>
                      {aiResult.species.scientificName && (
                        <div className="text-sm italic opacity-70">{aiResult.species.scientificName}</div>
                      )}
                      {aiResult.reasoning && (
                        <div className="text-xs mt-1 opacity-80">{aiResult.reasoning}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleSpeciesSelect(aiResult.species as QuickLogSpecies)}
                      className="btn btn-success btn-sm flex-1"
                    >
                      <Check className="w-4 h-4" />
                      <TranslatedText text="Correct!" />
                    </button>
                    <button
                      onClick={handleChangeSpecies}
                      className="btn btn-ghost btn-sm"
                    >
                      <TranslatedText text="Not right? Change" />
                    </button>
                  </div>

                  {aiResult.cost && (
                    <div className="text-xs opacity-60 mt-2 text-center">
                      💡 AI usage: €{aiResult.cost.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Result - Low Confidence or Manual */}
            {(!aiResult || aiResult.confidence < 0.7 || aiError) && (
              <>
                <div className="text-center mb-4">
                  <p className="text-sm opacity-70">
                    <TranslatedText text="What did you catch?" />
                  </p>
                  {aiResult && aiResult.confidence < 0.7 && (
                    <p className="text-xs opacity-50 mt-1">
                      <TranslatedText text="AI uncertain - please select manually" />
                    </p>
                  )}
                </div>

                {/* Regional Species Grid */}
                {loadingSpecies ? (
                  <div className="grid grid-cols-3 gap-3">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="aspect-square bg-base-200 animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {regionalSpecies.map((species) => (
                      <button
                        key={species.code}
                        onClick={() => handleSpeciesSelect(species)}
                        className="relative flex flex-col items-center p-2 rounded-lg border-2 transition-all hover:scale-105 hover:border-primary/50 border-base-300"
                      >
                        {/* Thumbnail */}
                        <div className="relative w-full aspect-square mb-1">
                          {species.thumbnail ? (
                            <Image
                              src={species.thumbnail}
                              alt={species.name}
                              fill
                              className="object-cover rounded"
                              sizes="100px"
                            />
                          ) : (
                            <div className="w-full h-full bg-base-200 rounded flex items-center justify-center text-2xl">
                              🐟
                            </div>
                          )}

                          {/* Confidence Badge */}
                          {species.badge && (
                            <div className="absolute -top-1 -right-1">
                              {species.badge === 'hot' && (
                                <span className="badge badge-xs badge-error">🔥</span>
                              )}
                              {species.badge === 'good' && (
                                <div className="w-2 h-2 bg-success rounded-full" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Name */}
                        <span className="text-xs font-medium text-center line-clamp-2 leading-tight">
                          {species.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Show All Species Toggle */}
                <div className="divider text-xs opacity-50">
                  <TranslatedText text="or search all species" />
                </div>
                {!showAllSpecies ? (
                  <button
                    onClick={() => setShowAllSpecies(true)}
                    className="btn btn-ghost btn-sm btn-block"
                  >
                    <Plus className="w-4 h-4" />
                    <TranslatedText text="Show all species" />
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {allSpecies.map((species) => (
                        <button
                          key={species.code}
                          onClick={() => handleSpeciesSelect(species)}
                          className="btn btn-sm btn-ghost justify-start w-full h-auto p-2 normal-case hover:btn-primary"
                        >
                          {species.thumbnail && (
                            <div className="w-8 h-8 relative rounded overflow-hidden flex-shrink-0 bg-base-200">
                              <Image
                                src={species.thumbnail}
                                alt={species.name}
                                fill
                                className="object-contain"
                                sizes="32px"
                              />
                            </div>
                          )}
                          <span className="text-sm truncate">{species.name}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowAllSpecies(false)}
                      className="btn btn-ghost btn-sm btn-block"
                    >
                      <TranslatedText text="Show less" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 4: Quantity Selection */}
        {currentStep === 'quantity' && selectedSpecies && (
          <div className="space-y-4">
            {/* Selected Species Display */}
            <div className="card bg-base-200">
              <div className="card-body p-4 flex-row items-center gap-3">
                {selectedSpecies.thumbnail && (
                  <div className="w-16 h-16 relative rounded overflow-hidden bg-base-300 flex-shrink-0">
                    <Image
                      src={selectedSpecies.thumbnail}
                      alt={selectedSpecies.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-semibold">{selectedSpecies.name}</div>
                  {selectedSpecies.scientificName && (
                    <div className="text-sm italic opacity-70">{selectedSpecies.scientificName}</div>
                  )}
                </div>
                <button
                  onClick={handleChangeSpecies}
                  className="btn btn-ghost btn-sm btn-circle"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quantity Controls */}
            <div className="text-center mb-2">
              <p className="text-sm opacity-70">
                <TranslatedText text="How many did you catch?" />
              </p>
            </div>

            {/* +/- Controls */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={decrementQuantity}
                className="btn btn-circle btn-lg"
                disabled={quantity <= 1}
              >
                <Minus className="w-6 h-6" />
              </button>
              <div className="text-4xl font-bold w-16 text-center">
                {quantity}
              </div>
              <button
                onClick={incrementQuantity}
                className="btn btn-circle btn-lg btn-primary"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>

            {/* Quick Quantity Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => setQuickQuantity(num)}
                  className={`btn ${quantity === num ? 'btn-primary' : 'btn-outline'}`}
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setQuickQuantity(15)}
                className={`btn ${quantity === 15 ? 'btn-primary' : 'btn-outline'}`}
              >
                <div className="flex flex-col items-center leading-tight">
                  <span className="text-xs">Loads!</span>
                  <span className="text-xs opacity-70">15+</span>
                </div>
              </button>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              className="btn btn-success btn-lg w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <TranslatedText text="Logging..." />
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <TranslatedText text="Log Catch" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 5: Success */}
        {currentStep === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-success rounded-full flex items-center justify-center">
              <Check className="w-10 h-10 text-success-content" />
            </div>
            <h4 className="text-2xl font-bold mb-2 text-success">
              <TranslatedText text="Catch Logged!" />
            </h4>
            {selectedSpecies && (
              <div className="text-lg mb-4">
                {quantity} × {selectedSpecies.name}
              </div>
            )}
            <div className="space-y-1 text-sm opacity-70">
              {rectangleCode && <div>📍 {rectangleCode}</div>}
              {photoFile && <div>📸 <TranslatedText text="Photo uploaded" /></div>}
              {exifData?.location && <div>📊 <TranslatedText text="Location saved" /></div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
