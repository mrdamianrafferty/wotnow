/**
 * ReferenceDataTables Component
 * 
 * Comprehensive data management interface for fishing reference information:
 * - Species catalog with detailed information and images
 * - Bait effectiveness tracking and recommendations
 * - Habitat preference analysis and success rates
 * - Seasonal patterns and timing data
 * - Location-specific insights and statistics
 * 
 * Accessible from the catch log interface to provide valuable
 * reference information for fishing planning and analysis.
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { 
  Search, Download, BarChart3, TrendingUp,
  Fish, Target, MapPin, Calendar, Clock, Thermometer,
  ChevronDown, ChevronUp, ExternalLink, Star, Award
} from 'lucide-react';
import { SPECIES_IMAGE_MAP } from '../../data/speciesImageMap';
import { TranslatedText } from '../translation/TranslatedFishCard';

// Types
interface SpeciesData {
  id: string;
  code: string;
  commonName: string;
  scientificName: string;
  imageUrl?: string;
  averageSize: string;
  seasonality: string[];
  preferredBaits: string[];
  habitatTypes: string[];
  successRate: number;
  totalCatches: number;
  bestMonth: string;
  averageWeight?: number;
  tips: string[];
}

interface BaitEffectivenessData {
  baitName: string;
  targetSpecies: string[];
  successRate: number;
  totalUses: number;
  bestConditions: string[];
  cost: 'low' | 'medium' | 'high';
  availability: 'common' | 'seasonal' | 'rare';
  tips: string[];
}

interface HabitatData {
  type: string;
  description: string;
  bestSpecies: string[];
  optimalConditions: {
    tideStates: string[];
    timeOfDay: string[];
    seasons: string[];
    weatherConditions: string[];
  };
  successRate: number;
  totalSessions: number;
  avgCatchPerSession: number;
  tips: string[];
}

type TableView = 'species' | 'baits' | 'habitats';
type SortField = 'name' | 'successRate' | 'totalCatches' | 'totalUses' | 'totalSessions';
type SortDirection = 'asc' | 'desc';

interface ReferenceDataTablesProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: TableView;
}

// Sample data - in production this would come from API/database
const SAMPLE_SPECIES_DATA: SpeciesData[] = [
  {
    id: 'MAC',
    code: 'MAC',
    commonName: 'Atlantic Mackerel',
    scientificName: 'Scomber scombrus',
    averageSize: '25-35cm',
    seasonality: ['Spring', 'Summer', 'Early Autumn'],
    preferredBaits: ['Feather rigs', 'Small spinners', 'Mackerel strip'],
    habitatTypes: ['Open sea', 'Deep water', 'Pier/Harbor'],
    successRate: 78,
    totalCatches: 245,
    bestMonth: 'July',
    averageWeight: 0.4,
    tips: ['Early morning most productive', 'Look for feeding birds', 'Fast retrieval essential']
  },
  {
    id: 'SBA',
    code: 'SBA',
    commonName: 'European Sea Bass',
    scientificName: 'Dicentrarchus labrax',
    averageSize: '30-50cm',
    seasonality: ['All year', 'Peak in autumn'],
    preferredBaits: ['Ragworm', 'Lugworm', 'Prawns', 'Soft plastics'],
    habitatTypes: ['Rocky shore', 'Estuary', 'Shallow water'],
    successRate: 45,
    totalCatches: 127,
    bestMonth: 'October',
    averageWeight: 1.2,
    tips: ['Fish rising tide', 'Target structure', 'Night fishing very effective']
  },
  {
    id: 'COD',
    code: 'COD',
    commonName: 'Atlantic Cod',
    scientificName: 'Gadus morhua',
    averageSize: '40-70cm',
    seasonality: ['Autumn', 'Winter', 'Early Spring'],
    preferredBaits: ['Lugworm', 'Ragworm', 'Crab', 'Squid'],
    habitatTypes: ['Deep water', 'Wreck/Reef', 'Rocky shore'],
    successRate: 32,
    totalCatches: 89,
    bestMonth: 'November',
    averageWeight: 2.1,
    tips: ['Target deeper water', 'Low light conditions', 'Strong tackle essential']
  },
  {
    id: 'PLE',
    code: 'PLE',
    commonName: 'European Plaice',
    scientificName: 'Pleuronectes platessa',
    averageSize: '25-40cm',
    seasonality: ['All year', 'Best in winter'],
    preferredBaits: ['Lugworm', 'Ragworm', 'Peeler crab'],
    habitatTypes: ['Sandy beach', 'Shallow water', 'Estuary'],
    successRate: 56,
    totalCatches: 178,
    bestMonth: 'February',
    averageWeight: 0.8,
    tips: ['Target sandy areas', 'Use light tackle', 'Slow presentation works best']
  }
];

const SAMPLE_BAIT_DATA: BaitEffectivenessData[] = [
  {
    baitName: 'Lugworm',
    targetSpecies: ['Cod', 'Plaice', 'Whiting', 'Dab', 'Flounder'],
    successRate: 67,
    totalUses: 156,
    bestConditions: ['Calm seas', 'Overcast', 'Low tide'],
    cost: 'medium',
    availability: 'common',
    tips: ['Keep fresh and cool', 'Use whole worms for bigger fish', 'Cast gently to avoid damage']
  },
  {
    baitName: 'Ragworm',
    targetSpecies: ['Sea Bass', 'Cod', 'Whiting', 'Pollack'],
    successRate: 72,
    totalUses: 203,
    bestConditions: ['Rising tide', 'Rough seas', 'Dawn/dusk'],
    cost: 'medium',
    availability: 'common',
    tips: ['Very versatile bait', 'Thread carefully on hook', 'Combine with other baits']
  },
  {
    baitName: 'Feather rigs',
    targetSpecies: ['Mackerel', 'Herring', 'Garfish', 'Pollack'],
    successRate: 84,
    totalUses: 127,
    bestConditions: ['Clear water', 'Moving water', 'Bright conditions'],
    cost: 'low',
    availability: 'common',
    tips: ['Fast retrieval essential', 'Vary colors', 'Keep moving to find fish']
  },
  {
    baitName: 'Prawns',
    targetSpecies: ['Sea Bass', 'Whiting', 'Cod', 'Pollack'],
    successRate: 58,
    totalUses: 89,
    bestConditions: ['Clear water', 'Calm conditions', 'Night time'],
    cost: 'high',
    availability: 'common',
    tips: ['Use fresh if possible', 'Hook through tail', 'Natural presentation important']
  }
];

const SAMPLE_HABITAT_DATA: HabitatData[] = [
  {
    type: 'Rocky Shore',
    description: 'Coastline with rocks, boulders, and varied structure providing shelter for fish',
    bestSpecies: ['Sea Bass', 'Pollack', 'Wrasse', 'Blenny'],
    optimalConditions: {
      tideStates: ['Rising', 'High'],
      timeOfDay: ['Dawn', 'Dusk', 'Night'],
      seasons: ['Autumn', 'Winter'],
      weatherConditions: ['Overcast', 'Light rain', 'Calm']
    },
    successRate: 64,
    totalSessions: 78,
    avgCatchPerSession: 2.3,
    tips: ['Fish the gullies', 'Target areas with white water', 'Be careful of slippery rocks']
  },
  {
    type: 'Sandy Beach',
    description: 'Open sandy coastline with consistent depth and bottom composition',
    bestSpecies: ['Plaice', 'Flounder', 'Dab', 'Sole', 'Whiting'],
    optimalConditions: {
      tideStates: ['Low', 'Rising'],
      timeOfDay: ['Night', 'Early morning'],
      seasons: ['Winter', 'Spring'],
      weatherConditions: ['Rough seas', 'Onshore winds']
    },
    successRate: 52,
    totalSessions: 94,
    avgCatchPerSession: 1.8,
    tips: ['Look for channels and features', 'Fish the surf line', 'Long casts often better']
  },
  {
    type: 'Pier/Harbor',
    description: 'Man-made structures providing deep water access and shelter',
    bestSpecies: ['Mackerel', 'Cod', 'Sea Bass', 'Garfish'],
    optimalConditions: {
      tideStates: ['High', 'Falling'],
      timeOfDay: ['Early morning', 'Evening'],
      seasons: ['Summer', 'Autumn'],
      weatherConditions: ['Calm', 'Clear', 'Light winds']
    },
    successRate: 71,
    totalSessions: 156,
    avgCatchPerSession: 3.1,
    tips: ['Fish near structure', 'Try different depths', 'Be aware of boat traffic']
  }
];

export function ReferenceDataTables({ isOpen, onClose, initialView = 'species' }: ReferenceDataTablesProps) {
  // State
  const [currentView, setCurrentView] = useState<TableView>(initialView);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Filtered and sorted data
  const filteredSpeciesData = useMemo(() => {
    let data = SAMPLE_SPECIES_DATA;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(species => 
        species.commonName.toLowerCase().includes(term) ||
        species.scientificName.toLowerCase().includes(term) ||
        species.preferredBaits.some(bait => bait.toLowerCase().includes(term)) ||
        species.habitatTypes.some(habitat => habitat.toLowerCase().includes(term))
      );
    }
    
    return data.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      
      switch (sortField) {
        case 'name':
          aVal = a.commonName;
          bVal = b.commonName;
          break;
        case 'successRate':
          aVal = a.successRate;
          bVal = b.successRate;
          break;
        case 'totalCatches':
          aVal = a.totalCatches;
          bVal = b.totalCatches;
          break;
        default:
          aVal = a.commonName;
          bVal = b.commonName;
      }
      
      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      } else {
        return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      }
    });
  }, [searchTerm, sortField, sortDirection]);
  
  const filteredBaitData = useMemo(() => {
    let data = SAMPLE_BAIT_DATA;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(bait =>
        bait.baitName.toLowerCase().includes(term) ||
        bait.targetSpecies.some(species => species.toLowerCase().includes(term)) ||
        bait.bestConditions.some(condition => condition.toLowerCase().includes(term))
      );
    }
    
    return data.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      
      switch (sortField) {
        case 'name':
          aVal = a.baitName;
          bVal = b.baitName;
          break;
        case 'successRate':
          aVal = a.successRate;
          bVal = b.successRate;
          break;
        case 'totalUses':
          aVal = a.totalUses;
          bVal = b.totalUses;
          break;
        default:
          aVal = a.baitName;
          bVal = b.baitName;
      }
      
      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      } else {
        return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      }
    });
  }, [searchTerm, sortField, sortDirection]);
  
  const filteredHabitatData = useMemo(() => {
    let data = SAMPLE_HABITAT_DATA;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(habitat =>
        habitat.type.toLowerCase().includes(term) ||
        habitat.description.toLowerCase().includes(term) ||
        habitat.bestSpecies.some(species => species.toLowerCase().includes(term))
      );
    }
    
    return data.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      
      switch (sortField) {
        case 'name':
          aVal = a.type;
          bVal = b.type;
          break;
        case 'successRate':
          aVal = a.successRate;
          bVal = b.successRate;
          break;
        case 'totalSessions':
          aVal = a.totalSessions;
          bVal = b.totalSessions;
          break;
        default:
          aVal = a.type;
          bVal = b.type;
      }
      
      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      } else {
        return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      }
    });
  }, [searchTerm, sortField, sortDirection]);
  
  // Handlers
  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);
  
  const toggleRowExpansion = useCallback((id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);
  
  const exportData = useCallback(() => {
    let dataToExport: SpeciesData[] | BaitEffectivenessData[] | HabitatData[] = [];
    let filename = '';
    
    switch (currentView) {
      case 'species':
        dataToExport = filteredSpeciesData;
        filename = 'species-data.json';
        break;
      case 'baits':
        dataToExport = filteredBaitData;
        filename = 'bait-data.json';
        break;
      case 'habitats':
        dataToExport = filteredHabitatData;
        filename = 'habitat-data.json';
        break;
    }
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [currentView, filteredSpeciesData, filteredBaitData, filteredHabitatData]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-base-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-3">
              <BarChart3 className="w-6 h-6" />
              <TranslatedText text="Reference Data Tables" />
            </h2>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-circle"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* View Tabs */}
          <div className="tabs tabs-boxed bg-base-200/60 p-1 mb-4">
            <button
              className={`tab gap-2 ${currentView === 'species' ? 'tab-active' : ''}`}
              onClick={() => setCurrentView('species')}
            >
              <Fish className="w-4 h-4" />
              <TranslatedText text="Species" />
            </button>
            <button
              className={`tab gap-2 ${currentView === 'baits' ? 'tab-active' : ''}`}
              onClick={() => setCurrentView('baits')}
            >
              <Target className="w-4 h-4" />
              <TranslatedText text="Baits" />
            </button>
            <button
              className={`tab gap-2 ${currentView === 'habitats' ? 'tab-active' : ''}`}
              onClick={() => setCurrentView('habitats')}
            >
              <MapPin className="w-4 h-4" />
              <TranslatedText text="Habitats" />
            </button>
          </div>
          
          {/* Search and Actions */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
              <input
                type="text"
                placeholder="Search data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input input-bordered w-full pl-10"
              />
            </div>
            <button
              onClick={exportData}
              className="btn btn-outline gap-2"
            >
              <Download className="w-4 h-4" />
              <TranslatedText text="Export" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {currentView === 'species' && (
            <SpeciesTable 
              data={filteredSpeciesData}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              expandedRows={expandedRows}
              onToggleExpansion={toggleRowExpansion}
            />
          )}
          
          {currentView === 'baits' && (
            <BaitTable 
              data={filteredBaitData}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              expandedRows={expandedRows}
              onToggleExpansion={toggleRowExpansion}
            />
          )}
          
          {currentView === 'habitats' && (
            <HabitatTable 
              data={filteredHabitatData}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              expandedRows={expandedRows}
              onToggleExpansion={toggleRowExpansion}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Species Table Component
function SpeciesTable({ 
  data, 
  sortField, 
  sortDirection, 
  onSort, 
  expandedRows, 
  onToggleExpansion 
}: {
  data: SpeciesData[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  expandedRows: Set<string>;
  onToggleExpansion: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th></th>
            <th>
              <button
                onClick={() => onSort('name')}
                className="flex items-center gap-1 font-semibold"
              >
                Species
                {sortField === 'name' && (
                  sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </th>
            <th>
              <button
                onClick={() => onSort('successRate')}
                className="flex items-center gap-1 font-semibold"
              >
                Success Rate
                {sortField === 'successRate' && (
                  sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </th>
            <th>
              <button
                onClick={() => onSort('totalCatches')}
                className="flex items-center gap-1 font-semibold"
              >
                Total Catches
                {sortField === 'totalCatches' && (
                  sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </th>
            <th>Best Month</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((species) => (
            <React.Fragment key={species.id}>
              <tr className="hover">
                <td>
                  <button
                    onClick={() => onToggleExpansion(species.id)}
                    className="btn btn-ghost btn-xs"
                  >
                    {expandedRows.has(species.id) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="avatar">
                      <div className="w-12 h-12 rounded-lg">
                        {SPECIES_IMAGE_MAP[species.code]?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={SPECIES_IMAGE_MAP[species.code].image} 
                            alt={species.commonName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-base-200 flex items-center justify-center">
                            <Fish className="w-6 h-6 text-base-content/50" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold">{species.commonName}</div>
                      <div className="text-sm opacity-50">{species.scientificName}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className={`badge ${
                      species.successRate >= 70 ? 'badge-success' :
                      species.successRate >= 50 ? 'badge-warning' : 
                      'badge-error'
                    }`}>
                      {species.successRate}%
                    </div>
                  </div>
                </td>
                <td>
                  <span className="font-mono">{species.totalCatches}</span>
                </td>
                <td>
                  <span className="badge badge-outline">{species.bestMonth}</span>
                </td>
                <td>
                  <button className="btn btn-ghost btn-xs">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </td>
              </tr>
              
              {expandedRows.has(species.id) && (
                <tr>
                  <td colSpan={6}>
                    <div className="bg-base-200 rounded-lg p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Preferred Baits
                          </h4>
                          <div className="space-y-1">
                            {species.preferredBaits.map((bait, index) => (
                              <span key={index} className="badge badge-primary badge-sm mr-1">
                                {bait}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Habitat Types
                          </h4>
                          <div className="space-y-1">
                            {species.habitatTypes.map((habitat, index) => (
                              <span key={index} className="badge badge-secondary badge-sm mr-1">
                                {habitat}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Seasonality
                          </h4>
                          <div className="space-y-1">
                            {species.seasonality.map((season, index) => (
                              <span key={index} className="badge badge-accent badge-sm mr-1">
                                {season}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Star className="w-4 h-4" />
                          Fishing Tips
                        </h4>
                        <ul className="text-sm space-y-1">
                          {species.tips.map((tip, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Bait Table Component
function BaitTable({ 
  data, 
  sortField, 
  sortDirection, 
  onSort, 
  expandedRows, 
  onToggleExpansion 
}: {
  data: BaitEffectivenessData[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  expandedRows: Set<string>;
  onToggleExpansion: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th></th>
            <th>
              <button
                onClick={() => onSort('name')}
                className="flex items-center gap-1 font-semibold"
              >
                Bait
                {sortField === 'name' && (
                  sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </th>
            <th>
              <button
                onClick={() => onSort('successRate')}
                className="flex items-center gap-1 font-semibold"
              >
                Success Rate
                {sortField === 'successRate' && (
                  sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </th>
            <th>
              <button
                onClick={() => onSort('totalUses')}
                className="flex items-center gap-1 font-semibold"
              >
                Total Uses
                {sortField === 'totalUses' && (
                  sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </th>
            <th>Cost</th>
            <th>Availability</th>
          </tr>
        </thead>
        <tbody>
          {data.map((bait) => (
            <React.Fragment key={bait.baitName}>
              <tr className="hover">
                <td>
                  <button
                    onClick={() => onToggleExpansion(bait.baitName)}
                    className="btn btn-ghost btn-xs"
                  >
                    {expandedRows.has(bait.baitName) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </td>
                <td>
                  <div className="font-bold">{bait.baitName}</div>
                </td>
                <td>
                  <div className={`badge ${
                    bait.successRate >= 70 ? 'badge-success' :
                    bait.successRate >= 50 ? 'badge-warning' : 
                    'badge-error'
                  }`}>
                    {bait.successRate}%
                  </div>
                </td>
                <td>
                  <span className="font-mono">{bait.totalUses}</span>
                </td>
                <td>
                  <span className={`badge badge-outline ${
                    bait.cost === 'low' ? 'badge-success' :
                    bait.cost === 'medium' ? 'badge-warning' :
                    'badge-error'
                  }`}>
                    {bait.cost}
                  </span>
                </td>
                <td>
                  <span className={`badge badge-outline ${
                    bait.availability === 'common' ? 'badge-success' :
                    bait.availability === 'seasonal' ? 'badge-warning' :
                    'badge-error'
                  }`}>
                    {bait.availability}
                  </span>
                </td>
              </tr>
              
              {expandedRows.has(bait.baitName) && (
                <tr>
                  <td colSpan={6}>
                    <div className="bg-base-200 rounded-lg p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Fish className="w-4 h-4" />
                            Target Species
                          </h4>
                          <div className="space-y-1">
                            {bait.targetSpecies.map((species, index) => (
                              <span key={index} className="badge badge-primary badge-sm mr-1">
                                {species}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Thermometer className="w-4 h-4" />
                            Best Conditions
                          </h4>
                          <div className="space-y-1">
                            {bait.bestConditions.map((condition, index) => (
                              <span key={index} className="badge badge-secondary badge-sm mr-1">
                                {condition}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Star className="w-4 h-4" />
                          Usage Tips
                        </h4>
                        <ul className="text-sm space-y-1">
                          {bait.tips.map((tip, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Habitat Table Component
function HabitatTable({ 
  data, 
  sortField, 
  sortDirection, 
  onSort, 
  expandedRows, 
  onToggleExpansion 
}: {
  data: HabitatData[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  expandedRows: Set<string>;
  onToggleExpansion: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th></th>
            <th>
              <button
                onClick={() => onSort('name')}
                className="flex items-center gap-1 font-semibold"
              >
                Habitat Type
                {sortField === 'name' && (
                  sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </th>
            <th>
              <button
                onClick={() => onSort('successRate')}
                className="flex items-center gap-1 font-semibold"
              >
                Success Rate
                {sortField === 'successRate' && (
                  sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </th>
            <th>
              <button
                onClick={() => onSort('totalSessions')}
                className="flex items-center gap-1 font-semibold"
              >
                Total Sessions
                {sortField === 'totalSessions' && (
                  sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </th>
            <th>Avg. Catch/Session</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {data.map((habitat) => (
            <React.Fragment key={habitat.type}>
              <tr className="hover">
                <td>
                  <button
                    onClick={() => onToggleExpansion(habitat.type)}
                    className="btn btn-ghost btn-xs"
                  >
                    {expandedRows.has(habitat.type) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </td>
                <td>
                  <div className="font-bold">{habitat.type}</div>
                </td>
                <td>
                  <div className={`badge ${
                    habitat.successRate >= 70 ? 'badge-success' :
                    habitat.successRate >= 50 ? 'badge-warning' : 
                    'badge-error'
                  }`}>
                    {habitat.successRate}%
                  </div>
                </td>
                <td>
                  <span className="font-mono">{habitat.totalSessions}</span>
                </td>
                <td>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-success" />
                    <span className="font-mono">{habitat.avgCatchPerSession}</span>
                  </div>
                </td>
                <td>
                  <div className="text-sm text-base-content/70 max-w-xs truncate">
                    {habitat.description}
                  </div>
                </td>
              </tr>
              
              {expandedRows.has(habitat.type) && (
                <tr>
                  <td colSpan={6}>
                    <div className="bg-base-200 rounded-lg p-4 space-y-4">
                      <div className="mb-4">
                        <p className="text-sm">{habitat.description}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Fish className="w-4 h-4" />
                            Best Species
                          </h4>
                          <div className="space-y-1">
                            {habitat.bestSpecies.map((species, index) => (
                              <span key={index} className="badge badge-primary badge-sm mr-1">
                                {species}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Optimal Times
                          </h4>
                          <div className="space-y-1">
                            {habitat.optimalConditions.timeOfDay.map((time, index) => (
                              <span key={index} className="badge badge-secondary badge-sm mr-1">
                                {time}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Best Seasons
                          </h4>
                          <div className="space-y-1">
                            {habitat.optimalConditions.seasons.map((season, index) => (
                              <span key={index} className="badge badge-accent badge-sm mr-1">
                                {season}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Thermometer className="w-4 h-4" />
                            Weather Conditions
                          </h4>
                          <div className="space-y-1">
                            {habitat.optimalConditions.weatherConditions.map((weather, index) => (
                              <span key={index} className="badge badge-info badge-sm mr-1">
                                {weather}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          Fishing Tips
                        </h4>
                        <ul className="text-sm space-y-1">
                          {habitat.tips.map((tip, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}