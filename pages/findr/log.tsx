'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import {
  MapPin,
  Grid3X3,
  Thermometer,
  Droplets,
  Activity,
  CloudSun,
  Waves,
  Fish,
  Calendar,
  Navigation,
  ClipboardList,
  Clock,
  AlertTriangle,
  Zap,
  Users,
  FileText,
  BarChart3,
} from 'lucide-react';
import { SPECIES_IMAGE_MAP, type SpeciesImageInfo } from '../../data/speciesImageMap';
import { FindrNavigation } from '../../components/findr/FindrNavigationMobile';
import { useCatchLog } from '../../hooks/useCatchLog';
import { useImpressionTracking } from '../../hooks/useImpressionTracking';
import { useContextualTranslation } from '../../context/LanguageContext';
import { compressImage } from '../../lib/storage/photoStorage';
import { TranslatedText } from '../../components/translation/TranslatedFishCard';

// New enhanced modal components
import { QuickLogModal } from '../../components/findr/QuickLogModal';
import { SessionLogModal } from '../../components/findr/SessionLogModal';
import { BlankReportModal } from '../../components/findr/BlankReportModal';
import { ReferenceDataTables } from '../../components/findr/ReferenceDataTables';
import type { CatchEntry as NewCatchEntry } from '../../hooks/useCatchLog';
import type { BlankReportData } from '../../components/findr/BlankReportModal';

// Translation components for better code organization
const LogCatchHeading = () => {
  const { translated } = useContextualTranslation('Log your catch');
  return <span className="text-lg font-semibold">{translated}</span>;
};

const BaitSectionHeading = ({ fishName }: { fishName: string }) => {
  const { translated } = useContextualTranslation(`🎯 Loved by ${fishName}`);
  return <h4 className="font-semibold text-sm sm:text-base">{translated}</h4>;
};

const TapToSelectHint = () => {
  const { translated } = useContextualTranslation('Tap to select');
  return <span className="hidden text-xs text-base-content/60 sm:inline">{translated}</span>;
};

const AllBaitOptionsLabel = () => {
  const { translated } = useContextualTranslation('All bait options');
  return <>{translated}</>;
};

const ChooseBaitOption = () => {
  const { translated } = useContextualTranslation('Choose your bait...');
  return <option value="">{translated}</option>;
};

const PickBaitHint = () => {
  const { translated } = useContextualTranslation('Pick a bait to enable logging.');
  return <p className="text-xs text-base-content/60">{translated}</p>;
};

const HowManyLabel = () => {
  const { translated } = useContextualTranslation('How many did you catch?');
  return <label className="text-sm font-semibold">{translated}</label>;
};

const WhenDidYouCatchLabel = () => {
  const { translated } = useContextualTranslation('When did you catch it?');
  return (
    <label className="text-sm font-semibold flex items-center gap-2">
      <Clock className="w-4 h-4" />
      {translated}
    </label>
  );
};

const LoadsButton = () => {
  const { translated } = useContextualTranslation('Loads!');
  return <>{translated}</>;
};

const CloseButton = () => {
  const { translated } = useContextualTranslation('Close');
  return <>{translated}</>;
};

interface Location {
  name: string;
  lat: number;
  lon: number;
}

interface ICESGrid {
  rectangle: string;
  lat: number;
  lon: number;
  area: string;
  subdivision?: string;
}

interface MarineBioData {
  chlorophyllAvg?: number;
  dissolvedOxygenAvg?: number;
  nitrateAvg?: number;
  phosphateAvg?: number;
  salinityAvg?: number;
  sstAvg?: number;
  waveHeight?: number;
  windSpeed?: number;
}

interface CatchEntry {
  id: string;
  fishId: string;
  fishName: string;
  location: Location;
  icesGrid: string;
  date: string;
  bait: string;
  quantity: number;
  size: string;
  habitat?: string;
  marineBio: MarineBioData;
  weatherSummary: string;
  notes?: string;
  photo?: string; // Backward compatibility - first photo
  photos?: string[]; // Multiple photos support
  // Validation fields
  usingFindrPredictions?: boolean | null;
  followedBaitAdvice?: boolean | null;
  followedHabitatAdvice?: boolean | null;
}

interface FishMatch {
  id: string;
  name: string;
  commonName: string;
  confidence: number;
  season: string;
  depth: string;
  habitat: string;
  baitSuggestions: string[];
  tips: string[];
  image: string;
  imageMobile?: string;
  imageThumb?: string;
  tinderBio?: string;
}

interface CatchLoggerProps {
  fish: FishMatch;
  location: Location;
  icesGrid: ICESGrid;
  marineBio: MarineBioData;
  catches: CatchEntry[];
  onLogCatch: (entry: CatchEntry) => void;
  onCancel: () => void;
}

interface CatchHistoryProps {
  catches: CatchEntry[];
}

const baitOptions = [
  'lugworm',
  'ragworm',
  'mackerel strip',
  'live shrimp',
  'prawns',
  'crab',
  'squid',
  'bread',
  'mackerel feathers',
  'small spinners',
  'sabiki rigs',
  'lures',
  'sandeels',
  'mussels',
  'live bait',
  'fish strips',
  'other',
];

const habitatOptions = [
  'rocky shore',
  'sandy beach',
  'pier/harbor',
  'estuary',
  'shallow water',
  'deep water',
  'wreck/reef',
  'open sea',
];

const FALLBACK_FISH_IMAGE = '/webp/beachfishy.webp';

const speciesImagesByScientificName = new Map<string, SpeciesImageInfo>(
  Object.values(SPECIES_IMAGE_MAP)
    .filter((info): info is SpeciesImageInfo & { scientificName: string } => Boolean(info.scientificName))
    .map((info) => [info.scientificName!.toLowerCase(), info])
);

const resolveSpeciesImageAssets = (scientificName: string) => {
  const assets = speciesImagesByScientificName.get(scientificName.toLowerCase());

  if (!assets) {
    console.warn(`[Findr Catch Log] Missing species image assets for ${scientificName}`);
    return {
      image: FALLBACK_FISH_IMAGE,
      mobile: FALLBACK_FISH_IMAGE,
      thumb: FALLBACK_FISH_IMAGE,
    };
  }

  return {
    image: assets.image ?? FALLBACK_FISH_IMAGE,
    mobile: assets.mobile ?? assets.image ?? FALLBACK_FISH_IMAGE,
    thumb: assets.thumb ?? assets.mobile ?? assets.image ?? FALLBACK_FISH_IMAGE,
  };
};

type FishMatchSeed = Omit<FishMatch, 'image' | 'imageMobile' | 'imageThumb'>;

const mockLocation: Location = {
  name: 'Gijón Beach, Asturias',
  lat: 43.5322,
  lon: -5.6611,
};

const mockIcesGrid: ICESGrid = {
  rectangle: 'VIIIc',
  lat: 43.5,
  lon: -6.0,
  area: 'Bay of Biscay',
  subdivision: 'VIIIc',
};

const mockMarineBio: MarineBioData = {
  chlorophyllAvg: 2.1,
  dissolvedOxygenAvg: 8.3,
  nitrateAvg: 4.2,
  phosphateAvg: 0.3,
  salinityAvg: 35.2,
  sstAvg: 16.8,
  waveHeight: 1.2,
  windSpeed: 12,
};

const mockFishMatchSeed: FishMatchSeed[] = [
  {
    id: '1',
    name: 'Dicentrarchus labrax',
    commonName: 'Sea Bass',
    confidence: 92,
    season: 'Year-round',
    depth: '0-30m',
    habitat: 'Rocky shores, estuaries',
    baitSuggestions: ['ragworm', 'lugworm', 'live shrimp', 'small spinners'],
    tips: ['Dawn and dusk are prime times', 'Look for structure like rocks or piers'],
    tinderBio:
      'Find me on the prowl at dawn/dusk; warm months. I love a good chase, especially if it ends with crab.',
  },
  {
    id: '2',
    name: 'Scomber scombrus',
    commonName: 'Mackerel',
    confidence: 88,
    season: 'Spring-Autumn',
    depth: '0-200m',
    habitat: 'Open water, schools',
    baitSuggestions: ['mackerel feathers', 'sabiki rigs', 'small spinners'],
    tips: ['Schools move fast', 'Best during feeding frenzies'],
    tinderBio:
      'Love a bit of sunlight when shoals are in; dawn/evening peaks in summer. Sucker for fishnets.',
  },
  {
    id: '3',
    name: 'Merlangius merlangus',
    commonName: 'Whiting',
    confidence: 82,
    season: 'Autumn-Winter',
    depth: '5-50m',
    habitat: 'Sandy/muddy bottoms',
    baitSuggestions: ['ragworm', 'lugworm', 'fish strips'],
    tips: ['Night fishing often more productive', 'Found over sandy ground'],
    tinderBio:
      'Catch me at night & low-light; peaks in colder months inshore. Not into small talk, only small strips of mackerel/squid.',
  },
  {
    id: '4',
    name: 'Pollachius pollachius',
    commonName: 'Pollack',
    confidence: 78,
    season: 'Year-round',
    depth: '10-100m',
    habitat: 'Rocky reefs, wrecks',
    baitSuggestions: ['ragworm', 'small spinners', 'lures', 'sandeels'],
    tips: ['Active hunters, try moving baits', 'Found around structure'],
    tinderBio:
      'Find me on the prowl at dawn/dusk; overcast days with lures. Lure me with soft plastic and I\'m yours.',
  },
  {
    id: '5',
    name: 'Gadus morhua',
    commonName: 'Atlantic Cod',
    confidence: 71,
    season: 'Autumn-Spring',
    depth: '20-200m',
    habitat: 'Rocky bottoms, wrecks',
    baitSuggestions: ['lugworm', 'ragworm', 'fish strips', 'crab'],
    tips: ['Deeper water in winter', 'Bottom fishing preferred'],
    tinderBio:
      'Catch me at low light and night; autumn-winter inshore peaks. Bring lug/ragworm and I\'m yours.',
  },
];

const mockFishMatches: FishMatch[] = mockFishMatchSeed.map((fish) => {
  const assets = resolveSpeciesImageAssets(fish.name);

  return {
    ...fish,
    image: assets.image,
    imageMobile: assets.mobile,
    imageThumb: assets.thumb,
  };
});

const _CATCH_STORAGE_KEY = 'findr-demo-catches';
const TOAST_DURATION_MS = 3000;

function CatchLogger({
  fish,
  location,
  icesGrid,
  marineBio,
  onLogCatch,
  onCancel,
  catches,
}: CatchLoggerProps) {
  const [selectedBait, setSelectedBait] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [size, setSize] = useState<'small' | 'average' | 'large' | 'mixed'>('average');
  const [habitat, setHabitat] = useState<string>('');
  const [phReading] = useState(() => (8.05 + Math.random() * 0.25).toFixed(1));
  
  // New validation fields
  const [catchTime, setCatchTime] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // Format for datetime-local input
  });
  const [usingFindrPredictions, setUsingFindrPredictions] = useState<boolean | null>(null);
  const [followedBaitAdvice, setFollowedBaitAdvice] = useState<boolean | null>(null);
  const [followedHabitatAdvice, setFollowedHabitatAdvice] = useState<boolean | null>(null);
  
  // Photo handling
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Handle photo upload
  const handlePhotoUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Limit to 3 photos max
    if (photos.length >= 3) {
      setPhotoError('Maximum 3 photos allowed per catch');
      return;
    }
    
    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select an image file');
      return;
    }
    
    // Validate file size (max 10MB original)
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError('Image too large. Please select an image under 10MB.');
      return;
    }
    
    setUploadingPhoto(true);
    setPhotoError(null);
    
    try {
      // Process and compress image
      const compressedBlob = await compressImage(file);
      
      // Create a preview URL for immediate display
      const previewUrl = URL.createObjectURL(compressedBlob);
      setPhotos(prev => [...prev, previewUrl]);
      
      // TODO: Upload to Supabase Storage
      // For now, we'll just store the preview URL
      // In production, you'd upload the compressed blob to Supabase Storage
      
    } catch (error) {
      console.error('Photo processing failed:', error);
      setPhotoError('Failed to process image. Please try again.');
    } finally {
      setUploadingPhoto(false);
      // Clear the input
      event.target.value = '';
    }
  }, [photos]);
  
  const removePhoto = useCallback((index: number) => {
    setPhotos(prev => {
      const updated = [...prev];
      // Revoke object URL to free memory
      URL.revokeObjectURL(updated[index]);
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  const previousCatches = useMemo(
    () => catches.filter((entry) => entry.fishId === fish.id).length,
    [catches, fish.id]
  );

  const handleLogCatch = () => {
    if (!selectedBait) return;

    const storedSize = size === 'mixed' ? 'average' : size;
    const catchDate = new Date(catchTime);

    const catchEntry: CatchEntry = {
      id: Date.now().toString(),
      fishId: fish.id,
      fishName: fish.commonName,
      location,
      icesGrid: icesGrid.rectangle,
      date: catchDate.toISOString(),
      bait: selectedBait,
      quantity,
      size: storedSize,
      habitat: habitat || undefined,
      marineBio,
      weatherSummary: `Sea temp: ${marineBio?.sstAvg?.toFixed(1) ?? 'N/A'}°C, Wind: ${
        marineBio?.windSpeed ?? 'N/A'
      } knots, Waves: ${marineBio?.waveHeight?.toFixed(1) ?? 'N/A'}m`,
      notes: notes || undefined,
      photo: photos.length > 0 ? photos[0] : undefined, // For backward compatibility
      photos: photos.length > 0 ? photos : undefined,
      // Pass validation data
      usingFindrPredictions,
      followedBaitAdvice,
      followedHabitatAdvice,
    };

    onLogCatch(catchEntry);
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-success">
            <Fish className="w-6 h-6" />
            <LogCatchHeading />
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            <CloseButton />
          </button>
        </div>

        <div className="bg-primary/10 rounded-lg p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row">
            {fish.image && (
              <div className="relative h-auto min-h-24 w-full overflow-hidden rounded-lg border border-primary/30 sm:h-auto sm:min-h-28 sm:w-40 bg-base-100 flex items-center justify-center">
                <Image
                  src={fish.imageMobile ?? fish.imageThumb ?? fish.image}
                  alt={fish.commonName}
                  width={160}
                  height={120}
                  className="object-contain max-w-full max-h-full"
                  sizes="(min-width: 640px) 160px, 60vw"
                />
              </div>
            )}
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold"><TranslatedText text={fish.commonName} /></h3>
                  <p className="text-sm italic text-primary/80"><TranslatedText text={fish.name} /></p>
                </div>
                {previousCatches > 0 && (
                  <span className="badge badge-secondary">{previousCatches} <TranslatedText text="logged" /></span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                <span className="badge badge-outline gap-1">
                  <MapPin className="w-3 h-3" />
                  {location.name}
                </span>
                <span className="badge badge-outline gap-1">
                  <Grid3X3 className="w-3 h-3" />
                  ICES {icesGrid.rectangle}
                </span>
              </div>
            </div>
          </div>
        </div>

        {fish.baitSuggestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <BaitSectionHeading fishName={fish.commonName} />
              <TapToSelectHint />
            </div>
            <div className="flex flex-wrap gap-2">
              {fish.baitSuggestions.map((bait) => (
                <button
                  key={bait}
                  type="button"
                  onClick={() => setSelectedBait(bait)}
                  className={`btn btn-sm sm:btn-md ${
                    selectedBait === bait ? 'btn-primary' : 'btn-outline btn-primary'
                  }`}
                >
                  <TranslatedText text={bait} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <label className="flex items-center justify-between text-sm font-semibold">
            <AllBaitOptionsLabel />
            <span className="text-xs text-error">*</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={selectedBait}
            onChange={(event) => setSelectedBait(event.target.value)}
          >
            <ChooseBaitOption />
            {baitOptions.map((bait) => (
              <option key={bait} value={bait}>
                {bait.charAt(0).toUpperCase() + bait.slice(1)}
              </option>
            ))}
          </select>
          {selectedBait === '' && (
            <PickBaitHint />
          )}
        </div>

        <div className="space-y-3">
          <HowManyLabel />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
            {[1, 2, 3].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setQuantity(value)}
                className={`btn btn-sm sm:btn-md flex-1 ${
                  quantity === value ? 'btn-primary' : 'btn-outline'
                }`}
              >
                {value}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setQuantity(5)}
              className={`btn btn-sm sm:btn-md flex-1 ${
                quantity === 5 ? 'btn-primary' : 'btn-outline'
              }`}
            >
              <LoadsButton />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <WhenDidYouCatchLabel />
          <input
            type="datetime-local"
            className="input input-bordered w-full"
            value={catchTime}
            onChange={(e) => setCatchTime(e.target.value)}
            max={new Date().toISOString().slice(0, 16)}
          />
          <p className="text-xs text-base-content/60">
            <TranslatedText text="This helps us understand when fish are most active" />
          </p>
        </div>

        <div className="space-y-4 rounded-lg bg-warning/10 p-4">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <TranslatedText text="Help us improve predictions" />
          </h4>
          
          <div className="space-y-3">
            <label className="text-sm font-medium">
              <TranslatedText text="Were you using Findr predictions to decide where/when to fish?" />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUsingFindrPredictions(true)}
                className={`btn btn-sm flex-1 ${
                  usingFindrPredictions === true ? 'btn-success' : 'btn-outline'
                }`}
              >
                <TranslatedText text="Yes" />
              </button>
              <button
                type="button"
                onClick={() => setUsingFindrPredictions(false)}
                className={`btn btn-sm flex-1 ${
                  usingFindrPredictions === false ? 'btn-error' : 'btn-outline'
                }`}
              >
                <TranslatedText text="No" />
              </button>
            </div>
          </div>

          {usingFindrPredictions === true && (
            <>
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  <TranslatedText text="Did you use the bait suggestions from Findr?" />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFollowedBaitAdvice(true)}
                    className={`btn btn-sm flex-1 ${
                      followedBaitAdvice === true ? 'btn-success' : 'btn-outline'
                    }`}
                  >
                    <TranslatedText text="Yes" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowedBaitAdvice(false)}
                    className={`btn btn-sm flex-1 ${
                      followedBaitAdvice === false ? 'btn-error' : 'btn-outline'
                    }`}
                  >
                    <TranslatedText text="No" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">
                  <TranslatedText text="Did you fish in the habitat type recommended by Findr?" />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFollowedHabitatAdvice(true)}
                    className={`btn btn-sm flex-1 ${
                      followedHabitatAdvice === true ? 'btn-success' : 'btn-outline'
                    }`}
                  >
                    <TranslatedText text="Yes" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowedHabitatAdvice(false)}
                    className={`btn btn-sm flex-1 ${
                      followedHabitatAdvice === false ? 'btn-error' : 'btn-outline'
                    }`}
                  >
                    <TranslatedText text="No" />
                  </button>
                </div>
              </div>
            </>
          )}

          {usingFindrPredictions === false && (
            <p className="text-xs text-base-content/60">
              <TranslatedText text="Thanks! This helps us understand when our predictions work best." />
            </p>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold"><TranslatedText text="What size were they?" /></label>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
            {(['small', 'average', 'large', 'mixed'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSize(value)}
                className={`btn btn-sm sm:btn-md flex-1 ${
                  size === value ? 'btn-primary' : 'btn-outline'
                }`}
              >
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between text-sm font-semibold">
            <TranslatedText text="Where did you catch it?" />
            <span className="text-xs text-base-content/60"><TranslatedText text="Optional" /></span>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {habitatOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setHabitat(habitat === option ? '' : option)}
                className={`btn btn-xs sm:btn-sm ${
                  habitat === option ? 'btn-primary' : 'btn-outline'
                }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
          {habitat && (
            <div className="text-xs text-base-content/60">
              <TranslatedText text={`Selected: ${habitat}`} />
              <button
                type="button"
                className="btn btn-ghost btn-xs ml-2"
                onClick={() => setHabitat('')}
              >
                <TranslatedText text="Clear" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">
            <TranslatedText text="Notes to self" /> <span className="text-xs text-base-content/60">(<TranslatedText text="tips for next visit" />)</span>
          </label>
          <textarea
            className="textarea textarea-bordered"
            placeholder="Best marks, tides, time of day..."
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold flex items-center gap-2">
            📸 <TranslatedText text="Add photos" />
            <span className="text-xs text-base-content/60">(<TranslatedText text="optional, max 3" />)</span>
          </label>
          
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.map((photo, index) => (
                <div key={index} className="relative">
                  <Image
                    src={photo}
                    alt={`Catch photo ${index + 1}`}
                    width={120}
                    height={96}
                    className="w-full h-24 object-cover rounded-lg border border-base-300"
                    unoptimized // Since these are blob URLs
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {photos.length < 3 && (
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                className="file-input file-input-bordered w-full"
              />
              <p className="text-xs text-base-content/60">
                <TranslatedText text="Images will be automatically resized for mobile sharing (max 1200px, ~200KB each)" />
              </p>
            </div>
          )}
          
          {uploadingPhoto && (
            <div className="flex items-center gap-2 text-sm">
              <span className="loading loading-ring loading-sm text-blue-500"></span>
              <TranslatedText text="Processing image..." />
            </div>
          )}
          
          {photoError && (
            <div className="alert alert-error alert-sm">
              <span className="text-sm">{photoError}</span>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-info/10 p-4">
          <h4 className="mb-3 flex items-center gap-2 font-semibold">
            <Waves className="w-4 h-4" />
            <TranslatedText text="Conditions recorded with this catch" />
          </h4>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4" />
              <span className="font-medium"><TranslatedText text="Sea temp:" /></span>
              <span>{marineBio.sstAvg?.toFixed(1) ?? 'N/A'}°C</span>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              <span className="font-medium"><TranslatedText text="Oxygen:" /></span>
              <span>{marineBio.dissolvedOxygenAvg?.toFixed(1) ?? 'N/A'} mg/L</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="font-medium"><TranslatedText text="Salinity:" /></span>
              <span>{marineBio.salinityAvg?.toFixed(1) ?? 'N/A'}‰</span>
            </div>
            <div className="flex items-center gap-2">
              <CloudSun className="w-4 h-4" />
              <span className="font-medium"><TranslatedText text="pH:" /></span>
              <span>{phReading}</span>
            </div>
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4" />
              <span className="font-medium"><TranslatedText text="Wave height:" /></span>
              <span>{marineBio.waveHeight?.toFixed(1) ?? '1.2'}m</span>
            </div>
            <div className="flex items-center gap-2">
              <CloudSun className="w-4 h-4" />
              <span className="font-medium"><TranslatedText text="Wind:" /></span>
              <span>{marineBio.windSpeed ?? '12'} knots</span>
            </div>
          </div>
        </div>

        <div className="card-actions justify-end">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            <TranslatedText text="Cancel" />
          </button>
          <button
            type="button"
            onClick={handleLogCatch}
            disabled={!selectedBait}
            className="btn btn-success gap-2"
          >
            <Fish className="w-4 h-4" />
            <TranslatedText text="Log catch" />
          </button>
        </div>
      </div>
    </div>
  );
}

const CatchHistory: React.FC<CatchHistoryProps> = ({ catches }) => {
  if (catches.length === 0) {
    return (
      <div className="space-y-4 py-12 text-center">
        <div className="text-6xl">🎣</div>
        <p className="text-lg text-base-content/70"><TranslatedText text="No catches logged yet. Go fishing!" /></p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <ClipboardList className="h-6 w-6 text-primary" />
        <TranslatedText text={`Your catch log (${catches.length})`} />
      </h2>
      {catches.map((catchEntry) => {
        const displaySize = catchEntry.size || 'average';
        const sizeDisplay = displaySize.charAt(0).toUpperCase() + displaySize.slice(1);
        const timestamp = new Date(catchEntry.date);
        return (
          <div key={catchEntry.id} className="card bg-base-100 shadow-md">
            <div className="card-body space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <h3 className="card-title text-lg"><TranslatedText text={catchEntry.fishName} /></h3>
                  <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                    {catchEntry.quantity > 1 && (
                      <span className="badge badge-success">
                        x{catchEntry.quantity === 5 ? 'Loads' : catchEntry.quantity}
                      </span>
                    )}
                    <span className="badge badge-info">{sizeDisplay}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                  <span className="badge badge-outline gap-1">
                    <Calendar className="w-3 h-3" />
                    {timestamp.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="badge badge-primary gap-1">
                    <Grid3X3 className="w-3 h-3" />
                    {catchEntry.icesGrid}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <Navigation className="h-4 w-4" />
                    <span className="font-medium"><TranslatedText text="Location:" /></span>
                    {catchEntry.location.name}
                  </p>
                  <p className="flex items-center gap-2">
                    <Fish className="h-4 w-4" />
                    <span className="font-medium"><TranslatedText text="Bait:" /></span>
                    <TranslatedText text={catchEntry.bait} />
                  </p>
                  {catchEntry.habitat && (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium"><TranslatedText text="Habitat:" /></span>
                      <TranslatedText text={catchEntry.habitat} />
                    </p>
                  )}
                  {catchEntry.notes && (
                    <p className="flex items-start gap-2">
                      <span className="font-medium"><TranslatedText text="Notes:" /></span>
                      {catchEntry.notes}
                    </p>
                  )}
                </div>
                <div className="rounded-lg bg-info/10 p-3">
                  <p className="mb-2 flex items-center gap-2 font-medium">
                    <Waves className="h-4 w-4" />
                    <TranslatedText text="Marine conditions" />
                  </p>
                  <p className="text-xs text-base-content/70">{catchEntry.weatherSummary}</p>
                </div>
              </div>
              
              {(catchEntry.photos?.length || catchEntry.photo) && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    📸 <TranslatedText text="Photos" />
                  </h4>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {/* Handle both new photos array and legacy single photo */}
                    {catchEntry.photos ? catchEntry.photos.map((photo, index) => (
                      <Image
                        key={index}
                        src={photo}
                        alt={`${catchEntry.fishName} catch photo ${index + 1}`}
                        width={120}
                        height={80}
                        className="w-full h-20 object-cover rounded-lg border border-base-300"
                        unoptimized // Since these are blob URLs
                      />
                    )) : catchEntry.photo && (
                      <Image
                        src={catchEntry.photo}
                        alt={`${catchEntry.fishName} catch photo`}
                        width={120}
                        height={80}
                        className="w-full h-20 object-cover rounded-lg border border-base-300"
                        unoptimized // Since these are blob URLs  
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function FindrCatchLogPage() {
  const [currentPage, setCurrentPage] = useState<'fish' | 'log' | 'history'>('fish');
  const [showCatchLogger, setShowCatchLogger] = useState(false);
  const [selectedFish, setSelectedFish] = useState<FishMatch | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showBlankTripDialog, setShowBlankTripDialog] = useState(false);
  const [catches, setCatches] = useState<CatchEntry[]>([]);

  // New enhanced modal states
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const [showSessionLogModal, setShowSessionLogModal] = useState(false);
  const [showBlankReportModal, setShowBlankReportModal] = useState(false);
  const [showReferenceTablesModal, setShowReferenceTablesModal] = useState(false);

  // Use our new hooks
  const { logCatch, logBlankTrip } = useCatchLog();
  const { recordPredictionView } = useImpressionTracking();

  const totalSpeciesCaught = useMemo(
    () => new Set(catches.map((entry) => entry.fishId)).size,
    [catches]
  );

  useEffect(() => {
    console.info('[Findr Catch Log] Using production API endpoints with validation tracking.', {
      location: mockLocation.name,
      icesRectangle: mockIcesGrid.rectangle,
      fishCatalogSize: mockFishMatches.length,
      marineSignals: Object.keys(mockMarineBio),
      baitOptionsPreview: baitOptions.slice(0, 3),
    });

    // Load catches from localStorage for now
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('findr-demo-catches');
        if (saved) {
          const parsed = JSON.parse(saved) as CatchEntry[];
          setCatches(parsed);
        }
      } catch (error) {
        console.warn('Failed to load catch history:', error);
      }
    }
  }, []);

  // Save catches to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('findr-demo-catches', JSON.stringify(catches));
    }
  }, [catches]);

  // Track impression when fish matches are viewed
  useEffect(() => {
    if (currentPage === 'fish') {
      recordPredictionView(
        mockIcesGrid.rectangle,
        mockFishMatches.map(fish => ({
          id: fish.id,
          name: fish.name,
          commonName: fish.commonName,
          confidence: fish.confidence / 100,
          baitSuggestions: fish.baitSuggestions,
          habitat: fish.habitat
        })),
        {
          sea_temp: mockMarineBio.sstAvg,
          tide_phase: 'incoming', // Mock data
          wind_speed: mockMarineBio.windSpeed,
          wave_height: mockMarineBio.waveHeight,
          salinity: mockMarineBio.salinityAvg,
          chlorophyll: mockMarineBio.chlorophyllAvg,
          dissolved_oxygen: mockMarineBio.dissolvedOxygenAvg,
        },
        'high'
      ).catch(err => console.warn('[Impression Tracking] Failed to record view:', err));
    }
  }, [currentPage, recordPredictionView]);

  useEffect(() => {
    if (!showToast) return;
    const timer = window.setTimeout(() => setShowToast(false), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [showToast]);

  const showFishToast = useCallback((fishName: string, confidence: number) => {
    const messages = [
      `🎣 Nice one! ${fishName} on the line!`,
      `🐟 ${fishName} logged! ${confidence}% confidence - great catch!`,
      `🎯 Boom! ${fishName} in the bag!`,
      `⭐ Sweet! Time to log that ${fishName}!`,
      `🚀 ${fishName} - let's get the details!`,
      `🎉 ${fishName} caught! This is why we fish!`,
    ];
    const message = messages[Math.floor(Math.random() * messages.length)];
    setToastMessage(message);
    setShowToast(true);
  }, []);

  const handleLogCatch = useCallback(async (entry: CatchEntry) => {
    try {
      await logCatch({
        species_id: entry.fishId,
        species_common_name: entry.fishName,
        rectangle_code: entry.icesGrid,
        caught_at: entry.date,
        quantity: entry.quantity,
        size_category: entry.size as 'small' | 'average' | 'large' | 'mixed',
        bait_used: entry.bait,
        habitat_type: entry.habitat,
        notes: entry.notes,
        followed_findr_advice: entry.usingFindrPredictions === true,
        environmental_conditions: {
          ...(entry.marineBio.sstAvg !== undefined && { sea_temp: entry.marineBio.sstAvg }),
          ...(entry.marineBio.windSpeed !== undefined && { wind_speed: entry.marineBio.windSpeed }),
          ...(entry.marineBio.waveHeight !== undefined && { wave_height: entry.marineBio.waveHeight }),
          ...(entry.marineBio.salinityAvg !== undefined && { salinity: entry.marineBio.salinityAvg }),
          ...(entry.marineBio.chlorophyllAvg !== undefined && { chlorophyll: entry.marineBio.chlorophyllAvg }),
          ...(entry.marineBio.dissolvedOxygenAvg !== undefined && { dissolved_oxygen: entry.marineBio.dissolvedOxygenAvg }),
        },
      });
      
      // Add to local state for immediate UI update
      setCatches(prev => [entry, ...prev]);
      
      setShowCatchLogger(false);
      setSelectedFish(null);
      setCurrentPage('history');
      setToastMessage('🎉 Catch logged successfully!');
      setShowToast(true);
    } catch (error) {
      console.error('[Catch Logging] Failed to log catch:', error);
      // Still add to local state as fallback
      setCatches(prev => [entry, ...prev]);
      setShowCatchLogger(false);
      setSelectedFish(null);
      setCurrentPage('history');
      setToastMessage('📝 Catch saved locally - will sync when online');
      setShowToast(true);
    }
  }, [logCatch, setCatches]);

  const handleClearCatches = useCallback(() => {
    setCatches([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('findr-demo-catches');
    }
  }, []);

  const handleLogBlankTrip = useCallback(async () => {
    try {
      await logBlankTrip({
        rectangle_code: mockIcesGrid.rectangle,
        latitude: mockLocation.lat,
        longitude: mockLocation.lon,
        environmental_conditions: {
          ...(mockMarineBio.sstAvg !== undefined && { sea_temp: mockMarineBio.sstAvg }),
          ...(mockMarineBio.windSpeed !== undefined && { wind_speed: mockMarineBio.windSpeed }),
          ...(mockMarineBio.waveHeight !== undefined && { wave_height: mockMarineBio.waveHeight }),
          ...(mockMarineBio.salinityAvg !== undefined && { salinity: mockMarineBio.salinityAvg }),
          ...(mockMarineBio.chlorophyllAvg !== undefined && { chlorophyll: mockMarineBio.chlorophyllAvg }),
          ...(mockMarineBio.dissolvedOxygenAvg !== undefined && { dissolved_oxygen: mockMarineBio.dissolvedOxygenAvg }),
        },
        notes: 'No catches today',
      });
      
      setShowBlankTripDialog(false);
      setToastMessage('📝 Blank trip logged - thanks for the data!');
      setShowToast(true);
    } catch (error) {
      console.error('[Blank Trip Logging] Failed to log blank trip:', error);
      setToastMessage('❌ Failed to log blank trip. Please try again.');
      setShowToast(true);
    }
  }, [logBlankTrip]);

  // New enhanced modal success handlers
  const handleQuickLogSuccess = useCallback((catchEntry: NewCatchEntry) => {
    console.log('[Quick Log] Success:', catchEntry);
    setCatches(prev => [
      {
        id: catchEntry.id,
        fishId: catchEntry.species_common_name, // Map to old structure
        fishName: catchEntry.species_common_name,
        location: mockLocation,
        icesGrid: mockIcesGrid.rectangle,
        date: catchEntry.caught_at,
        bait: catchEntry.bait_used,
        quantity: catchEntry.quantity,
        size: catchEntry.size_category,
        habitat: catchEntry.habitat_type,
        marineBio: mockMarineBio,
        weatherSummary: `Sea temp: ${mockMarineBio?.sstAvg?.toFixed(1) ?? 'N/A'}°C`,
        notes: catchEntry.notes,
      },
      ...prev
    ]);
    setCurrentPage('history');
    setToastMessage('🎉 Quick catch logged successfully!');
    setShowToast(true);
  }, []);

  const handleSessionLogSuccess = useCallback((catchEntries: NewCatchEntry[]) => {
    console.log('[Session Log] Success:', catchEntries);
    const newCatches = catchEntries.map(entry => ({
      id: entry.id,
      fishId: entry.species_common_name,
      fishName: entry.species_common_name,
      location: mockLocation,
      icesGrid: mockIcesGrid.rectangle,
      date: entry.caught_at,
      bait: entry.bait_used,
      quantity: entry.quantity,
      size: entry.size_category,
      habitat: entry.habitat_type,
      marineBio: mockMarineBio,
      weatherSummary: `Sea temp: ${mockMarineBio?.sstAvg?.toFixed(1) ?? 'N/A'}°C`,
      notes: entry.notes,
    }));
    setCatches(prev => [...newCatches, ...prev]);
    setCurrentPage('history');
    setToastMessage(`🎉 Session logged successfully! ${catchEntries.length} catches added.`);
    setShowToast(true);
  }, []);

  const handleBlankReportSuccess = useCallback((reportData: BlankReportData) => {
    console.log('[Blank Report] Success:', reportData);
    setToastMessage('📝 Blank report logged - thanks for the valuable data!');
    setShowToast(true);
  }, []);

  const handleCancelLogger = useCallback(() => {
    setShowCatchLogger(false);
    setSelectedFish(null);
  }, []);

  const renderFishMatches = () => (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold"><TranslatedText text={`🎯 Fish matches for ${mockLocation.name}`} /></h2>
        <p className="text-base-content/70">
          <TranslatedText text="Ordered by likelihood - most probable catches first." />
        </p>
        <div className="flex justify-center gap-3 pt-3 text-sm">
          <span className="badge badge-info gap-1">
            <Thermometer className="h-3 w-3" />
            {mockMarineBio.sstAvg}°C
          </span>
          <span className="badge badge-info gap-1">
            <Grid3X3 className="h-3 w-3" />
            ICES {mockIcesGrid.rectangle}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {mockFishMatches.map((fishMatch) => {
          const speciesCatchCount = catches.filter((entry) => entry.fishId === fishMatch.id).length;
          return (
            <div
              key={fishMatch.id}
              className="card bg-base-100 shadow-md transition-shadow hover:shadow-lg"
            >
              {fishMatch.image && (
                <figure className="relative h-auto min-h-32 overflow-hidden rounded-t-xl bg-base-100 flex items-center justify-center">
                  <Image
                    src={fishMatch.imageThumb ?? fishMatch.image}
                    alt={fishMatch.commonName}
                    width={320}
                    height={240}
                    className="object-contain max-w-full max-h-full"
                    sizes="(min-width: 1280px) 320px, (min-width: 768px) 45vw, 100vw"
                  />
                  {speciesCatchCount > 0 && (
                    <span className="badge badge-secondary absolute right-3 top-3">
                      {speciesCatchCount} <TranslatedText text="caught" />
                    </span>
                  )}
                </figure>
              )}
              <div className="card-body space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="card-title text-lg"><TranslatedText text={fishMatch.commonName} /></h3>
                    <p className="text-sm italic text-base-content/60"><TranslatedText text={fishMatch.name} /></p>
                  </div>
                  <span className="badge badge-success">{fishMatch.confidence}%</span>
                </div>
                {fishMatch.tinderBio && (
                  <div className="rounded-lg border-l-4 border-pink-300 bg-pink-50 p-3 text-sm text-pink-800">
                    <p className="italic">&ldquo;<TranslatedText text={fishMatch.tinderBio} />&rdquo;</p>
                  </div>
                )}
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium"><TranslatedText text="Season:" /></span> <TranslatedText text={fishMatch.season} />
                  </p>
                  <p>
                    <span className="font-medium"><TranslatedText text="Depth:" /></span> <TranslatedText text={fishMatch.depth} />
                  </p>
                  <p>
                    <span className="font-medium"><TranslatedText text="Habitat:" /></span> <TranslatedText text={fishMatch.habitat} />
                  </p>
                </div>
                <div className="card-actions justify-end pt-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm gap-2"
                    onClick={() => {
                      showFishToast(fishMatch.commonName, fishMatch.confidence);
                      setSelectedFish(fishMatch);
                      setShowCatchLogger(true);
                      setCurrentPage('log');
                    }}
                  >
                    <Fish className="h-4 w-4" />
                    <TranslatedText text="Caught this" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderLogPrompt = () => (
    <div className="space-y-4 py-12 text-center">
      <div className="text-6xl">📝</div>
      <h2 className="text-2xl font-semibold"><TranslatedText text="Log a catch" /></h2>
      <p className="mx-auto max-w-md text-base-content/70">
        <TranslatedText text="Select a fish from the matches tab to log your catch details." />
      </p>
      <button type="button" className="btn btn-primary" onClick={() => setCurrentPage('fish')}>
        <TranslatedText text="Browse matches" />
      </button>
    </div>
  );

  return (
    <>
      <Head>
        <title>Findr catch log | WotNow</title>
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 pb-16">
        {/* Navigation component handles responsive display internally */}
        <FindrNavigation />

        {/* Content container */}
        <div className="sm:mx-auto px-0 pt-2 sm:px-4 sm:pt-6 md:px-6 lg:max-w-6xl">
          <header className="card bg-primary text-primary-content shadow-lg">
            <div className="card-body flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-8 w-8" />
                <div>
                  <h1 className="text-2xl font-semibold"><TranslatedText text="Findr catch log" /></h1>
                  <p className="text-sm text-primary-content/80">
                    
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="badge badge-outline badge-lg">
                  {catches.length} <TranslatedText text={catches.length === 1 ? 'catch' : 'catches'} />
                </span>
                <span className="badge badge-outline badge-lg">
                  {totalSpeciesCaught} <TranslatedText text="species" />
                </span>
              </div>
            </div>
          </header>

          <section className="card bg-base-100 shadow-xl mt-6">
            <div className="card-body space-y-8">
              
              {/* Enhanced Action Buttons Layout */}
              <div className="text-center space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-base-content mb-2">
                    <TranslatedText text="How did your fishing go?" />
                  </h2>
                  <p className="text-base-content/70 text-sm">
                    <TranslatedText text="Choose the option that best describes your fishing experience" />
                  </p>
                </div>
                
                {/* Three Primary Action Buttons */}
                <div className="grid gap-4 md:grid-cols-3">
                  
                  {/* Quick Log - Single Catch */}
                  <div className="card bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 hover:shadow-lg transition-all duration-200">
                    <div className="card-body text-center p-6">
                      <div className="mx-auto w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center mb-4">
                        <Zap className="w-8 h-8 text-secondary" />
                      </div>
                      <h3 className="card-title justify-center text-lg mb-2">
                        <TranslatedText text="Quick Log" />
                      </h3>
                      <p className="text-sm text-base-content/70 mb-4">
                        <TranslatedText text="Just landed one? Log it instantly and get back to fishing." />
                      </p>
                      <button
                        onClick={() => setShowQuickLogModal(true)}
                        className="btn btn-secondary btn-block"
                      >
                        <Zap className="w-4 h-4" />
                        <TranslatedText text="Quick Log Catch" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Session Log - Multiple Catches */}
                  <div className="card bg-gradient-to-br from-success/10 to-success/5 border border-success/20 hover:shadow-lg transition-all duration-200">
                    <div className="card-body text-center p-6">
                      <div className="mx-auto w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-success" />
                      </div>
                      <h3 className="card-title justify-center text-lg mb-2">
                        <TranslatedText text="Session Log" />
                      </h3>
                      <p className="text-sm text-base-content/70 mb-4">
                        <TranslatedText text="Great day? Log multiple catches, photos, and detailed trip information." />
                      </p>
                      <button
                        onClick={() => setShowSessionLogModal(true)}
                        className="btn btn-success btn-block"
                      >
                        <Users className="w-4 h-4" />
                        <TranslatedText text="Log Full Session" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Blank Report - No Luck */}
                  <div className="card bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20 hover:shadow-lg transition-all duration-200">
                    <div className="card-body text-center p-6">
                      <div className="mx-auto w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-warning" />
                      </div>
                      <h3 className="card-title justify-center text-lg mb-2">
                        <TranslatedText text="Blank Report" />
                      </h3>
                      <p className="text-sm text-base-content/70 mb-4">
                        <TranslatedText text="No luck today? Your fishing data improves the app for everyone." />
                      </p>
                      <button
                        onClick={() => setShowBlankReportModal(true)}
                        className="btn btn-warning btn-block"
                      >
                        <FileText className="w-4 h-4" />
                        <TranslatedText text="Report No Catches" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Secondary Actions */}
                <div className="flex items-center justify-center gap-4 pt-4 border-t border-base-300">
                  <button
                    type="button"
                    className={`btn gap-2 ${currentPage === 'history' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => {
                      setCurrentPage('history');
                      setShowCatchLogger(false);
                      setSelectedFish(null);
                    }}
                  >
                    <Calendar className="h-4 w-4" />
                    <TranslatedText text={`View History (${catches.length})`} />
                  </button>
                  
                  <button
                    type="button"
                    className="btn btn-info btn-outline gap-2"
                    onClick={() => setShowReferenceTablesModal(true)}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <TranslatedText text="Reference Data" />
                  </button>
                  
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleClearCatches}
                    disabled={catches.length === 0}
                  >
                    <TranslatedText text="Clear demo log" />
                  </button>
                </div>
              </div>

              {/* Existing Content When Not Using New Modals */}
              {currentPage === 'history' && !showCatchLogger && (
                <div>
                  <CatchHistory catches={catches} />
                </div>
              )}

              {showCatchLogger && selectedFish ? (
                <CatchLogger
                  fish={selectedFish}
                  location={mockLocation}
                  icesGrid={mockIcesGrid}
                  marineBio={mockMarineBio}
                  catches={catches}
                  onLogCatch={handleLogCatch}
                  onCancel={handleCancelLogger}
                />
              ) : (
                <>
                  {currentPage === 'fish' && renderFishMatches()}
                  {currentPage === 'log' && renderLogPrompt()}
                  {currentPage === 'history' && <CatchHistory catches={catches} />}
                </>
              )}
            </div>
          </section>
        </div>

        {showToast && (
          <div className="toast toast-top toast-center z-40">
            <div className="alert alert-success flex items-center gap-2 shadow-lg">
              <Fish className="h-5 w-5" />
              <span className="font-medium">{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Enhanced Modal Components */}
        <QuickLogModal
          isOpen={showQuickLogModal}
          onClose={() => setShowQuickLogModal(false)}
          onSuccess={handleQuickLogSuccess}
          rectangleCode={mockIcesGrid.rectangle}
        />

        <SessionLogModal
          isOpen={showSessionLogModal}
          onClose={() => setShowSessionLogModal(false)}
          onSuccess={handleSessionLogSuccess}
          rectangleCode={mockIcesGrid.rectangle}
        />

        <BlankReportModal
          isOpen={showBlankReportModal}
          onClose={() => setShowBlankReportModal(false)}
          onSuccess={handleBlankReportSuccess}
          rectangleCode={mockIcesGrid.rectangle}
        />

        <ReferenceDataTables
          isOpen={showReferenceTablesModal}
          onClose={() => setShowReferenceTablesModal(false)}
          initialView="species"
        />

        {/* Legacy Blank Trip Dialog (keeping for backward compatibility) */}
        {showBlankTripDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="card bg-base-100 shadow-xl w-full max-w-md mx-4">
              <div className="card-body">
                <h3 className="card-title flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-warning" />
                  <TranslatedText text="Log blank trip" />
                </h3>
                <p className="text-sm text-base-content/70">
                  <TranslatedText text="No luck today? That's valuable data too! Logging unsuccessful trips helps us improve our predictions." />
                </p>
                <div className="bg-info/10 rounded-lg p-3 mt-4">
                  <p className="text-sm">
                    <strong><TranslatedText text="Location:" /></strong> {mockLocation.name}<br />
                    <strong><TranslatedText text="ICES Rectangle:" /></strong> {mockIcesGrid.rectangle}<br />
                    <strong><TranslatedText text="Time:" /></strong> {new Date().toLocaleString()}
                  </p>
                </div>
                <div className="card-actions justify-end mt-4">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowBlankTripDialog(false)}
                  >
                    <TranslatedText text="Cancel" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-warning gap-2"
                    onClick={handleLogBlankTrip}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <TranslatedText text="Log blank trip" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
