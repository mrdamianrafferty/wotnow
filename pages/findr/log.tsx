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
} from 'lucide-react';
import { FindrNavigation } from '../../components/findr/FindrNavigation';

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
  photo?: string;
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
  image?: string;
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

const mockFishMatches: FishMatch[] = [
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
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=250&fit=crop&auto=format',
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
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=250&fit=crop&auto=format',
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
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=250&fit=crop&auto=format',
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
    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=250&fit=crop&auto=format',
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
    image: 'https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?w=400&h=250&fit=crop&auto=format',
    tinderBio:
      'Catch me at low light and night; autumn-winter inshore peaks. Bring lug/ragworm and I\'m yours.',
  },
];

const CATCH_STORAGE_KEY = 'findr-demo-catches';
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

  const previousCatches = useMemo(
    () => catches.filter((entry) => entry.fishId === fish.id).length,
    [catches, fish.id]
  );

  const handleLogCatch = () => {
    if (!selectedBait) return;

    const storedSize = size === 'mixed' ? 'average' : size;

    const catchEntry: CatchEntry = {
      id: Date.now().toString(),
      fishId: fish.id,
      fishName: fish.commonName,
      location,
      icesGrid: icesGrid.rectangle,
      date: new Date().toISOString(),
      bait: selectedBait,
      quantity,
      size: storedSize,
      habitat: habitat || undefined,
      marineBio,
      weatherSummary: `Sea temp: ${marineBio?.sstAvg?.toFixed(1) ?? 'N/A'}°C, Wind: ${
        marineBio?.windSpeed ?? 'N/A'
      } knots, Waves: ${marineBio?.waveHeight?.toFixed(1) ?? 'N/A'}m`,
      notes: notes || undefined,
    };

    onLogCatch(catchEntry);
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-success">
            <Fish className="w-6 h-6" />
            <span className="text-lg font-semibold">Log your catch</span>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            Close
          </button>
        </div>

        <div className="bg-primary/10 rounded-lg p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row">
            {fish.image && (
              <div className="relative h-24 w-full overflow-hidden rounded-lg border border-primary/30 sm:h-28 sm:w-40">
                <Image
                  src={fish.image}
                  alt={fish.commonName}
                  fill
                  className="object-cover"
                  sizes="(min-width: 640px) 160px, 60vw"
                />
              </div>
            )}
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{fish.commonName}</h3>
                  <p className="text-sm italic text-primary/80">{fish.name}</p>
                </div>
                {previousCatches > 0 && (
                  <span className="badge badge-secondary">{previousCatches} logged</span>
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
              <h4 className="font-semibold text-sm sm:text-base">
                🎯 Loved by {fish.commonName}
              </h4>
              <span className="hidden text-xs text-base-content/60 sm:inline">Tap to select</span>
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
                  {bait}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <label className="flex items-center justify-between text-sm font-semibold">
            All bait options
            <span className="text-xs text-error">*</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={selectedBait}
            onChange={(event) => setSelectedBait(event.target.value)}
          >
            <option value="">Choose your bait...</option>
            {baitOptions.map((bait) => (
              <option key={bait} value={bait}>
                {bait.charAt(0).toUpperCase() + bait.slice(1)}
              </option>
            ))}
          </select>
          {selectedBait === '' && (
            <p className="text-xs text-base-content/60">Pick a bait to enable logging.</p>
          )}
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold">How many did you catch?</label>
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
              Loads!
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold">What size were they?</label>
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
            Where did you catch it?
            <span className="text-xs text-base-content/60">Optional</span>
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
              Selected: {habitat}
              <button
                type="button"
                className="btn btn-ghost btn-xs ml-2"
                onClick={() => setHabitat('')}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold">
            Notes to self <span className="text-xs text-base-content/60">(tips for next visit)</span>
          </label>
          <textarea
            className="textarea textarea-bordered"
            placeholder="Best marks, tides, time of day..."
            rows={4}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        <div className="rounded-lg bg-info/10 p-4">
          <h4 className="mb-3 flex items-center gap-2 font-semibold">
            <Waves className="w-4 h-4" />
            Conditions recorded with this catch
          </h4>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4" />
              <span className="font-medium">Sea temp:</span>
              <span>{marineBio.sstAvg?.toFixed(1) ?? 'N/A'}°C</span>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4" />
              <span className="font-medium">Oxygen:</span>
              <span>{marineBio.dissolvedOxygenAvg?.toFixed(1) ?? 'N/A'} mg/L</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="font-medium">Salinity:</span>
              <span>{marineBio.salinityAvg?.toFixed(1) ?? 'N/A'}‰</span>
            </div>
            <div className="flex items-center gap-2">
              <CloudSun className="w-4 h-4" />
              <span className="font-medium">pH:</span>
              <span>{phReading}</span>
            </div>
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4" />
              <span className="font-medium">Wave height:</span>
              <span>{marineBio.waveHeight?.toFixed(1) ?? '1.2'}m</span>
            </div>
            <div className="flex items-center gap-2">
              <CloudSun className="w-4 h-4" />
              <span className="font-medium">Wind:</span>
              <span>{marineBio.windSpeed ?? '12'} knots</span>
            </div>
          </div>
        </div>

        <div className="card-actions justify-end">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLogCatch}
            disabled={!selectedBait}
            className="btn btn-success gap-2"
          >
            <Fish className="w-4 h-4" />
            Log catch
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
        <p className="text-lg text-base-content/70">No catches logged yet. Go fishing!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <ClipboardList className="h-6 w-6 text-primary" />
        Your catch log ({catches.length})
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
                  <h3 className="card-title text-lg">{catchEntry.fishName}</h3>
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
                    <span className="font-medium">Location:</span>
                    {catchEntry.location.name}
                  </p>
                  <p className="flex items-center gap-2">
                    <Fish className="h-4 w-4" />
                    <span className="font-medium">Bait:</span>
                    {catchEntry.bait}
                  </p>
                  {catchEntry.habitat && (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="font-medium">Habitat:</span>
                      {catchEntry.habitat}
                    </p>
                  )}
                  {catchEntry.notes && (
                    <p className="flex items-start gap-2">
                      <span className="font-medium">Notes:</span>
                      {catchEntry.notes}
                    </p>
                  )}
                </div>
                <div className="rounded-lg bg-info/10 p-3">
                  <p className="mb-2 flex items-center gap-2 font-medium">
                    <Waves className="h-4 w-4" />
                    Marine conditions
                  </p>
                  <p className="text-xs text-base-content/70">{catchEntry.weatherSummary}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function FindrCatchLogPage() {
  const [currentPage, setCurrentPage] = useState<'fish' | 'log' | 'history'>('fish');
  const [catches, setCatches] = useState<CatchEntry[]>([]);
  const [showCatchLogger, setShowCatchLogger] = useState(false);
  const [selectedFish, setSelectedFish] = useState<FishMatch | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const totalSpeciesCaught = useMemo(
    () => new Set(catches.map((entry) => entry.fishId)).size,
    [catches]
  );

  useEffect(() => {
    console.info('[Findr Catch Log] Using mock catch + marine datasets. Replace with Supabase/weather feeds.', {
      location: mockLocation.name,
      icesRectangle: mockIcesGrid.rectangle,
      fishCatalogSize: mockFishMatches.length,
      marineSignals: Object.keys(mockMarineBio),
      baitOptionsPreview: baitOptions.slice(0, 3),
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(CATCH_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as unknown;
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter((entry): entry is CatchEntry => {
        if (!entry || typeof entry !== 'object') return false;
        return 'id' in entry && 'fishId' in entry && 'fishName' in entry;
      });
      if (valid.length > 0) {
        setCatches(valid);
      }
    } catch (error) {
      console.warn('Failed to load Findr catch log data', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CATCH_STORAGE_KEY, JSON.stringify(catches));
  }, [catches]);

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

  const handleLogCatch = useCallback((entry: CatchEntry) => {
    setCatches((prev) => [entry, ...prev]);
    setShowCatchLogger(false);
    setSelectedFish(null);
    setCurrentPage('history');
  }, []);

  const handleCancelLogger = useCallback(() => {
    setShowCatchLogger(false);
    setSelectedFish(null);
  }, []);

  const handleClearCatches = useCallback(() => {
    setCatches([]);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CATCH_STORAGE_KEY);
    }
  }, []);

  const renderFishMatches = () => (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold">🎯 Fish matches for {mockLocation.name}</h2>
        <p className="text-base-content/70">
          Ordered by likelihood - most probable catches first.
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
                <figure className="relative h-32 overflow-hidden rounded-t-xl">
                  <Image
                    src={fishMatch.image}
                    alt={fishMatch.commonName}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1280px) 320px, (min-width: 768px) 45vw, 100vw"
                  />
                  {speciesCatchCount > 0 && (
                    <span className="badge badge-secondary absolute right-3 top-3">
                      {speciesCatchCount} caught
                    </span>
                  )}
                </figure>
              )}
              <div className="card-body space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="card-title text-lg">{fishMatch.commonName}</h3>
                    <p className="text-sm italic text-base-content/60">{fishMatch.name}</p>
                  </div>
                  <span className="badge badge-success">{fishMatch.confidence}%</span>
                </div>
                {fishMatch.tinderBio && (
                  <div className="rounded-lg border-l-4 border-pink-300 bg-pink-50 p-3 text-sm text-pink-800">
                    <p className="italic">“{fishMatch.tinderBio}”</p>
                  </div>
                )}
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Season:</span> {fishMatch.season}
                  </p>
                  <p>
                    <span className="font-medium">Depth:</span> {fishMatch.depth}
                  </p>
                  <p>
                    <span className="font-medium">Habitat:</span> {fishMatch.habitat}
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
                    Caught this
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
      <h2 className="text-2xl font-semibold">Log a catch</h2>
      <p className="mx-auto max-w-md text-base-content/70">
        Select a fish from the matches tab to log your catch details.
      </p>
      <button type="button" className="btn btn-primary" onClick={() => setCurrentPage('fish')}>
        Browse matches
      </button>
    </div>
  );

  return (
    <>
      <Head>
        <title>Findr catch log | WotNow</title>
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 pb-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-10">
          <FindrNavigation />

          <header className="card bg-primary text-primary-content shadow-lg">
            <div className="card-body flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-8 w-8" />
                <div>
                  <h1 className="text-2xl font-semibold">Findr catch log</h1>
                  <p className="text-sm text-primary-content/80">
                    Draft catch logging workflow with demo data while the API is under way.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="badge badge-outline badge-lg">
                  {catches.length} {catches.length === 1 ? 'catch' : 'catches'}
                </span>
                <span className="badge badge-outline badge-lg">
                  {totalSpeciesCaught} species logged
                </span>
              </div>
            </div>
          </header>

          <section className="card bg-base-100 shadow-xl">
            <div className="card-body space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="tabs tabs-boxed bg-base-200/60 p-1">
                  <button
                    type="button"
                    className={`tab gap-2 ${currentPage === 'fish' ? 'tab-active' : ''}`}
                    onClick={() => {
                      setCurrentPage('fish');
                      setShowCatchLogger(false);
                      setSelectedFish(null);
                    }}
                  >
                    <Fish className="h-4 w-4" />
                    Find fish
                  </button>
                  <button
                    type="button"
                    className={`tab gap-2 ${currentPage === 'log' ? 'tab-active' : ''}`}
                    onClick={() => {
                      setCurrentPage('log');
                      setShowCatchLogger(Boolean(selectedFish));
                    }}
                  >
                    <ClipboardList className="h-4 w-4" />
                    Log catch
                  </button>
                  <button
                    type="button"
                    className={`tab gap-2 ${currentPage === 'history' ? 'tab-active' : ''}`}
                    onClick={() => {
                      setCurrentPage('history');
                      setShowCatchLogger(false);
                      setSelectedFish(null);
                    }}
                  >
                    <Calendar className="h-4 w-4" />
                    History ({catches.length})
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleClearCatches}
                  disabled={catches.length === 0}
                >
                  Clear demo log
                </button>
              </div>

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
      </main>
    </>
  );
}
