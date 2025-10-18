/**
 * QuickLogModal Component
 * 
 * Progressive disclosure modal for instant catch logging:
 * Step 1: Species selection (regional quick-picks + expandable full list)
 * Step 2: Quantity selection (1, 2, 3, "Loads!")
 * Step 3: Photo option (Take photo or skip)
 * 
 * Auto-captures: current time, location, weather conditions
 * Integrates with new catch logging hook infrastructure
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { X, Camera, AlertCircle, Zap, Plus } from 'lucide-react';
import { SPECIES_IMAGE_MAP, type SpeciesImageInfo } from '../../data/speciesImageMap';
import { TranslatedText } from '../translation/TranslatedFishCard';
import type { QuickLogParams } from '@/hooks/useCatchLogger';

// Types for the component
interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickLog: (params: QuickLogParams) => Promise<unknown>;
  onSuccess?: () => void;
  rectangleCode?: string; // Current ICES rectangle from context
}

type QuantityOption = 1 | 2 | 3 | 'loads';

// Regional species that appear as quick-pick buttons (most common catches)
const REGIONAL_QUICK_PICKS = [
  'MAC', // Atlantic Mackerel
  'SBA', // Sea Bass  
  'POL', // Pollack
  'GMU', // Grey Mullet
  'BBR', // Black Seabream
  'WHI', // Whiting
] as const;

async function requestUserLocation(): Promise<{ lat: number; lon: number } | null> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return null;
  }

  return await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );
  });
}

export function QuickLogModal({
  isOpen,
  onClose,
  onQuickLog,
  onSuccess,
  rectangleCode = '31E8',
}: QuickLogModalProps) {
  // Progressive disclosure steps
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  
  // Form state
  const [selectedSpecies, setSelectedSpecies] = useState<string>('');
  const [selectedQuantity, setSelectedQuantity] = useState<QuantityOption | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  
  // Show full species list when regional picks aren't enough
  const [showAllSpecies, setShowAllSpecies] = useState(false);

  const submissionDisabled = isSubmitting;
  
  // Get species info for display
  const getSpeciesInfo = useCallback((speciesCode: string): SpeciesImageInfo | null => {
    return SPECIES_IMAGE_MAP[speciesCode] || null;
  }, []);
  
  // Reset modal state when closed
  const handleClose = useCallback(() => {
    setCurrentStep(1);
    setSelectedSpecies('');
    setSelectedQuantity(null);
    setIsSubmitting(false);
    setError(null);
    setShowAllSpecies(false);
    setSelectedPhoto(null);
    setPhotoPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
    onClose();
  }, [onClose]);
  
  // Handle species selection and advance to quantity step
  const handleSpeciesSelect = useCallback((speciesCode: string) => {
    setSelectedSpecies(speciesCode);
    setCurrentStep(2);
    setError(null);
  }, []);
  
  // Handle quantity selection and advance to photo step
  const handleQuantitySelect = useCallback((quantity: QuantityOption) => {
    setSelectedQuantity(quantity);
    setCurrentStep(3);
  }, []);
  
  // Submit the catch log entry
  const handleSubmit = useCallback(async (photoFile: File | null) => {
    if (!selectedSpecies || !selectedQuantity) {
      setError('Missing required information');
      return;
    }
    
    const speciesInfo = getSpeciesInfo(selectedSpecies);
    if (!speciesInfo) {
      setError('Species information not found');
      return;
    }
    
    if (!photoFile) {
      setSelectedPhoto(null);
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const quantityValue = selectedQuantity === 'loads' ? 15 : selectedQuantity;

      let userLocation: QuickLogParams['userLocation'];
      try {
        userLocation = await requestUserLocation() ?? undefined;
      } catch (locationError) {
        console.warn('[QuickLogModal] Geolocation failed, continuing without coordinates:', locationError);
      }

      const outcome = await onQuickLog({
        speciesId: selectedSpecies,
        speciesCommonName: speciesInfo.name,
        scientificName: speciesInfo.scientificName ?? null,
        rectangleCode,
        quantity: quantityValue,
        photo: photoFile ?? null,
        userLocation,
      });

      if (outcome == null) {
        throw new Error('Quick log did not complete. Please try again.');
      }

      onSuccess?.();
      handleClose();

    } catch (err) {
      console.error('[QuickLogModal] Failed to log catch:', err);
      setError(err instanceof Error ? err.message : 'Failed to log catch');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedSpecies, selectedQuantity, rectangleCode, getSpeciesInfo, onQuickLog, onSuccess, handleClose]);

  const triggerPhotoCapture = useCallback(() => {
    if (submissionDisabled) return;
    setSelectedPhoto(null);
    setPhotoPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (photoInputRef.current) {
      photoInputRef.current.click();
    }
  }, [submissionDisabled]);

  const handlePhotoChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      // Allow selecting the same file again by resetting the input value immediately
      event.target.value = '';
      if (!file) {
        return;
      }
      setSelectedPhoto(file);
      void handleSubmit(file);
    },
    [handleSubmit]
  );

  useEffect(() => {
    if (!selectedPhoto) {
      setPhotoPreviewUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(selectedPhoto);
    setPhotoPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedPhoto]);
  
  // Get regional species for quick-pick buttons
  const regionalSpecies = REGIONAL_QUICK_PICKS.map(code => ({
    code,
    info: getSpeciesInfo(code)
  })).filter(({ info }) => info !== null);
  
  // Get all other species for expanded list
  const otherSpecies = Object.keys(SPECIES_IMAGE_MAP)
    .filter(code => !(REGIONAL_QUICK_PICKS as readonly string[]).includes(code))
    .map(code => ({
      code,
      info: getSpeciesInfo(code)
    }))
    .filter(({ info }) => info !== null)
    .sort((a, b) => a.info!.name.localeCompare(b.info!.name));
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80" 
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-base-100 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2 text-primary">
            <Zap className="w-5 h-5" />
            <TranslatedText text="Quick Log" />
          </h3>
          <button 
            onClick={handleClose} 
            className="btn btn-sm btn-circle btn-ghost"
            disabled={submissionDisabled}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Progress Steps */}
        <ul className="steps steps-horizontal w-full mb-6 text-xs">
          <li className={`step ${currentStep >= 1 ? 'step-primary' : ''}`}>
            <TranslatedText text="Species" />
          </li>
          <li className={`step ${currentStep >= 2 ? 'step-primary' : ''}`}>
            <TranslatedText text="Quantity" />
          </li>
          <li className={`step ${currentStep >= 3 ? 'step-primary' : ''}`}>
            <TranslatedText text="Photo" />
          </li>
        </ul>
        
        {/* Error Display */}
        {error && (
          <div className="alert alert-error mb-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        {/* Step 1: Species Selection */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm opacity-70 mb-4">
                <TranslatedText text="What did you catch?" />
              </p>
            </div>
            
            {/* Regional Quick-Pick Grid */}
            <div className="grid grid-cols-2 gap-3">
              {regionalSpecies.map(({ code, info }) => (
                <button
                  key={code}
                  onClick={() => handleSpeciesSelect(code)}
                  className="btn btn-outline h-auto p-3 flex flex-col gap-2 hover:btn-primary transition-colors"
                  disabled={submissionDisabled}
                >
                  {info?.thumb && (
                    <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-base-200">
                      <Image
                        src={info.thumb}
                        alt={info.name}
                        fill
                        className="object-contain"
                        sizes="48px"
                      />
                    </div>
                  )}
                  <span className="text-xs font-medium text-center leading-tight">
                    {info?.name}
                  </span>
                </button>
              ))}
            </div>
            
            {/* Expand to Show All Species */}
            <div className="divider text-xs opacity-50">
              <TranslatedText text="or choose from all species" />
            </div>
            
            {!showAllSpecies ? (
              <button
                onClick={() => setShowAllSpecies(true)}
                className="btn btn-ghost btn-block"
                disabled={submissionDisabled}
              >
                <Plus className="w-4 h-4" />
                <TranslatedText text="Show all species" />
              </button>
            ) : (
              <div className="space-y-2">
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {otherSpecies.map(({ code, info }) => (
                    <button
                      key={code}
                      onClick={() => handleSpeciesSelect(code)}
                      className="btn btn-sm btn-ghost justify-start w-full h-auto p-2 normal-case hover:btn-primary"
                      disabled={submissionDisabled}
                    >
                      {info?.thumb && (
                        <div className="w-8 h-8 relative rounded overflow-hidden flex-shrink-0 bg-base-200">
                          <Image
                            src={info.thumb}
                            alt={info.name}
                            fill
                            className="object-contain"
                            sizes="32px"
                          />
                        </div>
                      )}
                      <span className="text-sm truncate">{info?.name}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowAllSpecies(false)}
                  className="btn btn-ghost btn-sm btn-block"
                  disabled={submissionDisabled}
                >
                  <TranslatedText text="Show less" />
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Step 2: Quantity Selection */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm opacity-70 mb-2">
                <TranslatedText text="How many did you catch?" />
              </p>
              {selectedSpecies && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  {getSpeciesInfo(selectedSpecies)?.thumb && (
                    <div className="w-8 h-8 relative rounded overflow-hidden bg-base-200">
                      <Image
                        src={getSpeciesInfo(selectedSpecies)!.thumb!}
                        alt={getSpeciesInfo(selectedSpecies)!.name}
                        fill
                        className="object-contain"
                        sizes="32px"
                      />
                    </div>
                  )}
                  <span className="font-medium text-sm">
                    {getSpeciesInfo(selectedSpecies)?.name}
                  </span>
                </div>
              )}
            </div>
            
            {/* Quantity Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => handleQuantitySelect(num as QuantityOption)}
                  className="btn btn-lg btn-outline hover:btn-primary h-16"
                  disabled={submissionDisabled}
                >
                  <span className="text-2xl font-bold">{num}</span>
                </button>
              ))}
              <button
                onClick={() => handleQuantitySelect('loads')}
                className="btn btn-lg btn-primary h-16 col-span-1"
                disabled={submissionDisabled}
              >
                <div className="flex flex-col">
                  <span className="text-lg font-bold">Loads!</span>
                  <span className="text-xs opacity-80">15+</span>
                </div>
              </button>
            </div>
            
            {/* Back Button */}
            <button 
              onClick={() => setCurrentStep(1)} 
              className="btn btn-ghost btn-sm"
              disabled={submissionDisabled}
            >
              ← <TranslatedText text="Back" />
            </button>
          </div>
        )}
        
        {/* Step 3: Photo Option */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm opacity-70 mb-4">
                <TranslatedText text="Add a trophy photo?" />
              </p>
              
              {/* Summary */}
              {selectedSpecies && selectedQuantity && (
                <div className="bg-base-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {getSpeciesInfo(selectedSpecies)?.thumb && (
                      <div className="w-10 h-10 relative rounded overflow-hidden">
                        <Image
                          src={getSpeciesInfo(selectedSpecies)!.thumb!}
                          alt={getSpeciesInfo(selectedSpecies)!.name}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-sm">
                        {getSpeciesInfo(selectedSpecies)?.name}
                      </div>
                      <div className="text-xs opacity-70">
                        {selectedQuantity === 'loads' ? '15+ fish' : `${selectedQuantity} fish`}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Photo Action Buttons */}
            <div className="space-y-3">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                onClick={triggerPhotoCapture}
                className="btn btn-lg btn-primary w-full gap-2"
                disabled={submissionDisabled}
              >
                <Camera className="w-5 h-5" />
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    <TranslatedText text="Saving..." />
                  </>
                ) : (
                  <TranslatedText text="Capture Photo & Save" />
                )}
              </button>

              <button
                onClick={() => void handleSubmit(null)}
                className="btn btn-lg btn-outline w-full"
                disabled={submissionDisabled}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    <TranslatedText text="Saving..." />
                  </>
                ) : (
                  <TranslatedText text="Skip Photo - Save" />
                )}
              </button>
            </div>

            {photoPreviewUrl && !isSubmitting && (
              <div className="bg-base-200 rounded-lg p-3">
                <p className="text-xs font-medium mb-2">
                  <TranslatedText text="Preview" />
                </p>
                <div className="aspect-video w-full bg-base-300 rounded overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreviewUrl}
                    alt="Selected catch preview"
                    width={640}
                    height={360}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Auto-capture Info */}
            <div className="alert alert-info">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">
                <TranslatedText text="Time, location & conditions will be auto-saved" />
              </span>
            </div>
            
            {/* Back Button */}
            <button 
              onClick={() => setCurrentStep(2)} 
              className="btn btn-ghost btn-sm"
              disabled={submissionDisabled}
            >
              ← <TranslatedText text="Back" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
