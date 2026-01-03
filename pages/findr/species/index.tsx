'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import SEO from '../../../components/SEO';
import { FindrNavigation } from '../../../components/findr/FindrNavigationMobile';
import { useSpeciesBundle } from '../../../hooks/useSpeciesBundle';
import { TranslatedText } from '../../../components/translation/TranslatedFishCard';
import { GuildBadge } from '../../../components/findr/GuildBadge';
import { useOnlineStatus } from '../../../hooks/useOnlineStatus';
import { Search, Fish, WifiOff, Database, ChevronDown } from 'lucide-react';
import type { BundledSpecies } from '../../../types/speciesBundle';

const GUILDS = [
  { value: '', label: 'All Species' },
  { value: 'pelagic', label: 'Pelagic' },
  { value: 'reef_kelp', label: 'Reef & Kelp' },
  { value: 'benthic', label: 'Benthic' },
  { value: 'surf_estuary', label: 'Surf & Estuary' },
  { value: 'cephalopod', label: 'Cephalopod' },
];

function SpeciesCard({ species }: { species: BundledSpecies }) {
  const [imageError, setImageError] = useState(false);

  return (
    <Link
      href={`/findr/species/${species.slug}`}
      className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow border border-base-200 group"
    >
      <figure className="relative h-32 bg-gradient-to-br from-primary/10 to-secondary/10 overflow-hidden">
        {!imageError ? (
          <Image
            src={`/PNGS/${species.slug}.webp`}
            alt={species.name_en}
            fill
            className="object-contain group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <Fish className="w-12 h-12 text-base-content/20" />
          </div>
        )}
      </figure>
      <div className="card-body p-3">
        <h3 className="card-title text-sm font-medium line-clamp-1">
          {species.name_en}
        </h3>
        <p className="text-xs text-base-content/60 italic line-clamp-1">
          {species.scientific_name}
        </p>
        {species.guild && (
          <div className="mt-1">
            <GuildBadge guild={species.guild} size="sm" />
          </div>
        )}
      </div>
    </Link>
  );
}

function SpeciesCardSkeleton() {
  return (
    <div className="card bg-base-100 border border-base-200 animate-pulse">
      <div className="h-32 bg-base-200" />
      <div className="card-body p-3 space-y-2">
        <div className="h-4 bg-base-200 rounded w-3/4" />
        <div className="h-3 bg-base-200 rounded w-1/2" />
        <div className="h-5 bg-base-200 rounded w-16" />
      </div>
    </div>
  );
}

export default function SpeciesBrowserPage() {
  const {
    species,
    loading,
    error,
    ready,
    search,
    getByGuild,
    imageCacheProgress,
    imageCacheComplete,
    speciesCount,
  } = useSpeciesBundle();

  const isOnline = useOnlineStatus();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuild, setSelectedGuild] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'guild'>('name');

  const filteredSpecies = useMemo(() => {
    let result: BundledSpecies[] = [];

    // Apply guild filter
    if (selectedGuild) {
      result = getByGuild(selectedGuild);
    } else if (searchQuery.trim()) {
      result = search(searchQuery);
    } else {
      result = species;
    }

    // If both guild and search are set, filter the guild results by search
    if (selectedGuild && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name_en.toLowerCase().includes(query) ||
        s.scientific_name?.toLowerCase().includes(query)
      );
    }

    // Sort results
    if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.name_en.localeCompare(b.name_en));
    } else if (sortBy === 'guild') {
      result = [...result].sort((a, b) => {
        const guildCompare = (a.guild || 'zzz').localeCompare(b.guild || 'zzz');
        if (guildCompare !== 0) return guildCompare;
        return a.name_en.localeCompare(b.name_en);
      });
    }

    return result;
  }, [species, searchQuery, selectedGuild, sortBy, search, getByGuild]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleGuildChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGuild(e.target.value);
  }, []);

  return (
    <>
      <SEO
        title="Species Guide | Findr"
        description="Browse all fish species in our database. View profiles, images, and fishing tips for each species - even offline."
      />

      <div className="min-h-screen bg-gradient-to-b from-base-200 to-base-100">
        <FindrNavigation />

        <div className="container mx-auto px-4 py-6 max-w-6xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Fish className="w-6 h-6 text-primary" />
              <TranslatedText text="Species Guide" />
            </h1>
            <p className="text-base-content/70 mt-1">
              <TranslatedText text="Browse all species - works offline" />
            </p>
          </div>

          {/* Offline / Cache Status */}
          {!isOnline && (
            <div className="alert alert-info mb-4">
              <WifiOff className="w-5 h-5" />
              <span>
                <TranslatedText text="Viewing offline - using cached data" />
              </span>
            </div>
          )}

          {!imageCacheComplete && imageCacheProgress > 0 && (
            <div className="alert alert-success mb-4">
              <Database className="w-5 h-5" />
              <span>
                <TranslatedText text="Caching images for offline:" /> {imageCacheProgress}%
              </span>
            </div>
          )}

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
              <input
                type="text"
                placeholder="Search species..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="input input-bordered w-full pl-10"
              />
            </div>

            {/* Guild Filter */}
            <div className="relative">
              <select
                value={selectedGuild}
                onChange={handleGuildChange}
                className="select select-bordered w-full sm:w-40"
              >
                {GUILDS.map(guild => (
                  <option key={guild.value} value={guild.value}>
                    {guild.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-outline gap-2">
                Sort
                <ChevronDown className="w-4 h-4" />
              </label>
              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-40">
                <li>
                  <button
                    onClick={() => setSortBy('name')}
                    className={sortBy === 'name' ? 'active' : ''}
                  >
                    Name A-Z
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setSortBy('guild')}
                    className={sortBy === 'guild' ? 'active' : ''}
                  >
                    By Guild
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Results count */}
          <div className="mb-4 text-sm text-base-content/60">
            {loading ? (
              <TranslatedText text="Loading species..." />
            ) : (
              <>
                <TranslatedText text="Showing" /> {filteredSpecies.length} <TranslatedText text="of" /> {speciesCount} <TranslatedText text="species" />
              </>
            )}
          </div>

          {/* Error state */}
          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 20 }).map((_, i) => (
                <SpeciesCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Species grid */}
          {ready && !loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredSpecies.map(s => (
                <SpeciesCard key={s.id} species={s} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {ready && !loading && filteredSpecies.length === 0 && (
            <div className="text-center py-12">
              <Fish className="w-16 h-16 mx-auto text-base-content/20 mb-4" />
              <p className="text-lg text-base-content/60">
                {searchQuery || selectedGuild ? (
                  <TranslatedText text="No species found matching your filters" />
                ) : (
                  <TranslatedText text="No species available" />
                )}
              </p>
              {(searchQuery || selectedGuild) && (
                <button
                  onClick={() => { setSearchQuery(''); setSelectedGuild(''); }}
                  className="btn btn-ghost btn-sm mt-2"
                >
                  <TranslatedText text="Clear filters" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
