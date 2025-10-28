/**
 * SessionLogModal Component
 * 
 * Detailed multi-step modal for logging complete fishing sessions:
 * - Multiple species catches in one session
 * - Date and time period selection  
 * - Habitat type and environmental context
 * - Multiple photo uploads
 * - Size categories and bait tracking
 * 
 * More comprehensive than QuickLog - for when users want to log
 * a full fishing trip with detailed information.
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  X, Calendar, Clock, MapPin, Camera, Plus, Trash2,
  Fish, Target, AlertCircle, Check
} from 'lucide-react';
import { SPECIES_IMAGE_MAP, type SpeciesImageInfo } from '../../data/speciesImageMap';
import { TranslatedText } from '../translation/TranslatedFishCard';
import type { CatchLogInput } from '@/types/findr-enrichment';

// Types
interface SessionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (catchCount: number) => void;
  onSubmitCatch: (input: CatchLogInput) => Promise<unknown>;
  rectangleCode?: string;
}

type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';
type SizeCategory = 'small' | 'average' | 'large' | 'mixed';
type HabitatType = 'rocky_shore' | 'sandy_beach' | 'pier_harbor' | 'estuary' | 'shallow_water' | 'deep_water' | 'wreck_reef' | 'open_sea';

interface CatchFormEntry {
  id: string; // Temporary ID for form management
  species_id: string;
  quantity: number;
  size_category: SizeCategory;
  bait_used: string;
  notes?: string;
}

// Regional species for dropdowns
const COMMON_SPECIES = ['MAC', 'SBA', 'POL', 'GMU', 'BBR', 'WHI', 'COD', 'PLE'] as const;

// Common baits for quick selection
const COMMON_BAITS = [
  'Lugworm',
  'Ragworm', 
  'Prawns',
  'Crab',
  'Feather rigs',
  'Spinners',
  'Soft plastics',
  'Bread',
  'Mackerel strip',
] as const;

// Habitat options
const HABITAT_OPTIONS: { value: HabitatType; label: string }[] = [
  { value: 'rocky_shore', label: 'Rocky Shore' },
  { value: 'sandy_beach', label: 'Sandy Beach' },
  { value: 'pier_harbor', label: 'Pier/Harbor' },
  { value: 'estuary', label: 'Estuary' },
  { value: 'shallow_water', label: 'Shallow Water' },
  { value: 'deep_water', label: 'Deep Water' },
  { value: 'wreck_reef', label: 'Wreck/Reef' },
  { value: 'open_sea', label: 'Open Sea' },
];

// Time period options
const TIME_PERIODS: { value: TimePeriod; label: string; hours: string }[] = [
  { value: 'morning', label: 'Morning', hours: '5AM - 12PM' },
  { value: 'afternoon', label: 'Afternoon', hours: '12PM - 6PM' },
  { value: 'evening', label: 'Evening', hours: '6PM - 10PM' },
  { value: 'night', label: 'Night', hours: '10PM - 5AM' },
];

const HABITAT_LABELS: Record<HabitatType, string> = {
  rocky_shore: 'Rocky Shore',
  sandy_beach: 'Sandy Beach',
  pier_harbor: 'Pier/Harbor',
  estuary: 'Estuary',
  shallow_water: 'Shallow Water',
  deep_water: 'Deep Water',
  wreck_reef: 'Wreck/Reef',
  open_sea: 'Open Sea',
};

const TIME_PERIOD_TO_TIME: Record<TimePeriod, string> = {
  morning: '08:00:00',
  afternoon: '14:00:00',
  evening: '19:00:00',
  night: '23:00:00',
};

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

export function SessionLogModal({
  isOpen,
  onClose,
  onSuccess,
  onSubmitCatch,
  rectangleCode = '31E8',
}: SessionLogModalProps) {
  // Form state
  const [sessionDate, setSessionDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  const [timePeriods, setTimePeriods] = useState<TimePeriod[]>(['afternoon']);
  const [habitat, setHabitat] = useState<HabitatType>('rocky_shore');
  const [durationHours, setDurationHours] = useState(2);
  const [catches, setCatches] = useState<CatchFormEntry[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  
  // UI state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Helper to get species info
  const getSpeciesInfo = useCallback((speciesCode: string): SpeciesImageInfo | null => {
    return SPECIES_IMAGE_MAP[speciesCode] || null;
  }, []);
  
  // Available species for dropdowns
  const availableSpecies = useMemo(() => {
    return Object.keys(SPECIES_IMAGE_MAP)
      .map(code => ({ code, info: getSpeciesInfo(code) }))
      .filter(({ info }) => info !== null)
      .sort((a, b) => {
        // Common species first, then alphabetical
        const aIsCommon = (COMMON_SPECIES as readonly string[]).includes(a.code);
        const bIsCommon = (COMMON_SPECIES as readonly string[]).includes(b.code);
        
        if (aIsCommon && !bIsCommon) return -1;
        if (!aIsCommon && bIsCommon) return 1;
        return a.info!.name.localeCompare(b.info!.name);
      });
  }, [getSpeciesInfo]);
  
  // Reset form when modal closes
  const handleClose = useCallback(() => {
    setCurrentStep(1);
    setSessionDate(new Date().toISOString().split('T')[0]);
    setTimePeriods(['afternoon']);
    setHabitat('rocky_shore');
    setCatches([]);
    setPhotos([]);
    setIsSubmitting(false);
    setError(null);
    onClose();
  }, [onClose]);
  
  // Time period management
  const toggleTimePeriod = useCallback((period: TimePeriod) => {
    setTimePeriods(prev => 
      prev.includes(period)
        ? prev.filter(p => p !== period)
        : [...prev, period].sort((a, b) => TIME_PERIODS.findIndex(tp => tp.value === a) - TIME_PERIODS.findIndex(tp => tp.value === b))
    );
  }, []);
  
  // Catch management
  const addCatch = useCallback(() => {
    const newCatch: CatchFormEntry = {
      id: `catch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      species_id: availableSpecies[0]?.code || 'MAC',
      quantity: 1,
      size_category: 'mixed',
      bait_used: COMMON_BAITS[0],
    };
    setCatches(prev => [...prev, newCatch]);
  }, [availableSpecies]);
  
  const updateCatch = useCallback((id: string, updates: Partial<CatchFormEntry>) => {
    setCatches(prev => prev.map(catch_ => 
      catch_.id === id ? { ...catch_, ...updates } : catch_
    ));
  }, []);
  
  const removeCatch = useCallback((id: string) => {
    setCatches(prev => prev.filter(catch_ => catch_.id !== id));
  }, []);
  
  // Photo management
  const handlePhotoAdd = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setPhotos(prev => [...prev, ...files].slice(0, 5)); // Max 5 photos
  }, []);
  
  const removePhoto = useCallback((index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  // Form validation
  const canProceedFromStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1: return sessionDate.length > 0 && timePeriods.length > 0 && durationHours > 0;
      case 2: return habitat.length > 0;
      case 3: return catches.length > 0 && catches.every(c => c.species_id && c.quantity > 0);
      case 4: return true; // Photos are optional
      default: return false;
    }
  }, [sessionDate, timePeriods, durationHours, habitat, catches]);
  
  // Submit the session
  const handleSubmit = useCallback(async () => {
    if (!canProceedFromStep(3)) {
      setError('Please complete all required fields');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Convert session date to ISO timestamp for each catch
      const representativeTime = timePeriods.length
        ? TIME_PERIOD_TO_TIME[timePeriods[0]]
        : null;

      const userLocation = await requestUserLocation();
      const primaryPhoto = photos[0] ?? null;

      for (const [index, catch_] of catches.entries()) {
        const speciesInfo = getSpeciesInfo(catch_.species_id);
        if (!speciesInfo) {
          throw new Error(`Species information not found for ${catch_.species_id}`);
        }

        const notesSegments = [
          `Bait: ${catch_.bait_used}`,
          `Habitat: ${HABITAT_LABELS[habitat] ?? habitat}`,
          timePeriods.length ? `Time: ${timePeriods.map(period => period.replace('_', ' ')).join(' & ')}` : null,
          catch_.notes ? `Notes: ${catch_.notes}` : null,
        ].filter(Boolean);

        const env: Record<string, string | number> = {
          session_time_periods: timePeriods.join(', '),
          session_duration_hours: durationHours,
          session_habitat: habitat,
          bait_used: catch_.bait_used,
        };

        if (photos.length > 0) {
          env.session_photo_count = photos.length;
        };

        const result = await onSubmitCatch({
          speciesId: catch_.species_id,
          speciesCommonName: speciesInfo.name,
          scientificName: speciesInfo.scientificName ?? null,
          rectangleCode,
          catchDate: sessionDate,
          catchTime: representativeTime,
          quantity: catch_.quantity,
          sizeCategory: catch_.size_category,
          baitUsed: catch_.bait_used,
          habitatType: habitat,
          method: 'shore',
          notes: notesSegments.join(' | ') || undefined,
          entryType: 'detailed',
          photo: index === 0 ? primaryPhoto : null,
          userLocation: userLocation ?? undefined,
          environmentalConditions: env,
        });

        if (result == null) {
          throw new Error('Session catch failed to log; please try again.');
        }
      }

      // Success
      onSuccess(catches.length);
      handleClose();
      
    } catch (err) {
      console.error('[SessionLogModal] Failed to log session:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to log session';

      // Provide helpful context for authentication errors
      if (errorMessage.includes('Authentication') || errorMessage.includes('auth')) {
        setError('You need to sign in to log catches. Please sign in and try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    catches,
    sessionDate,
    timePeriods,
    habitat,
    rectangleCode,
    photos,
    durationHours,
    getSpeciesInfo,
    onSubmitCatch,
    onSuccess,
    handleClose,
    canProceedFromStep,
  ]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={handleClose} />
      
      {/* Modal */}
      <div className="relative bg-base-100 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2 text-secondary">
            <Calendar className="w-5 h-5" />
            <TranslatedText text="Log Session" />
          </h3>
          <button 
            onClick={handleClose} 
            className="btn btn-sm btn-circle btn-ghost"
            disabled={isSubmitting}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Progress Steps */}
        <ul className="steps steps-horizontal w-full mb-6 text-xs">
          <li className={`step ${currentStep >= 1 ? 'step-secondary' : ''}`}>
            <TranslatedText text="When" />
          </li>
          <li className={`step ${currentStep >= 2 ? 'step-secondary' : ''}`}>
            <TranslatedText text="Where" />
          </li>
          <li className={`step ${currentStep >= 3 ? 'step-secondary' : ''}`}>
            <TranslatedText text="Catches" />
          </li>
          <li className={`step ${currentStep >= 4 ? 'step-secondary' : ''}`}>
            <TranslatedText text="Photos" />
          </li>
        </ul>
        
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
        
        {/* Step 1: Date & Time */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm opacity-70">
                <TranslatedText text="When did you go fishing?" />
              </p>
            </div>
            
            {/* Date Selection */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  <TranslatedText text="Date" />
                </span>
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="input input-bordered"
                max={new Date().toISOString().split('T')[0]} // Can't be future
                disabled={isSubmitting}
              />
            </div>
            
            {/* Time Periods */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  <Clock className="w-4 h-4 inline mr-2" />
                  <TranslatedText text="Time periods" /> 
                  <span className="text-xs opacity-60 ml-1">
                    (<TranslatedText text="select all that apply" />)
                  </span>
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TIME_PERIODS.map(period => (
                  <button
                    key={period.value}
                    onClick={() => toggleTimePeriod(period.value)}
                    className={`btn btn-sm h-auto p-3 ${
                      timePeriods.includes(period.value) ? 'btn-secondary' : 'btn-outline'
                    }`}
                    disabled={isSubmitting}
                  >
                    <div className="text-center">
                      <div className="font-medium text-sm">{period.label}</div>
                      <div className="text-xs opacity-70">{period.hours}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  <Clock className="w-4 h-4 inline mr-2" />
                  <TranslatedText text="Duration (hours)" />
                </span>
              </label>
              <input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={durationHours}
                onChange={(e) => setDurationHours(Math.max(0.5, Number(e.target.value) || 0.5))}
                className="input input-bordered"
                disabled={isSubmitting}
              />
            </div>
            
            {/* Navigation */}
            <div className="flex justify-end">
              <button
                onClick={() => setCurrentStep(2)}
                className="btn btn-secondary"
                disabled={!canProceedFromStep(1) || isSubmitting}
              >
                <TranslatedText text="Next" /> →
              </button>
            </div>
          </div>
        )}
        
        {/* Step 2: Location & Habitat */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm opacity-70">
                <TranslatedText text="Where did you fish?" />
              </p>
            </div>
            
            {/* Current Location Context */}
            <div className="bg-base-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium">ICES Rectangle:</span>
                <span className="font-mono">{rectangleCode}</span>
              </div>
            </div>
            
            {/* Habitat Selection */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  <Target className="w-4 h-4 inline mr-2" />
                  <TranslatedText text="Habitat type" />
                </span>
              </label>
              <select
                value={habitat}
                onChange={(e) => setHabitat(e.target.value as HabitatType)}
                className="select select-bordered"
                disabled={isSubmitting}
              >
                {HABITAT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="btn btn-ghost"
                disabled={isSubmitting}
              >
                ← <TranslatedText text="Back" />
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="btn btn-secondary"
                disabled={!canProceedFromStep(2) || isSubmitting}
              >
                <TranslatedText text="Next" /> →
              </button>
            </div>
          </div>
        )}
        
        {/* Step 3: Catches */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm opacity-70">
                <TranslatedText text="What did you catch?" />
              </p>
              <button
                onClick={addCatch}
                className="btn btn-sm btn-primary"
                disabled={isSubmitting}
              >
                <Plus className="w-4 h-4" />
                <TranslatedText text="Add Catch" />
              </button>
            </div>
            
            {/* Catch Entries */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {catches.map((catch_, index) => (
                <div key={catch_.id} className="bg-base-200 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Catch #{index + 1}</span>
                    {catches.length > 1 && (
                      <button
                        onClick={() => removeCatch(catch_.id)}
                        className="btn btn-sm btn-ghost btn-circle text-error"
                        disabled={isSubmitting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Species & Quantity Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-control">
                      <label className="label-text text-xs font-medium">Species</label>
                      <select
                        value={catch_.species_id}
                        onChange={(e) => updateCatch(catch_.id, { species_id: e.target.value })}
                        className="select select-sm select-bordered"
                        disabled={isSubmitting}
                      >
                        {availableSpecies.map(({ code, info }) => (
                          <option key={code} value={code}>
                            {info?.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-control">
                      <label className="label-text text-xs font-medium">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={catch_.quantity}
                        onChange={(e) => updateCatch(catch_.id, { quantity: parseInt(e.target.value) || 1 })}
                        className="input input-sm input-bordered"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  
                  {/* Size & Bait Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="form-control">
                      <label className="label-text text-xs font-medium">Size</label>
                      <select
                        value={catch_.size_category}
                        onChange={(e) => updateCatch(catch_.id, { size_category: e.target.value as SizeCategory })}
                        className="select select-sm select-bordered"
                        disabled={isSubmitting}
                      >
                        <option value="small">Small</option>
                        <option value="average">Average</option>
                        <option value="large">Large</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>
                    
                    <div className="form-control">
                      <label className="label-text text-xs font-medium">Bait</label>
                      <select
                        value={catch_.bait_used}
                        onChange={(e) => updateCatch(catch_.id, { bait_used: e.target.value })}
                        className="select select-sm select-bordered"
                        disabled={isSubmitting}
                      >
                        {COMMON_BAITS.map(bait => (
                          <option key={bait} value={bait}>{bait}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Notes */}
                  <div className="form-control">
                    <textarea
                      placeholder="Notes (optional)"
                      value={catch_.notes || ''}
                      onChange={(e) => updateCatch(catch_.id, { notes: e.target.value })}
                      className="textarea textarea-sm textarea-bordered resize-none"
                      rows={2}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            {catches.length === 0 && (
              <div className="text-center py-8 text-base-content/60">
                <Fish className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  <TranslatedText text="No catches added yet" />
                </p>
                <p className="text-xs">
                  <TranslatedText text="Click 'Add Catch' to log what you caught" />
                </p>
              </div>
            )}
            
            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="btn btn-ghost"
                disabled={isSubmitting}
              >
                ← <TranslatedText text="Back" />
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="btn btn-secondary"
                disabled={!canProceedFromStep(3) || isSubmitting}
              >
                <TranslatedText text="Next" /> →
              </button>
            </div>
          </div>
        )}
        
        {/* Step 4: Photos */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm opacity-70">
                <TranslatedText text="Add photos of your catch (optional)" />
              </p>
            </div>
            
            {/* Photo Upload */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  <Camera className="w-4 h-4 inline mr-2" />
                  <TranslatedText text="Photos" /> 
                  <span className="text-xs opacity-60 ml-1">
                    ({photos.length}/5)
                  </span>
                </span>
              </label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoAdd}
                className="file-input file-input-bordered"
                disabled={isSubmitting || photos.length >= 5}
              />
            </div>
            
            {/* Photo Previews */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square bg-base-200 rounded-lg overflow-hidden">
                    <div 
                      className="w-full h-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${URL.createObjectURL(photo)})` }}
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 btn btn-xs btn-circle btn-error"
                      disabled={isSubmitting}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Session Summary */}
            <div className="bg-success/10 rounded-lg p-3 border border-success/20">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                <TranslatedText text="Session Summary" />
              </h4>
              <div className="text-xs space-y-1 text-base-content/80">
                <div>📅 {sessionDate} • {timePeriods.join(', ')}</div>
                <div>⏱️ {durationHours} h</div>
                <div>🎯 {HABITAT_OPTIONS.find(h => h.value === habitat)?.label}</div>
                <div>🐟 {catches.length} catch{catches.length !== 1 ? 'es' : ''} • {catches.reduce((sum, c) => sum + c.quantity, 0)} fish total</div>
                {photos.length > 0 && <div>📸 {photos.length} photo{photos.length !== 1 ? 's' : ''}</div>}
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(3)}
                className="btn btn-ghost"
                disabled={isSubmitting}
              >
                ← <TranslatedText text="Back" />
              </button>
              <button
                onClick={handleSubmit}
                className="btn btn-success"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    <TranslatedText text="Logging..." />
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <TranslatedText text="Save Session" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
