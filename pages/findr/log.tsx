'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import SEO from '../../components/SEO';
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
  Loader2,
  TrendingUp,
  Target,
  Camera,
} from 'lucide-react';
import { SPECIES_IMAGE_MAP, type SpeciesImageInfo } from '../../data/speciesImageMap';
import { FindrNavigation } from '../../components/findr/FindrNavigationMobile';
import { useCatchLogger, useQuickCatchLog } from '@/hooks/useCatchLogger';
import { useImpressionTracking } from '../../hooks/useImpressionTracking';
import { useContextualTranslation } from '../../context/LanguageContext';
import { useUnifiedLocation } from '../../context/UnifiedLocationContext';
import { compressImage } from '../../lib/storage/photoStorage';
import { TranslatedText } from '../../components/translation/TranslatedFishCard';
import { GradientFish } from '../../components/GradientFish';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import type { CatchLogInput, CatchLoggerTelemetryEvent } from '@/types/findr-enrichment';
import { usePersistentFindrSettings } from '../../hooks/usePersistentFindrSettings';
import { normaliseCatchPhotoAssets, type CatchPhotoAsset } from '@/utils/catchPhotoAssets';
import { mapPrediction, type CardData } from '../../lib/findr/mapPrediction';
import type { FishingPrediction } from '../../hooks/useFishingPredictions';
import type { BlankReportData } from '../../components/findr/BlankReportModal';

// Code-split heavy modal components - only load when user opens them
const QuickLogModal = dynamic(
  () => import('../../components/findr/QuickLogModal').then(mod => ({ default: mod.QuickLogModal })),
  { ssr: false, loading: () => null }
);

const SessionLogModal = dynamic(
  () => import('../../components/findr/SessionLogModal').then(mod => ({ default: mod.SessionLogModal })),
  { ssr: false, loading: () => null }
);

const BlankReportModal = dynamic(
  () => import('../../components/findr/BlankReportModal').then(mod => ({ default: mod.BlankReportModal })),
  { ssr: false, loading: () => null }
);

const ReferenceDataTables = dynamic(
  () => import('../../components/findr/ReferenceDataTables').then(mod => ({ default: mod.ReferenceDataTables })),
  { ssr: false, loading: () => null }
);

const RecentCatchesWidget = dynamic(
  () => import('../../components/findr/RecentCatchesWidget').then(mod => ({ default: mod.RecentCatchesWidget })),
  { ssr: false, loading: () => null }
);

// Translation components
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

// Types
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
  weatherSummary?: string;
  notes?: string;
  photo?: string;
  photos?: string[];
  photoAssets?: CatchPhotoAsset[];
  photoThumbnails?: (string | null)[];
  usingFindrPredictions?: boolean | null;
  followedBaitAdvice?: boolean | null;
  followedHabitatAdvice?: boolean | null;
}

interface FishMatch {
  id: string;
  name: string;
  commonName: string;
  scientific_name?: string; // API returns scientific_name for image resolution
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
  onViewPredictions: () => void;
}

// Constants
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

const TIME_PERIOD_TO_TIME: Record<string, string> = {
  morning: '08:00:00',
  afternoon: '14:00:00',
  evening: '19:00:00',
  night: '23:00:00',
};

const HABITAT_LABEL_LOOKUP: Record<string, string> = {
  rocky_shore: 'Rocky Shore',
  'rocky shore': 'Rocky Shore',
  sandy_beach: 'Sandy Beach',
  'sandy beach': 'Sandy Beach',
  pier_harbor: 'Pier/Harbor',
  'pier/harbor': 'Pier/Harbor',
  estuary: 'Estuary',
  shallow_water: 'Shallow Water',
  'shallow water': 'Shallow Water',
  deep_water: 'Deep Water',
  'deep water': 'Deep Water',
  wreck_reef: 'Wreck/Reef',
  'wreck/reef': 'Wreck/Reef',
  open_sea: 'Open Sea',
  'open sea': 'Open Sea',
};

const TOAST_DURATION_MS = 3000;

// Utility functions
const formatTimePeriods = (periods: string[]): string =>
  periods.map((period) => period.replace(/_/g, ' ')).join(' & ');

const cleanEnvironment = (env: Record<string, string | number | undefined | null>) => {
  const entries = Object.entries(env).filter(
    ([, value]) => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)
  );
  return Object.fromEntries(entries) as Record<string, string | number>;
};

function buildEnvironmentalConditions(marineBio: MarineBioData): Record<string, number> | undefined {
  const payload: Record<string, number> = {};

  if (marineBio.sstAvg != null) payload.sea_temp = marineBio.sstAvg;
  if (marineBio.windSpeed != null) payload.wind_speed = marineBio.windSpeed;
  if (marineBio.waveHeight != null) payload.wave_height = marineBio.waveHeight;
  if (marineBio.salinityAvg != null) payload.salinity = marineBio.salinityAvg;
  if (marineBio.chlorophyllAvg != null) payload.chlorophyll = marineBio.chlorophyllAvg;
  if (marineBio.dissolvedOxygenAvg != null) payload.dissolved_oxygen = marineBio.dissolvedOxygenAvg;

  return Object.keys(payload).length > 0 ? payload : undefined;
}

function mapApiCatchToEntry(
  apiCatch: Record<string, unknown>, 
  defaultRectangle: string,
  locationData: Location,
  marineBioData: MarineBioData
): CatchEntry {
  const id = apiCatch.id != null ? String(apiCatch.id) : `temp-${Date.now()}`;
  const speciesCommonName =
    apiCatch.species_common_name != null
      ? String(apiCatch.species_common_name)
      : apiCatch.species_id != null
      ? String(apiCatch.species_id)
      : 'Unknown species';
  const rectangle = apiCatch.rectangle_code != null ? String(apiCatch.rectangle_code) : defaultRectangle;
  const caughtAt = apiCatch.caught_at != null ? String(apiCatch.caught_at) : new Date().toISOString();
  const quantityRaw = Number(apiCatch.quantity ?? 0);
  const sizeCategory = apiCatch.size_category != null ? String(apiCatch.size_category) : 'mixed';
  const photoAssets = normaliseCatchPhotoAssets(apiCatch);
  const photoUrls = photoAssets.map((asset) => asset.url).filter(Boolean);

  return {
    id,
    fishId: apiCatch.species_id != null ? String(apiCatch.species_id) : speciesCommonName,
    fishName: speciesCommonName,
    location: locationData,
    icesGrid: rectangle,
    date: caughtAt,
    bait: apiCatch.bait_used != null ? String(apiCatch.bait_used) : 'Unknown bait',
    quantity: Number.isFinite(quantityRaw) ? quantityRaw : 0,
    size: sizeCategory,
    habitat: apiCatch.habitat_type != null ? String(apiCatch.habitat_type) : undefined,
    marineBio: marineBioData,
    weatherSummary: undefined,
    notes: apiCatch.notes != null ? String(apiCatch.notes) : undefined,
    photo: photoUrls.length > 0 ? photoUrls[0] : undefined,
    photos: photoUrls.length > 0 ? photoUrls : undefined,
    photoAssets: photoAssets.length > 0 ? photoAssets : undefined,
    photoThumbnails: photoAssets.length > 0 ? photoAssets.map((asset) => asset.thumbnailUrl ?? null) : undefined,
    usingFindrPredictions: apiCatch.followed_findr_advice === true,
    followedBaitAdvice: apiCatch.used_recommended_bait === true,
    followedHabitatAdvice: apiCatch.used_recommended_habitat === true,
  };
}

const speciesImagesByScientificName = new Map<string, SpeciesImageInfo>(
  Object.values(SPECIES_IMAGE_MAP)
    .filter((info): info is SpeciesImageInfo & { scientificName: string } => Boolean(info.scientificName))
    .map((info) => [info.scientificName!.toLowerCase(), info])
);

const resolveSpeciesImageAssets = (scientificName: string | undefined | null) => {
  if (!scientificName) {
    return {
      image: '',
      mobile: '',
      thumb: '',
    };
  }
  
  const assets = speciesImagesByScientificName.get(scientificName.toLowerCase());

  if (!assets) {
    return {
      image: '',
      mobile: '',
      thumb: '',
    };
  }

  return {
    image: assets.image ?? '',
    mobile: assets.mobile ?? assets.image ?? '',
    thumb: assets.thumb ?? assets.mobile ?? assets.image ?? '',
  };
};

// CatchLogger Component
function CatchLogger({ fish, location, icesGrid, marineBio, onLogCatch, onCancel, catches }: CatchLoggerProps) {
  const [selectedBait, setSelectedBait] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [size, setSize] = useState<'small' | 'average' | 'large' | 'mixed'>('average');
  const [habitat, setHabitat] = useState<string>('');
  const [phReading] = useState(() => (8.05 + Math.random() * 0.25).toFixed(1));
  const [catchTime, setCatchTime] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [usingFindrPredictions, setUsingFindrPredictions] = useState<boolean | null>(null);
  const [followedBaitAdvice, setFollowedBaitAdvice] = useState<boolean | null>(null);
  const [followedHabitatAdvice, setFollowedHabitatAdvice] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const handlePhotoUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      if (photos.length >= 3) {
        setPhotoError('Maximum 3 photos allowed per catch');
        return;
      }

      const file = files[0];

      if (!file.type.startsWith('image/')) {
        setPhotoError('Please select an image file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setPhotoError('Image too large. Please select an image under 10MB.');
        return;
      }

      setUploadingPhoto(true);
      setPhotoError(null);

      try {
        const compressedBlob = await compressImage(file);
        const previewUrl = URL.createObjectURL(compressedBlob);
        setPhotos((prev) => [...prev, previewUrl]);
      } catch (error) {
        console.error('Photo processing failed:', error);
        setPhotoError('Failed to process image. Please try again.');
      } finally {
        setUploadingPhoto(false);
        event.target.value = '';
      }
    },
    [photos]
  );

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index]);
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  const previousCatches = useMemo(() => catches.filter((entry) => entry.fishId === fish.id).length, [catches, fish.id]);

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
      photo: photos.length > 0 ? photos[0] : undefined,
      photos: photos.length > 0 ? photos : undefined,
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
                  <h3 className="text-lg font-semibold">
                    <TranslatedText text={fish.commonName} />
                  </h3>
                  <p className="text-sm italic text-primary/80">
                    <TranslatedText text={fish.name} />
                  </p>
                </div>
                {previousCatches > 0 && (
                  <span className="badge badge-secondary">
                    {previousCatches} <TranslatedText text="logged" />
                  </span>
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
                  className={`btn btn-sm sm:btn-md ${selectedBait === bait ? 'btn-primary' : 'btn-outline btn-primary'}`}
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
          <select className="select select-bordered w-full" value={selectedBait} onChange={(event) => setSelectedBait(event.target.value)}>
            <ChooseBaitOption />
            {baitOptions.map((bait) => (
              <option key={bait} value={bait}>
                {bait.charAt(0).toUpperCase() + bait.slice(1)}
              </option>
            ))}
          </select>
          {selectedBait === '' && (
            <p className="text-xs text-base-content/60">
              <TranslatedText text="Pick a bait to enable logging." />
            </p>
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
                className={`btn btn-sm sm:btn-md flex-1 ${quantity === value ? 'btn-primary' : 'btn-outline'}`}
              >
                {value}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setQuantity(5)}
              className={`btn btn-sm sm:btn-md flex-1 ${quantity === 5 ? 'btn-primary' : 'btn-outline'}`}
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
                className={`btn btn-sm flex-1 ${usingFindrPredictions === true ? 'btn-success' : 'btn-outline'}`}
              >
                <TranslatedText text="Yes" />
              </button>
              <button
                type="button"
                onClick={() => setUsingFindrPredictions(false)}
                className={`btn btn-sm flex-1 ${usingFindrPredictions === false ? 'btn-error' : 'btn-outline'}`}
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
                    className={`btn btn-sm flex-1 ${followedBaitAdvice === true ? 'btn-success' : 'btn-outline'}`}
                  >
                    <TranslatedText text="Yes" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowedBaitAdvice(false)}
                    className={`btn btn-sm flex-1 ${followedBaitAdvice === false ? 'btn-error' : 'btn-outline'}`}
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
                    className={`btn btn-sm flex-1 ${followedHabitatAdvice === true ? 'btn-success' : 'btn-outline'}`}
                  >
                    <TranslatedText text="Yes" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowedHabitatAdvice(false)}
                    className={`btn btn-sm flex-1 ${followedHabitatAdvice === false ? 'btn-error' : 'btn-outline'}`}
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
          <label className="text-sm font-semibold">
            <TranslatedText text="What size were they?" />
          </label>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
            {(['small', 'average', 'large', 'mixed'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSize(value)}
                className={`btn btn-sm sm:btn-md flex-1 ${size === value ? 'btn-primary' : 'btn-outline'}`}
              >
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between text-sm font-semibold">
            <TranslatedText text="Where did you catch it?" />
            <span className="text-xs text-base-content/60">
              <TranslatedText text="Optional" />
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {habitatOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setHabitat(habitat === option ? '' : option)}
                className={`btn btn-xs sm:btn-sm ${habitat === option ? 'btn-primary' : 'btn-outline'}`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">
            <TranslatedText text="Notes to self" />{' '}
            <span className="text-xs text-base-content/60">
              (<TranslatedText text="tips for next visit" />)
            </span>
          </label>
          <textarea
            className="textarea textarea-bordered w-full"
            placeholder="Best marks, tides, time of day..."
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold flex items-center gap-2">
            📸 <TranslatedText text="Add photos" />
            <span className="text-xs text-base-content/60">
              (<TranslatedText text="optional, max 3" />)
            </span>
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
                    unoptimized
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
              <span className="font-medium">
                <TranslatedText text="Sea temp:" />
              </span>
              <span>{marineBio.sstAvg?.toFixed(1) ?? 'N/A'}°C</span>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              <span className="font-medium">
                <TranslatedText text="Oxygen:" />
              </span>
              <span>{marineBio.dissolvedOxygenAvg?.toFixed(1) ?? 'N/A'} mg/L</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="font-medium">
                <TranslatedText text="Salinity:" />
              </span>
              <span>{marineBio.salinityAvg?.toFixed(1) ?? 'N/A'}‰</span>
            </div>
            <div className="flex items-center gap-2">
              <CloudSun className="w-4 h-4" />
              <span className="font-medium">
                <TranslatedText text="pH:" />
              </span>
              <span>{phReading}</span>
            </div>
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4" />
              <span className="font-medium">
                <TranslatedText text="Wave height:" />
              </span>
              <span>{marineBio.waveHeight?.toFixed(1) ?? '1.2'}m</span>
            </div>
            <div className="flex items-center gap-2">
              <CloudSun className="w-4 h-4" />
              <span className="font-medium">
                <TranslatedText text="Wind:" />
              </span>
              <span>{marineBio.windSpeed ?? '12'} knots</span>
            </div>
          </div>
        </div>

        <div className="card-actions justify-end">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            <TranslatedText text="Cancel" />
          </button>
          <button type="button" onClick={handleLogCatch} disabled={!selectedBait} className="btn btn-success gap-2">
            <Fish className="w-4 h-4" />
            <TranslatedText text="Log catch" />
          </button>
        </div>
      </div>
    </div>
  );
}

// CatchHistory Component with improved empty state
const CatchHistory: React.FC<CatchHistoryProps> = ({ catches, onViewPredictions }) => {
  if (catches.length === 0) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="relative inline-block">
          <div className="text-8xl animate-bounce">🎣</div>
          <div className="absolute -top-2 -right-2 text-4xl animate-pulse">✨</div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-base-content">
            <TranslatedText text="Your Fishing Journey Starts Here" />
          </h2>
          <p className="text-base-content/70 max-w-md mx-auto">
            <TranslatedText text="No catches logged yet, but that's about to change! Every catch you log helps improve predictions for the entire fishing community." />
          </p>
        </div>

        <div className="grid gap-4 max-w-2xl mx-auto sm:grid-cols-3 pt-6">
          <div className="card bg-base-200">
            <div className="card-body items-center text-center p-4">
              <Target className="w-8 h-8 text-primary mb-2" />
              <h3 className="font-semibold text-sm">
                <TranslatedText text="Smart Predictions" />
              </h3>
              <p className="text-xs text-base-content/60">
                <TranslatedText text="AI-powered forecasts based on marine conditions" />
              </p>
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body items-center text-center p-4">
              <TrendingUp className="w-8 h-8 text-success mb-2" />
              <h3 className="font-semibold text-sm">
                <TranslatedText text="Track Progress" />
              </h3>
              <p className="text-xs text-base-content/60">
                <TranslatedText text="Build your personal catch history and patterns" />
              </p>
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body items-center text-center p-4">
              <Users className="w-8 h-8 text-info mb-2" />
              <h3 className="font-semibold text-sm">
                <TranslatedText text="Help Others" />
              </h3>
              <p className="text-xs text-base-content/60">
                <TranslatedText text="Your data improves predictions for everyone" />
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6">
          <button onClick={onViewPredictions} className="btn btn-primary btn-lg gap-2">
            <Fish className="w-5 h-5" />
            <TranslatedText text="View Today's Predictions" />
          </button>
        </div>

        {/* Gallery Preview Section */}
        <div className="mt-12 pt-12 border-t border-base-300">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold flex items-center justify-center gap-2">
              <Camera className="w-6 h-6 text-primary" />
              <TranslatedText text="Your Trophy Gallery" />
            </h3>
            <p className="text-sm text-base-content/60 mt-2">
              <TranslatedText text="Build your collection - with or without photos!" />
            </p>
          </div>

          {/* Example photos grid - placeholder boxes */}
          <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
            <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-dashed border-primary/30">
              <span className="text-4xl opacity-50">🐟</span>
            </div>
            <div className="aspect-video rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center border-2 border-dashed border-secondary/30">
              <span className="text-4xl opacity-50">🎣</span>
            </div>
            <div className="aspect-video rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border-2 border-dashed border-accent/30">
              <span className="text-4xl opacity-50">📸</span>
            </div>
          </div>

          <p className="text-xs text-base-content/40 text-center mt-4 max-w-sm mx-auto">
            <TranslatedText text="Your catches will appear here as cards with photos. No photo? We'll show the species image!" />
          </p>
        </div>
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
                  <h3 className="card-title text-lg">
                    <TranslatedText text={catchEntry.fishName} />
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                    {catchEntry.quantity > 1 && (
                      <span className="badge badge-success">x{catchEntry.quantity === 5 ? 'Loads' : catchEntry.quantity}</span>
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
                    <span className="font-medium">
                      <TranslatedText text="Location:" />
                    </span>
                    {catchEntry.location.name}
                  </p>
                  <p className="flex items-center gap-2">
                    <Fish className="h-4 w-4" />
                    <span className="font-medium">
                      <TranslatedText text="Bait:" />
                    </span>
                    <TranslatedText text={catchEntry.bait} />
                  </p>
                  {catchEntry.habitat && (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">
                        <TranslatedText text="Habitat:" />
                      </span>
                      <TranslatedText text={catchEntry.habitat} />
                    </p>
                  )}
                  {catchEntry.notes && (
                    <p className="flex items-start gap-2">
                      <span className="font-medium">
                        <TranslatedText text="Notes:" />
                      </span>
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
                    {catchEntry.photos
                      ? catchEntry.photos.map((photo, index) => {
                          const asset = catchEntry.photoAssets?.[index];
                          const source = asset?.thumbnailUrl ?? asset?.url ?? photo;
                          return (
                            <Image
                              key={index}
                              src={source}
                              alt={`${catchEntry.fishName} catch photo ${index + 1}`}
                              width={120}
                              height={80}
                              className="w-full h-20 object-cover rounded-lg border border-base-300"
                              unoptimized={source.startsWith('blob:')}
                            />
                          );
                        })
                      : catchEntry.photo && (
                          <Image
                            src={catchEntry.photoAssets?.[0]?.thumbnailUrl ?? catchEntry.photoAssets?.[0]?.url ?? catchEntry.photo}
                            alt={`${catchEntry.fishName} catch photo`}
                            width={120}
                            height={80}
                            className="w-full h-20 object-cover rounded-lg border border-base-300"
                            unoptimized={catchEntry.photo.startsWith('blob:')}
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

// Main Page Component
export default function FindrCatchLogPage() {
  const [currentPage, setCurrentPage] = useState<'fish' | 'log' | 'history'>('fish');
  const [showCatchLogger, setShowCatchLogger] = useState(false);
  const [selectedFish, setSelectedFish] = useState<FishMatch | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [catches, setCatches] = useState<CatchEntry[]>([]);
  const [liveMatches, setLiveMatches] = useState<FishMatch[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(true);
  const [userName, setUserName] = useState<string>('User');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null = checking, true/false = known

  // Modal states
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const [showSessionLogModal, setShowSessionLogModal] = useState(false);
  const [showBlankReportModal, setShowBlankReportModal] = useState(false);
  const [showReferenceTablesModal, setShowReferenceTablesModal] = useState(false);

  const defaultPredictionDate = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { location } = useUnifiedLocation();
  const { selectedCode } = usePersistentFindrSettings({
    predictionDate: defaultPredictionDate,
    language: 'en',
  });
  
  // Priority: UnifiedLocationContext → selectedCode → fallback to '31F2'
  const activeRectangleCode = location?.rectangleCode ?? selectedCode ?? '31F2';

  // Fetch user name and auth status from session
  useEffect(() => {
    const fetchUserName = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const email = data.session.user.email || 'User';
        const displayName = data.session.user.user_metadata?.full_name || email.split('@')[0];
        setUserName(displayName);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };
    void fetchUserName();
  }, []);

  // Debug logging for location
  useEffect(() => {
    console.log('[Findr Catch Log] Location state:', {
      contextRectangle: location?.rectangleCode,
      selectedCode,
      activeRectangle: activeRectangleCode,
      fallbackUsed: !location?.rectangleCode && !selectedCode,
      locationData: location,
    });
  }, [location?.rectangleCode, selectedCode, activeRectangleCode, location]);

  // Create location objects from context
  const currentLocation: Location = useMemo(() => ({
    name: location?.rectangleLabel || `ICES ${activeRectangleCode}`,
    lat: location?.lat ?? 0,
    lon: location?.lon ?? 0,
  }), [location?.rectangleLabel, location?.lat, location?.lon, activeRectangleCode]);

  const currentIcesGrid: ICESGrid = useMemo(() => ({
    rectangle: activeRectangleCode,
    lat: location?.lat ?? 0,
    lon: location?.lon ?? 0,
    area: location?.rectangleRegion || 'Unknown',
    subdivision: activeRectangleCode,
  }), [activeRectangleCode, location?.lat, location?.lon, location?.rectangleRegion]);

  const currentMarineBio: MarineBioData = useMemo(() => ({
    // These would ideally come from environmental data, but we'll use empty object for now
    // The environmental conditions will be populated from the catch log enrichment API
  }), []);

  const resolveAccessToken = useCallback(async (): Promise<string | null> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[Findr Catch Log] Failed to retrieve Supabase session:', error.message);
      return null;
    }
    return data.session?.access_token ?? null;
  }, []);

  // Fetch live predictions
  const fetchLivePredictions = useCallback(async () => {
    setLoadingPredictions(true);
    try {
      const token = await resolveAccessToken();
      if (!token) {
        console.warn('[Findr Catch Log] No auth token; using fallback predictions');
        setLoadingPredictions(false);
        return;
      }

      const response = await fetch('/api/findr/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lat: location?.lat,
          lon: location?.lon,
          rectangleCode: activeRectangleCode,
          date: defaultPredictionDate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Transform raw API predictions using the same mapper as the main predictions page
        const mappedMatches = data.predictions
          .map((pred: FishingPrediction, index: number) => mapPrediction(pred, index))
          .filter((cardData: CardData | null): cardData is CardData => cardData !== null)
          .map((cardData: CardData) => {
            // Use real species data instead of placeholders
            const season = cardData.seasonality || 
                          cardData.advice?.[0]?.best_time || 
                          'Year-round';
            const depth = cardData.depthRange || 
                         cardData.advice?.[0]?.typical_distance_depth || 
                         'Coastal waters';
            const habitat = cardData.habitatType || 
                           cardData.tideTips?.[0] || 
                           'Coastal waters';
            
            // Convert CardData to FishMatch format for catch logger
            const fishMatch: FishMatch = {
              id: cardData.id,
              name: cardData.commonName,
              commonName: cardData.commonName,
              scientific_name: cardData.scientificName,
              confidence: cardData.confidence ?? 0,
              season,
              depth,
              habitat,
              baitSuggestions: cardData.baitSuggestions,
              tips: [...cardData.tideTips, ...cardData.statusNotes],
              image: cardData.image?.src || '',
              imageMobile: cardData.image?.mobile ?? undefined,
              imageThumb: cardData.image?.thumb ?? undefined,
              tinderBio: cardData.playfulBio,
            };
            return fishMatch;
          });
        setLiveMatches(mappedMatches);
      }
    } catch (error) {
      console.error('[Findr Catch Log] Failed to fetch predictions:', error);
    } finally {
      setLoadingPredictions(false);
    }
  }, [activeRectangleCode, defaultPredictionDate, location?.lat, location?.lon, resolveAccessToken]);

  // Fetch catch history
  const fetchLoggedSessions = useCallback(async () => {
    try {
      const token = await resolveAccessToken();
      if (!token) {
        console.warn('[Findr Catch Log] No auth token available; skipping catch fetch');
        return;
      }

      const response = await fetch('/api/findr/catch-log', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch catches: ${response.status}`);
      }

      const payload = await response.json();
      if (!payload?.catches || !Array.isArray(payload.catches)) {
        return;
      }

      const mapped = (payload.catches as Array<Record<string, unknown>>).map((catchRow) =>
        mapApiCatchToEntry(catchRow, activeRectangleCode, currentLocation, currentMarineBio)
      );
      setCatches(mapped);
    } catch (error) {
      console.error('[Findr Catch Log] Unable to fetch catch history:', error);
    }
  }, [activeRectangleCode, currentLocation, currentMarineBio, resolveAccessToken]);

  const handleCatchLoggerTelemetry = useCallback((event: CatchLoggerTelemetryEvent) => {
    console.info('[Catch Log Telemetry]', event);
  }, []);

  const { logCatch } = useCatchLogger({
    resolveAccessToken,
    onSuccess: (response) => {
      toast.success(`Catch logged! +${response.points_earned} points`);

      if (response.enrichment.has_exif_gps) {
        toast.success('📍 GPS extracted from photo!');
      }
      if (response.enrichment.depth_found) {
        toast.success(`🌊 Depth: ${response.enrichment.depth_meters ?? 'unknown'} m`);
      }
      if (response.enrichment.substrate_found && response.enrichment.substrate) {
        toast.success(`🪨 Seabed type: ${response.enrichment.substrate}`);
      }

      void fetchLoggedSessions();
    },
    onError: (error) => {
      toast.error(`Failed to log catch: ${error.message}`);
    },
    onTelemetry: handleCatchLoggerTelemetry,
  });

  const { quickLog } = useQuickCatchLog({
    resolveAccessToken,
    onSuccess: () => {
      toast.success('Quick log complete!');
      void fetchLoggedSessions();
    },
    onError: (error) => {
      toast.error(`Quick log failed: ${error.message}`);
    },
    onTelemetry: handleCatchLoggerTelemetry,
  });

  const { recordPredictionView } = useImpressionTracking();

  const totalSpeciesCaught = useMemo(() => new Set(catches.map((entry) => entry.fishId)).size, [catches]);

  const displayMatches = useMemo(() => {
    if (liveMatches.length > 0) return liveMatches;
    
    // Fallback to mock data with proper image assets
    return [
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
        tinderBio: 'Find me on the prowl at dawn/dusk; warm months. I love a good chase, especially if it ends with crab.',
        ...resolveSpeciesImageAssets('Dicentrarchus labrax'),
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
        tinderBio: 'Love a bit of sunlight when shoals are in; dawn/evening peaks in summer. Sucker for fishnets.',
        ...resolveSpeciesImageAssets('Scomber scombrus'),
      },
    ];
  }, [liveMatches]);

  useEffect(() => {
    void fetchLivePredictions();
    void fetchLoggedSessions();
  }, [fetchLivePredictions, fetchLoggedSessions]);

  // Track impression when fish matches are viewed
  useEffect(() => {
    // Only record impression if we have valid data: fish page, matches, and valid rectangle code
    if (currentPage === 'fish' && displayMatches.length > 0 && activeRectangleCode && activeRectangleCode.trim() !== '') {
      const environmentalData = buildEnvironmentalConditions(currentMarineBio);
      recordPredictionView(
        activeRectangleCode,
        displayMatches.map((fish) => ({
          id: fish.id,
          name: fish.name,
          commonName: fish.commonName,
          confidence: fish.confidence / 100,
          baitSuggestions: fish.baitSuggestions,
          habitat: fish.habitat,
        })),
        environmentalData || {},
        'high'
      ).catch((err) => console.warn('[Impression Tracking] Failed to record view:', err));
    }
  }, [currentPage, displayMatches, recordPredictionView, activeRectangleCode, currentMarineBio]);

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

  const handleLogCatch = useCallback(
    async (entry: CatchEntry) => {
      const [datePart, timePartRaw] = entry.date.includes('T') ? entry.date.split('T') : [entry.date, null];
      const timePart = timePartRaw ? timePartRaw.slice(0, 8) : null;

      try {
        const result = await logCatch({
          speciesId: entry.fishId,
          speciesCommonName: entry.fishName,
          rectangleCode: entry.icesGrid,
          catchDate: datePart,
          catchTime: timePart,
          quantity: entry.quantity,
          sizeCategory: (entry.size as CatchLogInput['sizeCategory']) ?? 'mixed',
          baitUsed: entry.bait,
          habitatType: entry.habitat ?? null,
          notes: entry.notes ?? null,
          entryType: 'detailed',
          environmentalConditions: buildEnvironmentalConditions(entry.marineBio),
          userLocation: location?.lat && location?.lon ? {
            lat: location.lat,
            lon: location.lon,
          } : null,
        });

        if (!result) {
          throw new Error('Logger returned no response');
        }

        setShowCatchLogger(false);
        setSelectedFish(null);
        setCurrentPage('history');
        setToastMessage('🎉 Catch logged successfully!');
        setShowToast(true);
      } catch (error) {
        console.error('[Catch Logging] Failed to log catch:', error);
        setCatches((prev) => [entry, ...prev]);
        setShowCatchLogger(false);
        setSelectedFish(null);
        setCurrentPage('history');
        setToastMessage('📝 Catch saved locally - will sync when online');
        setShowToast(true);
      }
    },
    [logCatch, location]
  );

  const submitBlankReport = useCallback(
    async (report: BlankReportData) => {
      const primaryTime = report.time_period[0];
      const catchTime = primaryTime ? TIME_PERIOD_TO_TIME[primaryTime] ?? null : null;
      const habitatLabel = HABITAT_LABEL_LOOKUP[report.habitat_type] ?? report.habitat_type;

      const environmental = cleanEnvironment({
        blank_duration_hours: report.duration_hours,
        blank_time_periods: report.time_period.join(', '),
        blank_habitat: habitatLabel,
        blank_baits: report.bait_attempted.join(', ') || undefined,
        blank_techniques: report.techniques_used.join(', ') || undefined,
        blank_weather: report.weather_conditions.conditions.join(', ') || undefined,
        blank_water_clarity: report.weather_conditions.water_clarity,
        blank_tide_state: report.weather_conditions.tide_state,
        blank_possible_reasons: report.possible_reasons.join(', ') || undefined,
        blank_will_try_again: report.will_try_again ? 'yes' : 'no',
      });

      const noteSegments = [
        report.time_period.length ? `Time: ${formatTimePeriods(report.time_period)}` : null,
        `Habitat: ${habitatLabel}`,
        report.bait_attempted.length ? `Baits: ${report.bait_attempted.join(', ')}` : null,
        report.techniques_used.length ? `Techniques: ${report.techniques_used.join(', ')}` : null,
        report.possible_reasons.length ? `Possible reasons: ${report.possible_reasons.join(', ')}` : null,
        report.effort_notes ? `Notes: ${report.effort_notes}` : null,
      ].filter(Boolean);

      const result = await logCatch({
        speciesId: 'BLANK_TRIP',
        speciesCommonName: 'Blank Trip',
        rectangleCode: report.rectangle_code,
        catchDate: report.date,
        catchTime,
        quantity: 0,
        entryType: 'historical',
        habitatType: report.habitat_type,
        method: 'shore',
        baitUsed: report.bait_attempted.join(', ') || undefined,
        notes: noteSegments.join(' | ') || undefined,
        environmentalConditions: environmental,
        userLocation: location?.lat && location?.lon ? {
          lat: location.lat,
          lon: location.lon,
        } : null,
      });

      if (!result) {
        throw new Error('Blank trip could not be logged.');
      }
    },
    [logCatch, location]
  );

  const handleQuickLogSuccess = useCallback(() => {
    setCurrentPage('history');
    setToastMessage('🎉 Quick catch logged successfully!');
    setShowToast(true);
  }, []);

  const handleSessionLogSuccess = useCallback(
    (catchCount: number) => {
      toast.success('Session logged successfully!');
      setCurrentPage('history');
      setToastMessage(`🎉 Session logged successfully! ${catchCount} catches added.`);
      setShowToast(true);
      void fetchLoggedSessions();
    },
    [fetchLoggedSessions]
  );

  const handleBlankReportSuccess = useCallback(
    (_: BlankReportData) => {
      toast.success('Blank report logged - thank you for the data!');
      void fetchLoggedSessions();
      setCurrentPage('history');
      setToastMessage('📝 Blank report logged - thanks for the valuable data!');
      setShowToast(true);
    },
    [fetchLoggedSessions]
  );

  const handleCancelLogger = useCallback(() => {
    setShowCatchLogger(false);
    setSelectedFish(null);
  }, []);

  const renderFishMatches = () => {
    if (loadingPredictions) {
      return (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-base-content/70">
            <TranslatedText text="Loading predictions..." />
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold">
            <TranslatedText text={`🎯 Fish matches for ${location?.rectangleLabel || activeRectangleCode}`} />
          </h2>
          <p className="text-base-content/70">
            <TranslatedText text="Ordered by likelihood - most probable catches first." />
          </p>
          <div className="flex justify-center gap-3 pt-3 text-sm">
            <span className="badge badge-info gap-1">
              <Grid3X3 className="h-3 w-3" />
              ICES {activeRectangleCode}
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {displayMatches.map((fishMatch) => {
            const speciesCatchCount = catches.filter((entry) => entry.fishId === fishMatch.id).length;
            return (
              <div key={fishMatch.id} className="card bg-base-100 shadow-md transition-shadow hover:shadow-lg">
                <figure className="relative h-48 overflow-hidden rounded-t-xl bg-gradient-to-br from-info/10 to-primary/10 flex items-center justify-center">
                  {fishMatch.image ? (
                    <Image
                      src={fishMatch.imageThumb ?? fishMatch.image}
                      alt={fishMatch.commonName}
                      width={320}
                      height={240}
                      className="object-contain max-w-full max-h-full"
                      sizes="(min-width: 1280px) 320px, (min-width: 768px) 45vw, 100vw"
                    />
                  ) : (
                    <GradientFish size={96} />
                  )}
                  {speciesCatchCount > 0 && (
                    <span className="badge badge-secondary absolute right-3 top-3">
                      {speciesCatchCount} <TranslatedText text="caught" />
                    </span>
                  )}
                </figure>
                <div className="card-body space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="card-title text-lg">
                        <TranslatedText text={fishMatch.commonName} />
                      </h3>
                      <p className="text-sm italic text-base-content/60">
                        <TranslatedText text={fishMatch.name} />
                      </p>
                    </div>
                    <span className="badge badge-success">{fishMatch.confidence}%</span>
                  </div>
                  {fishMatch.tinderBio && (
                    <div className="rounded-lg border-l-4 border-pink-300 bg-pink-50 p-3 text-sm text-pink-800">
                      <p className="italic">
                        &ldquo;
                        <TranslatedText text={fishMatch.tinderBio} />
                        &rdquo;
                      </p>
                    </div>
                  )}
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">
                        <TranslatedText text="Season:" />
                      </span>{' '}
                      <TranslatedText text={fishMatch.season} />
                    </p>
                    <p>
                      <span className="font-medium">
                        <TranslatedText text="Depth:" />
                      </span>{' '}
                      <TranslatedText text={fishMatch.depth} />
                    </p>
                    <p>
                      <span className="font-medium">
                        <TranslatedText text="Habitat:" />
                      </span>{' '}
                      <TranslatedText text={fishMatch.habitat} />
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
  };

  return (
    <>
      <SEO
        title="Catch Log"
        description="Record and track your fishing catches with detailed environmental conditions, species information, and catch statistics."
        url="https://fishfindr.eu/findr/log"
      />
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 pb-16">
        <FindrNavigation />

        {/* Auth Banner - shown when not authenticated */}
        {isAuthenticated === false && (
          <div className="sm:mx-auto px-2 sm:px-4 md:px-6 lg:max-w-6xl pt-4">
            <div className="alert alert-warning shadow-lg">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div className="flex-1">
                <h3 className="font-bold">
                  <TranslatedText text="Sign in required to log catches" />
                </h3>
                <div className="text-sm">
                  <TranslatedText text="Create an account or sign in to save your catches, track your fishing history, and upload photos to your trophy gallery." />
                </div>
              </div>
              <div className="flex-none">
                <Link href="/findr/auth" className="btn btn-sm btn-primary gap-2">
                  <TranslatedText text="Sign In" />
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="sm:mx-auto pt-2 px-2 sm:px-4 sm:pt-6 md:px-6 lg:max-w-6xl">
          <header className="card bg-primary text-primary-content shadow-lg">
            <div className="card-body flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-8 w-8" />
                <div>
                  <h1 className="text-2xl font-semibold">
                    <TranslatedText text={`findr catch log for ${userName}`} />
                  </h1>
                  <p className="text-sm color-black text-primary-content/80">
                    <TranslatedText text="Log your catches and we’ll fill in the details." />
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

          {/* Recent Catches Widget - only shows when catches exist */}
          <div className="mt-6">
            <RecentCatchesWidget />
          </div>

          <section className="card bg-base-100 shadow-xl mt-6">
            <div className="card-body space-y-8">
              <div className="text-center space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-base-content mb-2">
                    <TranslatedText text="How did your fishing go?" />
                  </h2>
                  <p className="text-base-content/70 text-sm">
                    <TranslatedText text="Choose the option that best describes your fishing experience" />
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
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
                      <button onClick={() => setShowQuickLogModal(true)} className="btn btn-secondary btn-block">
                        <Zap className="w-4 h-4" />
                        <TranslatedText text="Quick Log Catch" />
                      </button>
                    </div>
                  </div>

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
                      <button onClick={() => setShowSessionLogModal(true)} className="btn btn-success btn-block">
                        <Users className="w-4 h-4" />
                        <TranslatedText text="Log Full Session" />
                      </button>
                    </div>
                  </div>

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
                      <button onClick={() => setShowBlankReportModal(true)} className="btn btn-warning btn-block">
                        <FileText className="w-4 h-4" />
                        <TranslatedText text="Report No Catches" />
                      </button>
                    </div>
                  </div>
                </div>

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

                  <button type="button" className="btn btn-info btn-outline gap-2" onClick={() => setShowReferenceTablesModal(true)}>
                    <BarChart3 className="h-4 w-4" />
                    <TranslatedText text="Reference Data" />
                  </button>
                </div>
              </div>

              {currentPage === 'history' && !showCatchLogger && (
                <div>
                  <CatchHistory catches={catches} onViewPredictions={() => setCurrentPage('fish')} />
                </div>
              )}

              {showCatchLogger && selectedFish ? (
                <CatchLogger
                  fish={selectedFish}
                  location={currentLocation}
                  icesGrid={currentIcesGrid}
                  marineBio={currentMarineBio}
                  catches={catches}
                  onLogCatch={handleLogCatch}
                  onCancel={handleCancelLogger}
                />
              ) : (
                <>
                  {currentPage === 'fish' && renderFishMatches()}
                  {currentPage === 'log' && (
                    <div className="space-y-4 py-12 text-center">
                      <div className="text-6xl">📝</div>
                      <h2 className="text-2xl font-semibold">
                        <TranslatedText text="Log a catch" />
                      </h2>
                      <p className="mx-auto max-w-md text-base-content/70">
                        <TranslatedText text="Select a fish from the matches tab to log your catch details." />
                      </p>
                      <button type="button" className="btn btn-primary" onClick={() => setCurrentPage('fish')}>
                        <TranslatedText text="Browse matches" />
                      </button>
                    </div>
                  )}
                  {currentPage === 'history' && <CatchHistory catches={catches} onViewPredictions={() => setCurrentPage('fish')} />}
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

        <QuickLogModal
          isOpen={showQuickLogModal}
          onClose={() => setShowQuickLogModal(false)}
          onQuickLog={quickLog}
          onSuccess={handleQuickLogSuccess}
          rectangleCode={activeRectangleCode}
        />

        <SessionLogModal
          isOpen={showSessionLogModal}
          onClose={() => setShowSessionLogModal(false)}
          onSuccess={handleSessionLogSuccess}
          onSubmitCatch={logCatch}
          rectangleCode={activeRectangleCode}
        />

        <BlankReportModal
          isOpen={showBlankReportModal}
          onClose={() => setShowBlankReportModal(false)}
          onSuccess={handleBlankReportSuccess}
          onSubmit={submitBlankReport}
          rectangleCode={activeRectangleCode}
        />

        <ReferenceDataTables isOpen={showReferenceTablesModal} onClose={() => setShowReferenceTablesModal(false)} initialView="species" />
      </main>
    </>
  );
}
// Disable static generation for this page
export async function getServerSideProps() {
  return { props: {} };
}
