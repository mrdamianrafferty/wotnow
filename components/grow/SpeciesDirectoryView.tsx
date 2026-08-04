import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { getPlantImage } from '@/lib/grow/plantImages';
import { Search, Leaf } from 'lucide-react';

export type SpeciesDirectoryEntry = {
  slug: string;
  name: string;
  scientificName: string | null;
  category: string | null;
  imageKey: string | null;
};

export interface SpeciesDirectoryLabels {
  heading: string;
  intro: (count: number) => string;
  searchPlaceholder: string;
  allCategories: string;
  categoryLabels: Record<string, string>;
  showing: (shown: number, total: number) => string;
  noResults: string;
}

export const DEFAULT_DIRECTORY_LABELS: SpeciesDirectoryLabels = {
  heading: 'Plant Directory',
  intro: (count) => `Browse all ${count} plants — tap any species for growing advice, timing, and care.`,
  searchPlaceholder: 'Search plants...',
  allCategories: 'All categories',
  categoryLabels: {
    tree: 'Trees',
    vegetable: 'Vegetables',
    herb: 'Herbs',
    ornamental: 'Ornamentals',
    'fruit-tree': 'Fruit trees',
    shrub: 'Shrubs',
    vine: 'Vines',
    fruit: 'Fruit',
  },
  showing: (shown, total) => `Showing ${shown} of ${total} plants`,
  noResults: 'No plants match your search.',
};

interface SpeciesDirectoryViewProps {
  species: SpeciesDirectoryEntry[];
  /** Path prefix for species links, e.g. "/grow/species" or "/grow/fr/species" */
  basePath: string;
  labels?: Partial<SpeciesDirectoryLabels>;
}

function SpeciesCard({ entry, basePath }: { entry: SpeciesDirectoryEntry; basePath: string }) {
  const image = entry.imageKey ? getPlantImage(entry.imageKey, 'medium') : null;

  return (
    <Link
      href={`${basePath}/${entry.slug}`}
      className="group flex flex-col rounded-lg border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative h-28 bg-emerald-50 flex items-center justify-center overflow-hidden">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={entry.name}
            loading="lazy"
            className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <Leaf className="w-8 h-8 text-emerald-300" aria-hidden="true" />
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-1">{entry.name}</h3>
        {entry.scientificName && (
          <p className="text-xs text-gray-500 italic line-clamp-1">{entry.scientificName}</p>
        )}
      </div>
    </Link>
  );
}

export function SpeciesDirectoryView({ species, basePath, labels: labelOverrides }: SpeciesDirectoryViewProps) {
  const labels = { ...DEFAULT_DIRECTORY_LABELS, ...labelOverrides };
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const categories = useMemo(() => {
    const set = new Set<string>();
    species.forEach((s) => { if (s.category) set.add(s.category); });
    return Array.from(set).sort();
  }, [species]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return species.filter((s) => {
      if (category && s.category !== category) return false;
      if (!query) return true;
      return (
        s.name.toLowerCase().includes(query) ||
        (s.scientificName ?? '').toLowerCase().includes(query)
      );
    });
  }, [species, search, category]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Leaf className="w-6 h-6 text-emerald-600" aria-hidden="true" />
          {labels.heading}
        </h1>
        <p className="text-gray-600 mt-1">{labels.intro(species.length)}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            placeholder={labels.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 text-sm"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-gray-300 text-sm px-3 py-2 sm:w-48"
        >
          <option value="">{labels.allCategories}</option>
          {categories.map((c) => (
            <option key={c} value={c}>{labels.categoryLabels[c] ?? c}</option>
          ))}
        </select>
      </div>

      <p className="text-sm text-gray-500 mb-4">{labels.showing(filtered.length, species.length)}</p>

      {/* Server-rendered links to every species — always present in the DOM, filters just hide/show. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {species.map((entry) => (
          <div key={entry.slug} className={filtered.includes(entry) ? '' : 'hidden'}>
            <SpeciesCard entry={entry} basePath={basePath} />
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">{labels.noResults}</div>
      )}
    </div>
  );
}
