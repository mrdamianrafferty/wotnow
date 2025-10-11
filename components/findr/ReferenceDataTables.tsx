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
 * Now powered by real catch data with EMODnet enrichment!
 */

'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Search, Download, BarChart3, TrendingUp,
  Fish, Target, MapPin, Calendar, Clock, Thermometer,
  ChevronDown, ChevronUp, ExternalLink, Star, Award,
  RefreshCw, Waves
} from 'lucide-react';
import { SPECIES_IMAGE_MAP } from '../../data/speciesImageMap';
import { TranslatedText } from '../translation/TranslatedFishCard';
import { useReferenceData } from '../../hooks/useReferenceData';

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
  averageDepth?: number;
  preferredSubstrate?: string;
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
  avgDepth?: number;
  commonSubstrates?: string[];
  tips: string[];
}

type TableView = 'species' | 'baits' | 'habitats';
type SortField = 'name' | 'successRate' | 'totalCatches' | 'totalUses' | 'totalSessions';
type SortDirection = 'asc' | 'desc';

interface ReferenceDataTablesProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: TableView;
  userId?: string;
}

export function ReferenceDataTables({ 
  isOpen, 
  onClose, 
  initialView = 'species',
  userId 
}: ReferenceDataTablesProps) {
  // Fetch real data from API
  const { data, loading, error, refetch } = useReferenceData({ 
    userId,
    autoFetch: false // Only fetch when modal opens
  });

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen && !data && !loading) {
      refetch();
    }
  }, [isOpen, data, loading, refetch]);

  // State
  const [currentView, setCurrentView] = useState<TableView>(initialView);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Filtered and sorted data
  const filteredSpeciesData = useMemo(() => {
    let speciesData = data?.species || [];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      speciesData = speciesData.filter(species => 
        species.commonName.toLowerCase().includes(term) ||
        species.scientificName.toLowerCase().includes(term) ||
        species.preferredBaits.some(bait => bait.toLowerCase().includes(term)) ||
        species.habitatTypes.some(habitat => habitat.toLowerCase().includes(term))
      );
    }
    
    return speciesData.sort((a, b) => {
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
  }, [data?.species, searchTerm, sortField, sortDirection]);
  
  const filteredBaitData = useMemo(() => {
    let baitData = data?.baits || [];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      baitData = baitData.filter(bait =>
        bait.baitName.toLowerCase().includes(term) ||
        bait.targetSpecies.some(species => species.toLowerCase().includes(term)) ||
        bait.bestConditions.some(condition => condition.toLowerCase().includes(term))
      );
    }
    
    return baitData.sort((a, b) => {
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
  }, [data?.baits, searchTerm, sortField, sortDirection]);
  
  const filteredHabitatData = useMemo(() => {
    let habitatData = data?.habitats || [];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      habitatData = habitatData.filter(habitat =>
        habitat.type.toLowerCase().includes(term) ||
        habitat.description.toLowerCase().includes(term) ||
        habitat.bestSpecies.some(species => species.toLowerCase().includes(term))
      );
    }
    
    return habitatData.sort((a, b) => {
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
  }, [data?.habitats, searchTerm, sortField, sortDirection]);
  
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
    if (!data) {
      alert('No data to export');
      return;
    }

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
  }, [data, currentView, filteredSpeciesData, filteredBaitData, filteredHabitatData]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-base-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-primary flex items-center gap-3">
              <BarChart3 className="w-6 h-6" />
              <TranslatedText text="Reference Data" />
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
              className={`tab gap-2 ${currentView === 'species' ? 'tab-active' : 'text-base-content'}`}
              onClick={() => setCurrentView('species')}
            >
              <Fish className="w-4 h-4" />
              <TranslatedText text="Species" />
            </button>
            <button
              className={`tab gap-2 ${currentView === 'baits' ? 'tab-active' : 'text-base-content'}`}
              onClick={() => setCurrentView('baits')}
            >
              <Target className="w-4 h-4" />
              <TranslatedText text="Baits" />
            </button>
            <button
              className={`tab gap-2 ${currentView === 'habitats' ? 'tab-active' : 'text-base-content'}`}
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
              onClick={refetch}
              className="btn btn-outline gap-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <TranslatedText text="Refresh" />
            </button>
            <button
              onClick={exportData}
              className="btn btn-outline gap-2"
              disabled={!data}
            >
              <Download className="w-4 h-4" />
              <TranslatedText text="Export" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="loading loading-spinner loading-lg mb-4"></span>
              <span className="text-lg">Loading reference data...</span>
              <span className="text-sm opacity-70 mt-2">Analyzing your catches...</span>
            </div>
          )}
          
          {/* Error state */}
          {error && !loading && (
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <span className="font-semibold">Error loading data:</span>
                <span className="ml-2">{error.message}</span>
              </div>
              <button onClick={refetch} className="btn btn-sm">
                Retry
              </button>
            </div>
          )}
          
          {/* Data display */}
          {!loading && !error && data && (
            <>
              {currentView === 'species' && (
                <>
                  {filteredSpeciesData.length > 0 ? (
                    <SpeciesTable 
                      data={filteredSpeciesData}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      expandedRows={expandedRows}
                      onToggleExpansion={toggleRowExpansion}
                    />
                  ) : (
                    <EmptyState 
                      icon={Fish}
                      title="No species data yet"
                      message="Start logging catches to build your species database!"
                    />
                  )}
                </>
              )}
              
              {currentView === 'baits' && (
                <>
                  {filteredBaitData.length > 0 ? (
                    <BaitTable 
                      data={filteredBaitData}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      expandedRows={expandedRows}
                      onToggleExpansion={toggleRowExpansion}
                    />
                  ) : (
                    <EmptyState 
                      icon={Target}
                      title="No bait data yet"
                      message="Log catches with bait information in notes to see effectiveness stats!"
                    />
                  )}
                </>
              )}
              
              {currentView === 'habitats' && (
                <>
                  {filteredHabitatData.length > 0 ? (
                    <HabitatTable 
                      data={filteredHabitatData}
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      expandedRows={expandedRows}
                      onToggleExpansion={toggleRowExpansion}
                    />
                  ) : (
                    <EmptyState 
                      icon={MapPin}
                      title="No habitat data yet"
                      message="Log catches in different habitats to see which are most productive!"
                    />
                  )}
                </>
              )}
            </>
          )}
          
          {/* No data fetched yet */}
          {!loading && !error && !data && (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-xl font-semibold mb-2">Ready to analyze</h3>
              <p className="opacity-70 mb-4">Click refresh to load your catch data</p>
              <button onClick={refetch} className="btn btn-primary gap-2">
                <RefreshCw className="w-4 h-4" />
                Load Data
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ 
  icon: Icon, 
  title, 
  message 
}: { 
  icon: React.ElementType; 
  title: string; 
  message: string;
}) {
  return (
    <div className="text-center py-12">
      <Icon className="w-16 h-16 mx-auto mb-4 opacity-30" />
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="opacity-70">{message}</p>
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
                      <div className="w-12 h-12 rounded-lg bg-base-200">
                        {SPECIES_IMAGE_MAP[species.code]?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={SPECIES_IMAGE_MAP[species.code].image} 
                            alt={species.commonName}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
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
                    {species.totalCatches < 5 && (
                      <div className="badge badge-ghost badge-sm">
                        Limited data
                      </div>
                    )}
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
                      
                      {/* Enrichment Data Section */}
                      {(species.averageDepth || species.preferredSubstrate) && (
                        <div className="border-b border-base-300 pb-4 mb-4">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Waves className="w-4 h-4 text-info" />
                            Environmental Insights
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {species.averageDepth && (
                              <div className="stat bg-base-100 rounded-lg p-3">
                                <div className="stat-title text-sm">Average Depth</div>
                                <div className="stat-value text-2xl text-info">
                                  {species.averageDepth}m
                                </div>
                                <div className="stat-desc">From EMODnet data</div>
                              </div>
                            )}
                            
                            {species.preferredSubstrate && (
                              <div className="stat bg-base-100 rounded-lg p-3">
                                <div className="stat-title text-sm">Preferred Substrate</div>
                                <div className="stat-value text-2xl capitalize text-success">
                                  {species.preferredSubstrate}
                                </div>
                                <div className="stat-desc">From EMODnet data</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Preferred Baits
                          </h4>
                          <div className="space-y-1">
                            {species.preferredBaits.length > 0 ? (
                              species.preferredBaits.map((bait, index) => (
                                <span key={index} className="badge badge-primary badge-sm mr-1">
                                  {bait}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm opacity-50">No bait data yet</span>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Habitat Types
                          </h4>
                          <div className="space-y-1">
                            {species.habitatTypes.length > 0 ? (
                              species.habitatTypes.map((habitat, index) => (
                                <span key={index} className="badge badge-secondary badge-sm mr-1">
                                  {habitat}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm opacity-50">Detected from catches</span>
                            )}
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
                      
                      {/* Environmental Data Section */}
                      {(habitat.avgDepth || (habitat.commonSubstrates && habitat.commonSubstrates.length > 0)) && (
                        <div className="border-t border-base-300 pt-4">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Waves className="w-4 h-4 text-info" />
                            Environmental Data
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {habitat.avgDepth && (
                              <div className="stat bg-base-100 rounded-lg p-3">
                                <div className="stat-title text-sm">Average Depth</div>
                                <div className="stat-value text-2xl text-info">{habitat.avgDepth}m</div>
                                <div className="stat-desc">From EMODnet data</div>
                              </div>
                            )}
                            
                            {habitat.commonSubstrates && habitat.commonSubstrates.length > 0 && (
                              <div className="bg-base-100 rounded-lg p-3">
                                <div className="text-sm font-semibold mb-2">Common Substrates</div>
                                <div className="flex gap-2 flex-wrap">
                                  {habitat.commonSubstrates.map((sub, i) => (
                                    <span key={i} className="badge badge-outline capitalize">
                                      {sub}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
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