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
import { useAuth } from '@/context/AuthContext';
import { SPECIES_IMAGE_MAP } from '@/data/speciesImageMap';
import { TranslatedText } from '../translation/TranslatedFishCard';
import type { QuickLogParams } from '@/hooks/useCatchLogger';
import { COMMON_BAITS, HABITAT_OPTIONS } from './baitHabitatOptions';
import { getCurrentPosition, GeolocationException } from '@/lib/capacitor/geolocation';
import { takePicture, selectFromGallery, CameraException } from '@/lib/capacitor/camera';

// Types
interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickLog: (params: QuickLogParams) => Promise<unknown>;
  onSuccess?: () => void;
  rectangleCode?: string;
}

type Step = 'photo-decision' | 'photo-captured' | 'species-selection' | 'quantity' | 'extra-details' | 'submitting' | 'success';
type HabitatType = 'rocky_shore' | 'sandy_beach' | 'pier_harbor' | 'estuary' | 'shallow_water' | 'deep_water' | 'wreck_reef' | 'open_sea';

interface ExifData {
  location?: [number, number];
  timestamp?: Date;
}

// European species codes (~40 popular species)
const EUROPEAN_SPECIES_CODES = new Set([
  'BSS',      // Sea Bass
  'COD',      // Atlantic Cod
  'MAC',      // Mackerel
  'POL',      // Pollack
  'POK',      // Atlantic Pollock (Saithe)
  'PLE',      // Plaice
  'FLE',      // Flounder
  'SOL',      // Dover Sole
  'BLL',      // Brill
  'TUR',      // Turbot
  'DAB',      // Dab
  'WHG',      // Whiting
  'LIN',      // Common Ling
  'CON',      // Conger Eel
  'MUG',      // Grey Mullet
  'MUL',      // Red Mullet
  'SBA',      // Sea Bream (Dorada)
  'BRS',      // Black Seabream
  '2BD-BREAM', // Two-banded Seabream
  'RJC',      // Thornback Ray
  'RJM',      // Spotted Ray
  'CSH',      // Common Smoothhound
  'SSH',      // Starry Smoothhound
  'BUH',      // Bull Huss
  'SQC',      // Common Squid
  'CUT',      // Common Cuttlefish
  'OCT',      // Common Octopus
  'HOM',      // Horse Mackerel
  'BONITO',   // Atlantic Bonito
  'GAR',      // Garfish
  'WRB',      // Ballan Wrasse
  'WRC',      // Cuckoo Wrasse
  'DEX',      // Dentex
  'HAD',      // Haddock
  'HAL',      // Atlantic Halibut
  'JOD',      // John Dory
  'MEAGRE',   // Meagre
  'RED-PORGY', // Red Porgy
  'SBR',      // Red Seabream
  'TRS',      // Sea Trout
  'ATS',      // Atlantic Salmon
]);

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

// Helper to convert data URL to File object
async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
}

// Main component
export function QuickLogModal({
  isOpen,
  onClose,
  onQuickLog,
  onSuccess,
  rectangleCode: propRectangleCode,
}: QuickLogModalProps) {
  // Context
  const { user, loading: authLoading } = useAuth();
  const { location, updateLocation } = useUnifiedLocation();

  // Get rectangle code from coordinates if not in location context
  const [lookupRectangleCode, setLookupRectangleCode] = useState<string | undefined>(
    propRectangleCode || location?.rectangleCode || undefined
  );

  useEffect(() => {
    console.log('[QuickLogModal] Rectangle lookup effect:', {
      propRectangleCode,
      locationRectangleCode: location?.rectangleCode,
      lat: location?.lat,
      lon: location?.lon
    });

    // Priority: prop > location context > lookup from API
    if (propRectangleCode) {
      console.log('[QuickLogModal] Using prop rectangleCode:', propRectangleCode);
      setLookupRectangleCode(propRectangleCode);
      return;
    }

    if (location?.rectangleCode) {
      console.log('[QuickLogModal] Using location context rectangleCode:', location.rectangleCode);
      setLookupRectangleCode(location.rectangleCode);
      return;
    }

    // Otherwise, look up rectangleCode from coordinates
    if (location?.lat && location?.lon) {
      const url = `/api/findr/rectangle-lookup?lat=${location.lat}&lon=${location.lon}`;
      console.log('[QuickLogModal] Fetching rectangleCode from API:', url);

      fetch(url)
        .then(res => {
          console.log('[QuickLogModal] Rectangle lookup response status:', res.status);
          return res.json();
        })
        .then(data => {
          console.log('[QuickLogModal] Rectangle lookup data:', data);
          if (data.rectangleCode) {
            console.log('[QuickLogModal] Setting rectangleCode:', data.rectangleCode);
            setLookupRectangleCode(data.rectangleCode);
          } else {
            console.warn('[QuickLogModal] No rectangleCode in response');
          }
        })
        .catch(err => {
          console.error('[QuickLogModal] Failed to lookup rectangleCode:', err);
        });
    } else {
      console.warn('[QuickLogModal] Cannot lookup rectangle - missing lat/lon');
    }
  }, [location?.lat, location?.lon, location?.rectangleCode, propRectangleCode]);

  // Location-aware species (max 8 for quick selection)
  const { species: regionalSpecies, isLoading: loadingSpecies } = useQuickLogSpecies(
    location?.lat || 43.5, // Fallback coordinates
    location?.lon || -5.25,
    {
      maxSpecies: 8,
      rectangleCode: lookupRectangleCode
    }
  );

  // Request location when modal opens
  useEffect(() => {
    if (isOpen && !location?.lat && !location?.lon && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      console.log('[QuickLogModal] Requesting location...');

      // Use Capacitor geolocation wrapper (native on iOS/Android, web fallback in browser)
      getCurrentPosition()
        .then((position) => {
          console.log('[QuickLogModal] Location received:', position.coords);
          updateLocation({
            coordinates: {
              lat: position.coords.latitude,
              lon: position.coords.longitude
            },
            source: 'gps',
            accuracy: position.coords.accuracy ?? null,
            resolveRectangle: true
          }).catch((err: Error) => {
            console.warn('[QuickLogModal] Failed to update location:', err);
          });
        })
        .catch((err: unknown) => {
          if (err instanceof GeolocationException) {
            console.warn('[QuickLogModal] Location request failed:', err.type, err.message);
          } else {
            console.warn('[QuickLogModal] Location request failed:', err);
          }
          // Fallback to default location (Asturias coast, Spain) for development/testing
          console.log('[QuickLogModal] Using fallback location for testing');
          updateLocation({
            coordinates: {
              lat: 43.5139,
              lon: -5.2706
            },
            source: 'manual',
            resolveRectangle: true
          }).catch((fallbackErr: Error) => {
            console.error('[QuickLogModal] Fallback location also failed:', fallbackErr);
          });
        });
    }
  }, [isOpen, location?.lat, location?.lon, updateLocation]);

  // Debug log
  useEffect(() => {
    console.log('[QuickLogModal] Species loaded:', {
      count: regionalSpecies.length,
      loading: loadingSpecies,
      rectangleCode: lookupRectangleCode,
      location: {
        lat: location?.lat,
        lon: location?.lon,
        rectangleCodeFromContext: location?.rectangleCode
      }
    });
  }, [regionalSpecies, loadingSpecies, location, lookupRectangleCode]);

  // AI identification
  const { identify, isIdentifying, result: aiResult, error: aiError } = useFishIdentification({
    onSuccess: (result) => {
      // Store original AI suggestion for tracking
      if (!Array.isArray(result.species) && result.method === 'ai') {
        setOriginalAiSuggestion({
          species: result.species,
          confidence: result.confidence,
          method: result.method,
          reasoning: result.reasoning
        });
      }

      // Auto-add AI result to selection if high confidence and single species
      if (
        !Array.isArray(result.species) &&
        result.method === 'ai' &&
        result.confidence >= 0.7
      ) {
        setSelectedSpecies([result.species]);
      }
    }
  });

  // State
  const [currentStep, setCurrentStep] = useState<Step>('photo-decision');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [exifData, setExifData] = useState<ExifData | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState<QuickLogSpecies[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [baitUsed, setBaitUsed] = useState<string>('');
  const [habitatType, setHabitatType] = useState<HabitatType | ''>('');
  const [notes, setNotes] = useState<string>('');
  const [requestingLocation, setRequestingLocation] = useState<boolean>(false);
  const [showAllSpecies, setShowAllSpecies] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI tracking state - store original AI suggestion for feedback tracking
  const [originalAiSuggestion, setOriginalAiSuggestion] = useState<{
    species: QuickLogSpecies;
    confidence: number;
    method: string;
    reasoning?: string;
  } | null>(null);

  // Refs
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Handle photo from Capacitor camera wrapper
  const handleCameraCapture = useCallback(async () => {
    try {
      const photo = await takePicture({ quality: 90 });

      // Convert data URL to File object
      const file = await dataUrlToFile(photo.dataUrl, `catch-photo-${Date.now()}.${photo.format}`);

      setPhotoFile(file);
      setPhotoPreview(photo.dataUrl); // Use data URL directly for preview

      // Extract EXIF data
      const exif = await extractExif(file);
      setExifData(exif);

      // Move to captured step
      setCurrentStep('photo-captured');

      // Trigger AI identification (same logic as handlePhotoChange)
      let candidateSpecies = regionalSpecies;
      if (candidateSpecies.length === 0) {
        candidateSpecies = Object.keys(SPECIES_IMAGE_MAP)
          .filter(code => EUROPEAN_SPECIES_CODES.has(code))
          .slice(0, 8)
          .map(code => {
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
          });
      }

      if (candidateSpecies.length > 0) {
        const context = {
          location: {
            coords: exif?.location || (location?.lat && location?.lon ? [location.lat, location.lon] : undefined),
            rectangleCode: lookupRectangleCode,
            rectangleLabel: location?.rectangleLabel,
          }
        };

        void identify(file, candidateSpecies, context);
      }
    } catch (err) {
      if (err instanceof CameraException) {
        if (err.type === 'CANCELLED') {
          console.log('[QuickLogModal] User cancelled camera');
        } else {
          console.error('[QuickLogModal] Camera error:', err.type, err.message);
        }
      } else {
        console.error('[QuickLogModal] Unexpected camera error:', err);
      }
    }
  }, [regionalSpecies, identify, location, lookupRectangleCode]);

  // Handle photo from gallery
  const handleGallerySelect = useCallback(async () => {
    try {
      const photo = await selectFromGallery({ quality: 90 });

      // Convert data URL to File object
      const file = await dataUrlToFile(photo.dataUrl, `catch-photo-${Date.now()}.${photo.format}`);

      setPhotoFile(file);
      setPhotoPreview(photo.dataUrl);

      // Extract EXIF data
      const exif = await extractExif(file);
      setExifData(exif);

      // Move to captured step
      setCurrentStep('photo-captured');

      // Trigger AI identification
      let candidateSpecies = regionalSpecies;
      if (candidateSpecies.length === 0) {
        candidateSpecies = Object.keys(SPECIES_IMAGE_MAP)
          .filter(code => EUROPEAN_SPECIES_CODES.has(code))
          .slice(0, 8)
          .map(code => {
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
          });
      }

      if (candidateSpecies.length > 0) {
        const context = {
          location: {
            coords: exif?.location || (location?.lat && location?.lon ? [location.lat, location.lon] : undefined),
            rectangleCode: lookupRectangleCode,
            rectangleLabel: location?.rectangleLabel,
          }
        };

        void identify(file, candidateSpecies, context);
      }
    } catch (err) {
      if (err instanceof CameraException) {
        if (err.type === 'CANCELLED') {
          console.log('[QuickLogModal] User cancelled gallery');
        } else {
          console.error('[QuickLogModal] Gallery error:', err.type, err.message);
        }
      } else {
        console.error('[QuickLogModal] Unexpected gallery error:', err);
      }
    }
  }, [regionalSpecies, identify, location, lookupRectangleCode]);

  // Skip photo and go directly to species selection
  const handleSkipPhoto = useCallback(() => {
    setCurrentStep('species-selection');
  }, []);

  // Request GPS location
  const handleRequestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      console.error('[QuickLogModal] Geolocation not supported');
      return;
    }

    setRequestingLocation(true);

    // Use Capacitor geolocation wrapper (native on iOS/Android, web fallback in browser)
    getCurrentPosition()
      .then((position) => {
        console.log('[QuickLogModal] GPS location received:', position.coords);
        updateLocation({
          coordinates: {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          },
          source: 'gps',
          accuracy: position.coords.accuracy ?? null,
          resolveRectangle: true
        }).catch((err: Error) => {
          console.warn('[QuickLogModal] Failed to update location:', err);
        }).finally(() => {
          setRequestingLocation(false);
        });
      })
      .catch((err: unknown) => {
        if (err instanceof GeolocationException) {
          console.warn('[QuickLogModal] Location request failed:', err.type, err.message);
        } else {
          console.warn('[QuickLogModal] Location request failed:', err);
        }
        setRequestingLocation(false);
      });
  }, [updateLocation]);

  // Species selection handlers (multi-select)
  const handleSpeciesToggle = useCallback((species: QuickLogSpecies) => {
    setSelectedSpecies(prev => {
      const exists = prev.find(s => s.id === species.id);
      if (exists) {
        // Remove if already selected
        return prev.filter(s => s.id !== species.id);
      } else {
        // Add if not selected
        return [...prev, species];
      }
    });
  }, []);

  // Quick select for AI results or "Show all" list - single species selection
  const handleQuickSpeciesSelect = useCallback((species: QuickLogSpecies) => {
    setSelectedSpecies([species]);
    setCurrentStep('quantity');
  }, []);

  const handleContinueToQuantity = useCallback(() => {
    if (selectedSpecies.length > 0) {
      setCurrentStep('quantity');
    }
  }, [selectedSpecies]);

  const handleContinueToExtraDetails = useCallback(() => {
    setCurrentStep('extra-details');
  }, []);

  const handleChangeSpecies = useCallback(() => {
    setSelectedSpecies([]);
    setCurrentStep('species-selection');
  }, []);

  // Quantity handlers
  const incrementQuantity = useCallback(() => setQuantity(q => q + 1), []);
  const decrementQuantity = useCallback(() => setQuantity(q => Math.max(1, q - 1)), []);
  const setQuickQuantity = useCallback((q: number) => setQuantity(q), []);

  // Submit handler - handles multiple species
  const handleSubmit = useCallback(async () => {
    if (selectedSpecies.length === 0) {
      setError('Please select at least one species');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Use EXIF location if available, otherwise current location
      const userLocation = exifData?.location
        ? { lat: exifData.location[0], lon: exifData.location[1] }
        : (location?.lat && location?.lon ? { lat: location.lat, lon: location.lon } : undefined);

      // Submit all selected species as separate catches
      const results: { species: QuickLogSpecies; success: boolean; error?: string }[] = [];

      for (const species of selectedSpecies) {
        const speciesInfo = SPECIES_IMAGE_MAP[species.code];

        // Calculate AI tracking fields
        let aiWasCorrected = false;
        let aiGaveUp = false;
        let identificationSource: 'ai' | 'manual' | 'ai_corrected' | 'ai_gave_up' | null = null;

        if (originalAiSuggestion) {
          // AI made a suggestion
          if (originalAiSuggestion.method === 'manual_selection' || originalAiSuggestion.confidence < 0.7) {
            // AI had low confidence and showed manual selection
            aiGaveUp = true;
            identificationSource = 'ai_gave_up';
          } else if (species.id !== originalAiSuggestion.species.id) {
            // User selected different species than AI suggested
            aiWasCorrected = true;
            identificationSource = 'ai_corrected';
          } else {
            // User accepted AI suggestion
            identificationSource = 'ai';
          }
        } else {
          // No AI suggestion (manual entry)
          identificationSource = 'manual';
        }

        try {
          console.log('[QuickLog] Submitting species:', species.name, {
            speciesId: species.id,
            rectangleCode: lookupRectangleCode,
            quantity,
            hasPhoto: !!photoFile,
            userLocation,
            aiTracking: {
              originalSuggestion: originalAiSuggestion?.species.name,
              wasCorrected: aiWasCorrected,
              gaveUp: aiGaveUp,
              source: identificationSource
            }
          });

          const result = await onQuickLog({
            speciesId: species.id,
            speciesCommonName: speciesInfo?.name || species.name,
            scientificName: species.scientificName,
            rectangleCode: lookupRectangleCode ?? null,
            quantity,
            photo: photoFile ?? undefined,
            userLocation,
            catchDate: exifData?.timestamp
              ? exifData.timestamp.toISOString().split('T')[0]
              : undefined,
            catchTime: exifData?.timestamp
              ? exifData.timestamp.toISOString().split('T')[1]?.slice(0, 8)
              : undefined,
            baitUsed: baitUsed || null,
            habitatType: habitatType || null,
            notes: notes || null,
            // AI tracking fields
            aiSuggestedSpeciesId: originalAiSuggestion?.species.id || null,
            aiSuggestedSpeciesName: originalAiSuggestion?.species.name || null,
            aiConfidence: originalAiSuggestion?.confidence || null,
            aiMethod: (originalAiSuggestion?.method as 'cache' | 'database' | 'visual' | 'ai' | 'manual_selection') || null,
            aiReasoning: originalAiSuggestion?.reasoning || null,
            aiWasCorrected,
            aiGaveUp,
            identificationSource,
          });

          console.log('[QuickLog] Result for', species.name, ':', result);

          if (result == null) {
            console.error('[QuickLog] Got null result for species:', species.name);
            results.push({ species, success: false, error: 'API returned null - check server logs' });
          } else {
            console.log('[QuickLog] Success for', species.name);
            results.push({ species, success: true });
          }
        } catch (speciesErr) {
          console.error('[QuickLog] Error logging species', species.name, ':', speciesErr);
          const errMsg = speciesErr instanceof Error ? speciesErr.message : String(speciesErr);
          results.push({ species, success: false, error: errMsg });
        }
      }

      // Check if all failed
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      if (successCount === 0) {
        // All failed
        const firstError = results.find(r => r.error)?.error || 'Failed to log catches';
        if (firstError.includes('Authentication') || firstError.toLowerCase().includes('auth')) {
          throw new Error('You need to sign in to log catches. Please sign in and try again.');
        } else {
          throw new Error(`Failed to log catches: ${firstError}`);
        }
      } else if (failedCount > 0) {
        // Partial success
        console.warn('[QuickLog] Partial success:', { successCount, failedCount, results });
      }

      // Show success even if partial
      setCurrentStep('success');
      onSuccess?.();

      // Auto-close after 2 seconds
      setTimeout(() => {
        // Reset state
        setCurrentStep('photo-decision');
        setPhotoFile(null);
        setPhotoPreview(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setExifData(null);
        setSelectedSpecies([]);
        setQuantity(1);
        setShowAllSpecies(false);
        setError(null);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('[QuickLog] Failed to log catch:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to log catch';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedSpecies, quantity, baitUsed, habitatType, notes, photoFile, exifData, location, lookupRectangleCode, onQuickLog, onSuccess, onClose, originalAiSuggestion]);

  // Skip extra details and submit directly
  const handleSkipExtraDetails = useCallback(() => {
    // Clear extra details fields
    setBaitUsed('');
    setHabitatType('');
    setNotes('');
    // Submit immediately
    void handleSubmit();
  }, [handleSubmit]);

  // Close handler with cleanup
  const handleClose = useCallback(() => {
    setCurrentStep('photo-decision');
    setPhotoFile(null);
    setPhotoPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setExifData(null);
    setSelectedSpecies([]);
    setQuantity(1);
    setBaitUsed('');
    setHabitatType('');
    setNotes('');
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
      selectedSpecies.length === 0
    ) {
      // If AI auto-selected (high confidence), go to quantity
      if (!Array.isArray(aiResult.species) && aiResult.confidence >= 0.7) {
        setCurrentStep('quantity');
      } else {
        // Otherwise show species selection
        setCurrentStep('species-selection');
      }
    }
  }, [currentStep, isIdentifying, aiResult, selectedSpecies.length]);

  // All species list (filtered to European species only)
  const allSpecies = Object.keys(SPECIES_IMAGE_MAP)
    .filter(code => EUROPEAN_SPECIES_CODES.has(code))
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
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={handleClose} />

      {/* Modal (bottom-sheet on mobile, dialog on desktop) */}
      <div className="relative bg-base-100 rounded-t-2xl md:rounded-2xl p-4 md:p-6 w-full md:max-w-md mx-0 md:mx-4 shadow-2xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto">
        {/* Grab handle (mobile only) */}
        <div className="md:hidden flex justify-center mb-2">
          <div className="w-10 h-1.5 bg-base-300 rounded-full" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg flex items-center gap-2 text-primary">
            <Zap className="w-5 h-5" />
            <TranslatedText text="Add your catch" />
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

        {/* Authentication Check - Show before allowing any actions */}
        {!authLoading && !user ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-warning/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-warning" />
            </div>
            <h4 className="text-xl font-bold text-base-content">
              <TranslatedText text="Sign In Required" />
            </h4>
            <p className="text-base-content/70">
              <TranslatedText text="You need to sign in to log catches and track your fishing activity." />
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/findr/auth" className="btn btn-primary btn-lg">
                <TranslatedText text="Sign In / Sign Up" />
              </Link>
              <button onClick={handleClose} className="btn btn-ghost">
                <TranslatedText text="Maybe Later" />
              </button>
            </div>
          </div>
        ) : authLoading ? (
          <div className="text-center py-8">
            <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
            <p className="text-sm opacity-70">
              <TranslatedText text="Checking authentication..." />
            </p>
          </div>
        ) : (
          <>
            {/* Step 1: Photo Decision */}
            {currentStep === 'photo-decision' && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <p className="text-sm opacity-70">
                <TranslatedText text="Take a new photo or choose one you already have." />
              </p>
            </div>

            {/* Take Photo - Uses Capacitor camera wrapper */}
            <button
              onClick={handleCameraCapture}
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

            {/* Add from Gallery - Uses Capacitor gallery wrapper */}
            <button
              onClick={handleGallerySelect}
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

            {/* Skip Photo (slimmer, full width) */}
            <button
              onClick={handleSkipPhoto}
              className="btn btn-outline w-full h-12 md:h-12 rounded-xl"
              disabled={isSubmitting}
              aria-label="Skip Photo and log manually"
            >
                <span className="font-semibold">
                  <TranslatedText text="Skip Photo → Manual Log" />
                </span>
              </button>
            </div>

            <div className="alert alert-info mt-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">
                <TranslatedText text="Photos unlock smart species ID + GPS tagging" />
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
                <div className="aspect-video w-full bg-base-300 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="Catch preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Loading Regional Species */}
            {loadingSpecies && (
              <div className="text-center py-8">
                <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
                <h4 className="font-semibold text-lg mb-2">
                  <TranslatedText text="Loading regional species..." />
                </h4>
                <p className="text-sm opacity-70">
                  <TranslatedText text="Finding fish in your area" />
                </p>
              </div>
            )}

            {/* AI Identifying State */}
            {!loadingSpecies && isIdentifying && (
              <div className="text-center py-8">
                <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
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
                <div className="text-xs flex-1">
                  {exifData.location && (
                    <div>
                      <TranslatedText text="Location" />: {Math.abs(exifData.location[0]).toFixed(4)}°{exifData.location[0] >= 0 ? 'N' : 'S'}, {Math.abs(exifData.location[1]).toFixed(4)}°{exifData.location[1] >= 0 ? 'E' : 'W'}
                    </div>
                  )}
                  {exifData.timestamp && (
                    <div>
                      <TranslatedText text="Captured" />: {exifData.timestamp.toLocaleString()}
                    </div>
                  )}
                  {!exifData.location && !exifData.timestamp && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span><TranslatedText text="No location data in photo" /></span>
                      <button
                        onClick={handleRequestLocation}
                        disabled={requestingLocation}
                        className="btn btn-xs btn-primary"
                      >
                        {requestingLocation ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <TranslatedText text="Getting location..." />
                          </>
                        ) : (
                          <TranslatedText text="Use my GPS location" />
                        )}
                      </button>
                    </div>
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
            {/* Loading Regional Species */}
            {loadingSpecies && (
              <div className="text-center py-8">
                <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
                <h4 className="font-semibold text-lg mb-2">
                  <TranslatedText text="Loading regional species..." />
                </h4>
                <p className="text-sm opacity-70">
                  <TranslatedText text="Finding fish in your area" />
                </p>
              </div>
            )}

            {/* AI Result - High Confidence */}
            {!loadingSpecies && aiResult && !Array.isArray(aiResult.species) && aiResult.confidence >= 0.7 && (
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
                      <div className="font-semibold text-base-content">{aiResult.species.name}</div>
                      {aiResult.species.scientificName && (
                        <div className="text-sm italic text-base-content/70">{aiResult.species.scientificName}</div>
                      )}
                      {aiResult.reasoning && (
                        <div className="text-xs mt-1 text-base-content/80">{aiResult.reasoning}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleQuickSpeciesSelect(aiResult.species as QuickLogSpecies)}
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
            {!loadingSpecies && (!aiResult || aiResult.confidence < 0.7 || aiError) && (
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

                {/* Regional Species Grid - Max 8 species in 4x2 layout */}
                {loadingSpecies ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="aspect-square bg-base-200 animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : regionalSpecies.length > 0 ? (
                  <>
                    <div className="grid grid-cols-4 gap-2">
                      {regionalSpecies.map((species) => {
                        const isSelected = selectedSpecies.some(s => s.id === species.id);
                        return (
                          <button
                            key={species.code}
                            onClick={() => handleSpeciesToggle(species)}
                            className={`relative flex flex-col items-center p-2 rounded-lg border-2 transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/10 scale-105'
                                : 'border-base-300 hover:border-primary/50 hover:scale-105'
                            }`}
                          >
                            {/* Checkbox indicator */}
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center z-10">
                                <Check className="w-3 h-3 text-primary-content" />
                              </div>
                            )}

                            {/* Thumbnail */}
                            <div className="relative w-full aspect-square mb-1 bg-base-200 rounded">
                              {species.thumbnail ? (
                                <Image
                                  src={species.thumbnail}
                                  alt={species.name}
                                  fill
                                  className="object-contain rounded"
                                  sizes="80px"
                                />
                              ) : (
                                <div className="w-full h-full bg-base-200 rounded flex items-center justify-center text-xl">
                                  🐟
                                </div>
                              )}

                              {/* Confidence Badge */}
                              {species.badge && !isSelected && (
                                <div className="absolute top-0 left-0">
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
                            <span className="text-xs font-medium text-center line-clamp-2 leading-tight text-base-content">
                              {species.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Continue Button */}
                    {selectedSpecies.length > 0 && (
                      <button
                        onClick={handleContinueToQuantity}
                        className="btn btn-primary btn-block mt-4"
                      >
                        <TranslatedText text="Continue with" /> {selectedSpecies.length} <TranslatedText text={selectedSpecies.length === 1 ? "species" : "species"} />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6 space-y-3">
                    {!location?.lat || !location?.lon || !lookupRectangleCode ? (
                      <>
                        <AlertCircle className="w-12 h-12 mx-auto text-warning/50" />
                        <div>
                          <p className="text-sm font-medium mb-1">
                            <TranslatedText text="Location needed for predictions" />
                          </p>
                          <p className="text-xs opacity-60">
                            <TranslatedText text="Let us use your GPS to show likely species in your area" />
                          </p>
                        </div>
                        <button
                          onClick={handleRequestLocation}
                          disabled={requestingLocation}
                          className="btn btn-primary btn-sm"
                        >
                          {requestingLocation ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <TranslatedText text="Getting location..." />
                            </>
                          ) : (
                            <TranslatedText text="Use my GPS location" />
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-sm opacity-60">
                          <TranslatedText text="No predictions available for this location" />
                        </p>
                        <p className="text-xs opacity-50">
                          <TranslatedText text="Use the search below to find your species" />
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Show All Species Toggle */}
                <div className="divider text-xs opacity-50">
                  <TranslatedText text="or browse more species" />
                </div>
                {!showAllSpecies ? (
                  <button
                    onClick={() => setShowAllSpecies(true)}
                    className="btn btn-ghost btn-sm btn-block"
                  >
                    <Plus className="w-4 h-4" />
                    <TranslatedText text="Browse species list" />
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {allSpecies.map((species) => (
                        <button
                          key={species.code}
                          onClick={() => handleQuickSpeciesSelect(species)}
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
        {currentStep === 'quantity' && selectedSpecies.length > 0 && (
          <div className="space-y-4">
            {/* Selected Species Display */}
            <div className="card bg-base-200">
              <div className="card-body p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-base-content">
                    {selectedSpecies.length === 1 ? (
                      <TranslatedText text="Selected species" />
                    ) : (
                      <>
                        <TranslatedText text="Selected" /> {selectedSpecies.length} <TranslatedText text="species" />
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleChangeSpecies}
                    className="btn btn-ghost btn-sm btn-circle"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedSpecies.map((species) => (
                    <div key={species.id} className="flex items-center gap-3">
                      {species.thumbnail && (
                        <div className="w-12 h-12 relative rounded overflow-hidden bg-base-300 flex-shrink-0">
                          <Image
                            src={species.thumbnail}
                            alt={species.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-base-content">{species.name}</div>
                        {species.scientificName && (
                          <div className="text-xs italic opacity-70 truncate text-base-content">{species.scientificName}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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

            {/* Continue or Skip to Extra Details */}
            <div className="flex gap-2">
              <button
                onClick={handleSkipExtraDetails}
                className="btn btn-ghost flex-1"
                disabled={isSubmitting}
              >
                <TranslatedText text="Skip & Log" />
              </button>
              <button
                onClick={handleContinueToExtraDetails}
                className="btn btn-primary flex-1"
                disabled={isSubmitting}
              >
                <Plus className="w-5 h-5" />
                <TranslatedText text="Add Details" />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Extra Details (Optional) */}
        {currentStep === 'extra-details' && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold mb-2">
                <TranslatedText text="Extra Details (Optional)" />
              </h3>
              <p className="text-sm opacity-70">
                <TranslatedText text="Help improve predictions by sharing more details" />
              </p>
            </div>

            {/* Bait Used */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">
                  <TranslatedText text="Bait Used" />
                </span>
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {COMMON_BAITS.map((bait) => (
                  <button
                    key={bait}
                    onClick={() => setBaitUsed(bait)}
                    className={`btn btn-sm ${baitUsed === bait ? 'btn-primary' : 'btn-outline'}`}
                  >
                    {bait}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Or type your own..."
                className="input input-bordered w-full"
                value={baitUsed}
                onChange={(e) => setBaitUsed(e.target.value)}
              />
            </div>

            {/* Habitat Type */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">
                  <TranslatedText text="Habitat" />
                </span>
              </label>
              <select
                className="select select-bordered w-full"
                value={habitatType}
                onChange={(e) => setHabitatType(e.target.value as HabitatType | '')}
              >
                <option value="">Select habitat...</option>
                {HABITAT_OPTIONS.map((habitat) => (
                  <option key={habitat.value} value={habitat.value}>
                    {habitat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">
                  <TranslatedText text="Notes" />
                </span>
              </label>
              <textarea
                className="textarea textarea-bordered h-24"
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
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

        {/* Step 6: Success */}
        {currentStep === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-success rounded-full flex items-center justify-center">
              <Check className="w-10 h-10 text-success-content" />
            </div>
            <h4 className="text-2xl font-bold mb-2 text-success">
              <TranslatedText text="Catch Logged!" />
            </h4>
            {selectedSpecies.length > 0 && (
              <div className="text-lg mb-4">
                {selectedSpecies.length === 1 ? (
                  <div>{quantity} × {selectedSpecies[0].name}</div>
                ) : (
                  <div>
                    {quantity} × <TranslatedText text="each of" /> {selectedSpecies.length} <TranslatedText text="species" />
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1 text-sm opacity-70">
              {lookupRectangleCode && <div>📍 {lookupRectangleCode}</div>}
              {photoFile && <div>📸 <TranslatedText text="Photo uploaded" /></div>}
              {exifData?.location && <div>📊 <TranslatedText text="Location saved" /></div>}
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
