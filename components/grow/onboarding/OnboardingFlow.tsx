'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Checkbox } from '../../ui/checkbox';
// Input removed — using InlineLocationSearch instead
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription } from '../../ui/alert';
import { Separator } from '../../ui/separator';
import { cn } from '../../ui/utils';
import { api } from '../../../lib/grow/api';
import { auth } from '../../../lib/grow/auth';
import {
  Loader2,
  MapPin,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sprout,
} from 'lucide-react';
import InlineLocationSearch from './InlineLocationSearch';
import PlantSuggestionsStep, { type SelectedPlant } from './PlantSuggestionsStep';

interface OnboardingFlowProps {
  className?: string;
  onComplete?: (result: OnboardingResult) => void;
}

interface OnboardingResult {
  location: string;
  gardenFeatures: string[];
  soilType: string;
  sunExposure: string;
  moisture: string;
  interests: string[];
  climateZone?: string;
  latitude?: number;
  longitude?: number;
  elevation?: number;
  activities: string[];
  selectedPlants: SelectedPlant[];
}

interface LocationMeta {
  climateZone?: string;
  latitude?: number;
  longitude?: number;
  elevation?: number;
  rawResponse?: Record<string, unknown>;
}

type Step = 0 | 1 | 2 | 3;

type GardenFeatureOption = {
  id: string;
  label: string;
  description: string;
  emoji: string;
};

type SimpleOption = {
  id: string;
  label: string;
  description?: string;
  emoji?: string;
};

const gardenFeatureOptions: GardenFeatureOption[] = [
  { id: 'lawn', label: 'Lawn', description: 'Grass areas or turf you maintain', emoji: '🌿' },
  { id: 'veg_plot', label: 'Vegetable Plot', description: 'Outdoor vegetable beds', emoji: '🥕' },
  { id: 'greenhouse_heated', label: 'Greenhouse (Heated)', description: 'Controlled environment growing', emoji: '🏡' },
  { id: 'greenhouse_unheated', label: 'Greenhouse (Unheated)', description: 'Season extension without heating', emoji: '🌤️' },
  { id: 'containers', label: 'Containers & Pots', description: 'Raised beds, pots or planters', emoji: '🪴' },
  { id: 'balcony', label: 'Balcony / Small Space', description: 'Compact growing areas', emoji: '🌇' },
  { id: 'wild_area', label: 'Wild Area', description: 'Pollinator or naturalised areas', emoji: '🦋' },
  { id: 'orchard', label: 'Orchard / Fruit Trees', description: 'Tree fruit or espalier plantings', emoji: '🍎' },
];

const soilTypeOptions: SimpleOption[] = [
  { id: 'clay', label: 'Clay', description: 'Heavy, holds water, slow to warm', emoji: '🧱' },
  { id: 'sandy', label: 'Sandy', description: 'Drains quickly, low fertility', emoji: '🏖️' },
  { id: 'loam', label: 'Loam', description: 'Balanced, ideal for most crops', emoji: '\u2B50' },
  { id: 'silty', label: 'Silty', description: 'Smooth, retains moisture', emoji: '🌀' },
  { id: 'peaty', label: 'Peaty', description: 'Rich organic matter, acidic', emoji: '🍂' },
  { id: 'chalky', label: 'Chalky', description: 'Alkaline, free draining', emoji: '\u2728' },
];

const sunExposureOptions: SimpleOption[] = [
  { id: 'full_sun', label: 'Full Sun', description: '6+ hours direct sun', emoji: '☀️' },
  { id: 'partial_sun', label: 'Partial Sun', description: '3-6 hours sun', emoji: '⛅' },
  { id: 'shade', label: 'Shade', description: '<3 hours sun', emoji: '🌙' },
];

const moistureOptions: SimpleOption[] = [
  { id: 'dry', label: 'Dry', description: 'Drains quickly or drought prone', emoji: '🏜️' },
  { id: 'moist', label: 'Moist', description: 'Even moisture most of the year', emoji: '💧' },
  { id: 'wet', label: 'Wet', description: 'Poor drainage or waterlogged', emoji: '🌧️' },
];

const interestOptions: SimpleOption[] = [
  { id: 'flowers', label: 'Flowers', emoji: '🌸' },
  { id: 'lawn_care', label: 'Lawn Care', emoji: '🌿' },
  { id: 'ornamental_trees', label: 'Ornamental Trees', emoji: '🌳' },
  { id: 'fruit_trees', label: 'Fruit Trees', emoji: '🍎' },
  { id: 'vegetables', label: 'Vegetables', emoji: '🥦' },
  { id: 'herbs', label: 'Herbs', emoji: '🌿' },
  { id: 'wildlife', label: 'Wildlife & Pollinators', emoji: '🦋' },
  { id: 'indoor_plants', label: 'Indoor Plants', emoji: '🪴' },
];

const featureActivityMap: Record<string, string[]> = {
  lawn: ['lawn-care', 'mowing', 'feeding'],
  veg_plot: ['vegetable-planting', 'soil-prep', 'crop-protection'],
  greenhouse_heated: ['seed-starting', 'season-extension'],
  greenhouse_unheated: ['hardening-off', 'season-extension'],
  containers: ['container-gardening', 'watering'],
  balcony: ['small-space-gardening', 'container-gardening'],
  wild_area: ['wildlife-support', 'pollinator-care'],
  orchard: ['fruit-tree-pruning', 'fruit-tree-feeding'],
};

const interestActivityMap: Record<string, string[]> = {
  flowers: ['flower-care', 'deadheading'],
  lawn_care: ['lawn-care', 'scarifying'],
  ornamental_trees: ['pruning', 'shaping'],
  fruit_trees: ['fruit-tree-pruning', 'disease-monitoring'],
  vegetables: ['succession-planting', 'vegetable-planting'],
  herbs: ['herb-care', 'harvesting'],
  wildlife: ['pollinator-support', 'habitat-building'],
  indoor_plants: ['indoor-watering', 'repotting'],
};
const totalSteps: Step[] = [0, 1, 2, 3];

const defaultFormState = {
  location: '',
  gardenFeatures: [] as string[],
  soilType: '',
  sunExposure: '',
  moisture: '',
  interests: [] as string[],
};

const isBrowser = typeof window !== 'undefined';

function deriveActivities(formState: typeof defaultFormState) {
  const activitySet = new Set<string>();

  formState.gardenFeatures.forEach((feature) => {
    featureActivityMap[feature]?.forEach((activity) => activitySet.add(activity));
  });

  formState.interests.forEach((interest) => {
    interestActivityMap[interest]?.forEach((activity) => activitySet.add(activity));
  });

  if (formState.moisture === 'dry') {
    activitySet.add('water-management');
  }
  if (formState.moisture === 'wet') {
    activitySet.add('drainage-and-aeration');
  }
  if (formState.sunExposure === 'shade') {
    activitySet.add('shade-planting');
  }

  return Array.from(activitySet);
}

function mergeIntoLocalStorage(updates: Partial<OnboardingResult>) {
  if (!isBrowser) {
    return;
  }

  try {
    const existing = window.localStorage.getItem('userInterests');
    const parsed = existing ? JSON.parse(existing) : {};
    const merged = { ...parsed, ...updates };
    window.localStorage.setItem('userInterests', JSON.stringify(merged));
  } catch (error) {
    console.warn('Failed to update onboarding preferences in storage:', error);
  }
}

export function OnboardingFlow({ className, onComplete }: OnboardingFlowProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(0);
  const [formState, setFormState] = useState(defaultFormState);
  const [locationMeta, setLocationMeta] = useState<LocationMeta>({});
  const [selectedPlants, setSelectedPlants] = useState<SelectedPlant[]>([]);
  const [stepError, setStepError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const session = await auth.getSession();
        if (!isMounted) {
          return;
        }
        setIsAuthenticated(Boolean(session));
      } catch (error) {
        if (isMounted) {
          setIsAuthenticated(false);
          console.error('Unable to verify session during onboarding:', error);
        }
      } finally {
        if (isMounted) {
          setAuthReady(true);
        }
      }
    };

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isBrowser) {
      return;
    }

    try {
      const stored = window.localStorage.getItem('userInterests');
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as Partial<OnboardingResult>;
      setFormState((previous) => ({
        ...previous,
        location: typeof parsed.location === 'string' ? parsed.location : previous.location,
        gardenFeatures: Array.isArray(parsed.gardenFeatures) ? parsed.gardenFeatures : previous.gardenFeatures,
        soilType: typeof parsed.soilType === 'string' ? parsed.soilType : previous.soilType,
        sunExposure: typeof parsed.sunExposure === 'string' ? parsed.sunExposure : previous.sunExposure,
        moisture: typeof parsed.moisture === 'string' ? parsed.moisture : previous.moisture,
        interests: Array.isArray(parsed.interests) ? parsed.interests : previous.interests,
      }));

      setLocationMeta({
        climateZone: typeof parsed.climateZone === 'string' ? parsed.climateZone : undefined,
        latitude: typeof parsed.latitude === 'number' ? parsed.latitude : undefined,
        longitude: typeof parsed.longitude === 'number' ? parsed.longitude : undefined,
        elevation: typeof parsed.elevation === 'number' ? parsed.elevation : undefined,
      });
    } catch (error) {
      console.warn('Failed to load saved onboarding preferences:', error);
    }
  }, []);

  const progressPercent = useMemo(() => ((currentStep + 1) / totalSteps.length) * 100, [currentStep]);
  const activities = useMemo(() => deriveActivities(formState), [formState]);
  const markOnboardingComplete = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('grow:onboarding-complete', 'true');
  }, []);

  const stepTitles = [
    'Garden Basics',
    'Growing Conditions',
    'Interests & Focus',
    'Pick Your First Plants',
  ];

  const validateStep = (step: Step) => {
    switch (step) {
      case 0:
        if (!formState.location.trim()) {
          return 'Please tell us where you garden so we can personalise conditions.';
        }
        return null;
      case 1:
        if (!formState.soilType) {
          return 'Select the soil type that best matches your garden.';
        }
        if (!formState.sunExposure) {
          return 'Choose how much sun your main growing area receives.';
        }
        if (!formState.moisture) {
          return 'Let us know the moisture trend so we can tailor watering advice.';
        }
        return null;
      case 2:
        if (formState.interests.length === 0) {
          return 'Pick at least one area you want Grow Daisy to prioritise.';
        }
        return null;
      case 3:
        // Plant suggestions step — no required selection
        return null;
      default:
        return null;
    }
  };

  const goToNextStep = async () => {
    const error = validateStep(currentStep);
    if (error) {
      setStepError(error);
      return;
    }

    setStepError(null);

    if (currentStep === 0) {
      setIsBusy(true);
      setStatusMessage('Checking your location with Grow Daisy...');
      try {
        const response = await api.updateUserLocation(formState.location.trim());
        const meta: LocationMeta = {
          climateZone: typeof response?.climate_zone === 'string' ? response.climate_zone : undefined,
        };

        if (response?.coordinates && typeof response.coordinates === 'object') {
          const coords = response.coordinates as { lat?: number; lon?: number };
          if (typeof coords.lat === 'number') {
            meta.latitude = coords.lat;
          }
          if (typeof coords.lon === 'number') {
            meta.longitude = coords.lon;
          }
        }

        if (typeof response?.elevation === 'number') {
          meta.elevation = response.elevation;
        }

        meta.rawResponse = response ?? undefined;
        setLocationMeta(meta);
        mergeIntoLocalStorage({
          location: formState.location.trim(),
          climateZone: meta.climateZone,
          latitude: meta.latitude,
          longitude: meta.longitude,
          elevation: meta.elevation,
          gardenFeatures: formState.gardenFeatures,
        });
        setStatusMessage(meta.climateZone ? `Climate zone detected: ${meta.climateZone}` : 'Location saved successfully.');
        setCurrentStep((prev) => (prev + 1) as Step);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'We could not save that location. Please try again.';
        setStepError(message);
      } finally {
        setIsBusy(false);
        setTimeout(() => setStatusMessage(null), 2500);
      }
      return;
    }

    setCurrentStep((prev) => (prev + 1) as Step);
  };

  const goToPreviousStep = () => {
    setStepError(null);
    setStatusMessage(null);
    setCurrentStep((prev) => {
      if (prev === 0) {
        return 0;
      }

      const currentIndex = totalSteps.findIndex((step) => step === prev);
      const nextIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
      return totalSteps[nextIndex] ?? 0;
    });
  };

  const handleSubmit = async () => {
    const error = validateStep(3);
    if (error) {
      setStepError(error);
      return;
    }

    setStepError(null);
    setIsSubmitting(true);
    setStatusMessage('Saving your Grow Daisy profile...');

    const result: OnboardingResult = {
      location: formState.location.trim(),
      gardenFeatures: formState.gardenFeatures,
      soilType: formState.soilType,
      sunExposure: formState.sunExposure,
      moisture: formState.moisture,
      interests: formState.interests,
      climateZone: locationMeta.climateZone,
      latitude: locationMeta.latitude,
      longitude: locationMeta.longitude,
      elevation: locationMeta.elevation,
      activities,
      selectedPlants,
    };

    const payload: Record<string, unknown> = {
      location: result.location,
      garden_features: result.gardenFeatures,
      soil_type: result.soilType,
      sun_exposure: result.sunExposure,
      moisture: result.moisture,
      interests: result.interests,
      climate_zone: result.climateZone,
      latitude: result.latitude,
      longitude: result.longitude,
      elevation: result.elevation,
      activities: result.activities,
    };

    // Include selected plants so the server auto-adds them
    if (selectedPlants.length > 0) {
      payload.selectedPlants = selectedPlants;
    }

    try {
      await api.updateUserInterests(payload);
      await api.completeOnboarding(payload);
      markOnboardingComplete();
      mergeIntoLocalStorage(result);
      setStatusMessage('Profile saved. Preparing your personalised dashboard...');
      if (onComplete) {
        onComplete(result);
      }
      setTimeout(() => {
        router.push('/grow');
      }, 600);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not save your preferences. Please try again.';
      setStepError(message);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setStatusMessage(null), 2500);
    }
  };

  const handleSkipOnboarding = useCallback(async () => {
    if (isBusy || isSubmitting) {
      return;
    }

    setStepError(null);
    setStatusMessage('Skipping onboarding...');
    setIsSubmitting(true);

    try {
      await api.completeOnboarding({ skipped: true });
      markOnboardingComplete();
      setTimeout(() => {
        router.push('/grow');
      }, 300);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'We could not skip onboarding right now. Please try again.';
      setStepError(message);
    } finally {
      setIsSubmitting(false);
      setIsBusy(false);
      setTimeout(() => setStatusMessage(null), 2500);
    }
  }, [isBusy, isSubmitting, markOnboardingComplete, router]);

  const toggleFeature = (featureId: string, checked: boolean) => {
    setFormState((previous) => ({
      ...previous,
      gardenFeatures: checked
        ? Array.from(new Set([...previous.gardenFeatures, featureId]))
        : previous.gardenFeatures.filter((value) => value !== featureId),
    }));
  };

  const toggleInterest = (interestId: string) => {
    setFormState((previous) => ({
      ...previous,
      interests: previous.interests.includes(interestId)
        ? previous.interests.filter((value) => value !== interestId)
        : [...previous.interests, interestId],
    }));
  };

  const selectSingle = (key: 'soilType' | 'sunExposure' | 'moisture', value: string) => {
    setFormState((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Where is your garden based?</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <div className="pl-10">
                  <InlineLocationSearch
                    initialQuery={formState.location}
                    placeholder="e.g. Portland, OR or 97205"
                    onSelect={(loc) => {
                      setFormState((previous) => ({ ...previous, location: loc.name }));
                      setLocationMeta((prev) => ({ ...prev, latitude: loc.lat, longitude: loc.lon }));
                    }}
                    storageKey="coastal_recent_locations_v1"
                    legacyKey="recentCoastalLocations"
                    showMapToggle={true}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                We use your location to calculate frost dates, daylight hours, and local weather patterns.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide">Garden Features</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {gardenFeatureOptions.map((feature) => {
                  const checked = formState.gardenFeatures.includes(feature.id);
                  return (
                    <label
                      key={feature.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md',
                        'focus-within:outline-none focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-2',
                        checked
                          ? 'border-emerald-300 bg-emerald-50 scale-[1.02] shadow-lg'
                          : 'border-border hover:border-primary'
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggleFeature(feature.id, Boolean(value))}
                        className="mt-1"
                        indicator={<Sprout className="w-4 h-4 text-emerald-500" />}
                      />
                      <span>
                        <span className="flex items-center gap-2 font-medium">
                          <span>{feature.emoji}</span>
                          {feature.label}
                        </span>
                        <span className="block text-sm text-muted-foreground">{feature.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {locationMeta.climateZone && (
              <Alert>
                <AlertDescription>
                  We detected climate zone <strong>{locationMeta.climateZone}</strong>. Grow Daisy will tailor your calendar accordingly.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide mb-2">Soil Type</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {soilTypeOptions.map((option) => {
                  const active = formState.soilType === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => selectSingle('soilType', option.id)}
                      className={cn(
                        'rounded-lg border p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-md',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                        active
                          ? 'border-emerald-300 bg-emerald-50 scale-[1.02] shadow-lg'
                          : 'border-border hover:border-primary'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-medium">
                          <span>{option.emoji}</span>
                          {option.label}
                        </span>
                        {active && <Sprout className="w-5 h-5 text-emerald-500" />}
                      </div>
                      <span className="block text-sm text-muted-foreground">{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide mb-2">Sun Exposure</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {sunExposureOptions.map((option) => {
                  const active = formState.sunExposure === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => selectSingle('sunExposure', option.id)}
                      className={cn(
                        'rounded-lg border p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-md',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                        active
                          ? 'border-emerald-300 bg-emerald-50 scale-[1.02] shadow-lg'
                          : 'border-border hover:border-primary'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-medium">
                          <span>{option.emoji}</span>
                          {option.label}
                        </span>
                        {active && <Sprout className="w-5 h-5 text-emerald-500" />}
                      </div>
                      <span className="block text-sm text-muted-foreground">{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide mb-2">Soil Moisture Trend</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {moistureOptions.map((option) => {
                  const active = formState.moisture === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => selectSingle('moisture', option.id)}
                      className={cn(
                        'rounded-lg border p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-md',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                        active
                          ? 'border-emerald-300 bg-emerald-50 scale-[1.02] shadow-lg'
                          : 'border-border hover:border-primary'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-medium">
                          <span>{option.emoji}</span>
                          {option.label}
                        </span>
                        {active && <Sprout className="w-5 h-5 text-emerald-500" />}
                      </div>
                      <span className="block text-sm text-muted-foreground">{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold uppercase text-muted-foreground tracking-wide mb-3">What should we focus on first?</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {interestOptions.map((option) => {
                  const active = formState.interests.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleInterest(option.id)}
                      className={cn(
                        'rounded-lg border p-4 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-md',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                        active
                          ? 'border-emerald-300 bg-emerald-50 scale-[1.02] shadow-lg'
                          : 'border-border hover:border-primary'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-medium">
                          <span>{option.emoji}</span>
                          {option.label}
                        </span>
                        {active && <Sprout className="w-5 h-5 text-emerald-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <Card className="border-dashed bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Preview of personalised suggestions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {activities.length === 0 ? (
                  <p>Select a focus area to see the kinds of guidance we will highlight.</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {activities.map((activity) => (
                      <li key={activity}>
                        <Badge variant="secondary" className="font-normal motion-safe:animate-scale-in">{activity.replace(/-/g, ' ')}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <PlantSuggestionsStep
              interests={formState.interests}
              climateZone={locationMeta.climateZone}
              selectedPlants={selectedPlants}
              onSelectionChange={setSelectedPlants}
            />

            {/* Summary card */}
            <Card className="bg-white border border-l-4 border-l-green-500 border-green-200 motion-safe:animate-scale-in">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-5 w-5 text-green-600 motion-safe:animate-check-pop" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Location:</strong> {formState.location || 'Not set'}{locationMeta.climateZone ? ` \u2022 Climate zone ${locationMeta.climateZone}` : ''}</p>
                <p><strong>Focus areas:</strong> {formState.interests.length ? formState.interests.join(', ') : 'None selected'}</p>
                {selectedPlants.length > 0 && (
                  <p><strong>Starting plants:</strong> {selectedPlants.map((p) => p.name).join(', ')}</p>
                )}
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  if (!authReady) {
    return (
      <div className={cn('flex min-h-[60vh] items-center justify-center', className)}>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Checking your session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={cn('mx-auto max-w-2xl space-y-6 p-6', className)}>
        <Card>
          <CardHeader>
            <CardTitle>Sign in to continue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please sign in to Grow Daisy before completing onboarding. Your preferences are linked to your account so we can sync them across devices.
            </p>
            <Button onClick={() => router.push('/login?returnTo=/grow/onboarding')}>
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('mx-auto max-w-4xl space-y-6 p-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-600" />
            Grow Daisy Onboarding
          </h1>
          <p className="text-sm text-muted-foreground">
            Help us learn about your garden so we can deliver the most relevant guidance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {totalSteps.length}
          </span>
          <button
            type="button"
            onClick={handleSkipOnboarding}
            disabled={isBusy || isSubmitting}
            className="hidden sm:inline-flex text-sm text-muted-foreground underline hover:text-foreground disabled:opacity-50"
          >
            Skip onboarding
          </button>
        </div>
      </div>

      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-2 rounded-full bg-green-600 transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
      </div>

      <Card>
        <CardHeader className="border-b border-border/60">
          <CardTitle className="text-lg font-semibold">{stepTitles[currentStep]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div key={currentStep} className="motion-safe:animate-slide-up">
            {renderStepContent()}
          </div>

          {stepError && (
            <Alert variant="destructive">
              <AlertDescription>{stepError}</AlertDescription>
            </Alert>
          )}

          {statusMessage && !stepError && (
            <Alert>
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          )}

          <Separator />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                variant="ghost"
                onClick={goToPreviousStep}
                disabled={currentStep === 0 || isBusy || isSubmitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <button
                type="button"
                onClick={handleSkipOnboarding}
                disabled={isBusy || isSubmitting}
                className="sm:hidden text-sm text-muted-foreground underline hover:text-foreground disabled:opacity-50 py-2"
              >
                Skip onboarding
              </button>
            </div>

            {currentStep < totalSteps.length - 1 ? (
              <Button
                onClick={goToNextStep}
                disabled={isBusy || isSubmitting}
                className="ml-auto"
              >
                {isBusy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="ml-auto"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Finish & View Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default OnboardingFlow;
