/**
 * Example integration of ICES Rectangle Enhanced Favourites System
 * 
 * This shows how to integrate the new ICES-based enhancement system
 * into the existing favourites page while maintaining backward compatibility.
 */

import React, { useMemo, useState } from 'react';
import { useEnhancedFavouriteInsights } from '../../../hooks/useEnhancedFavouriteInsights';
import { upgradeWithICESData, ICESEnhancedFavouriteEntry } from '../../../lib/findr/icesEnhancement';
import { FALLBACK_RECTANGLE_OPTIONS } from '../../../lib/findr/fallbackRectangles';

// Example component showing the integration
export const EnhancedFavouritesExample: React.FC = () => {
  const [activeRectangle, setActiveRectangle] = useState<string | null>('31E8'); // Example: English Channel
  const [favouriteIds] = useState(['sea-bass', 'atlantic-mackerel', 'cod', 'pollock']);

  // Use the enhanced insights hook
  const { 
    insights, 
    loading, 
    error, 
    source, 
    rectangleContext 
  } = useEnhancedFavouriteInsights(favouriteIds, activeRectangle);

  // Example of upgrading existing favourite entries with ICES data
  const existingFavourites = useMemo(() => [
    { id: 'sea-bass', name: 'European Sea Bass', card: null },
    { id: 'atlantic-mackerel', name: 'Atlantic Mackerel', card: null },
    { id: 'cod', name: 'Atlantic Cod', card: null },
    { id: 'pollock', name: 'Pollock', card: null },
  ], []);

  const upgradedEntries = useMemo(() => 
    upgradeWithICESData(existingFavourites, activeRectangle),
    [existingFavourites, activeRectangle]
  );

  // Get available rectangles for selection
  const availableRectangles = useMemo(() => 
    FALLBACK_RECTANGLE_OPTIONS.slice(0, 10), // Show first 10 for example
    []
  );

  const renderDataQualityBadge = (entry: ICESEnhancedFavouriteEntry) => {
    const badgeClasses = {
      user: 'badge badge-success',
      ices: 'badge badge-info', 
      mock: 'badge badge-warning',
    };

    const badgeText = {
      user: 'User Data',
      ices: 'ICES Baseline',
      mock: 'Mock Data',
    };

    return (
      <span className={badgeClasses[entry.dataQuality]}>
        {badgeText[entry.dataQuality]}
      </span>
    );
  };

  const renderConfidenceScore = (entry: ICESEnhancedFavouriteEntry) => {
    if (entry.confidence === null) return null;
    
    const confidenceClass = entry.confidence >= 80 ? 'text-success' : 
                           entry.confidence >= 60 ? 'text-warning' : 'text-error';
    
    return (
      <div className={`text-sm ${confidenceClass}`}>
        Confidence: {entry.confidence}%
        {entry.isICESEnhanced && (
          <div className="text-xs opacity-70">
            Location: {entry.locationConfidence}% | Season: {entry.seasonalConfidence}%
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-6">
      <header className="space-y-4">
        <h1 className="text-2xl font-bold">Enhanced Favourites with ICES Data</h1>
        
        {/* Rectangle Selection */}
        <div className="form-control">
          <label className="label">
            <span className="label-text">Select ICES Rectangle Area</span>
          </label>
          <select 
            className="select select-bordered w-full max-w-xs"
            value={activeRectangle || ''}
            onChange={(e) => setActiveRectangle(e.target.value || null)}
          >
            <option value="">No area selected</option>
            {availableRectangles.map(rect => (
              <option key={rect.code} value={rect.code}>
                {rect.code} - {rect.region}
              </option>
            ))}
          </select>
        </div>

        {/* Rectangle Context Display */}
        {rectangleContext && (
          <div className="alert alert-info">
            <div>
              <h3 className="font-bold">Current Area: {rectangleContext.code}</h3>
              <div className="text-sm">
                Region: {rectangleContext.region}<br/>
                Center: {rectangleContext.centerLat}°N, {Math.abs(rectangleContext.centerLon)}°W
              </div>
            </div>
          </div>
        )}

        {/* Data Source Indicator */}
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Data Source</div>
            <div className="stat-value text-primary">{source.toUpperCase()}</div>
            <div className="stat-desc">
              {source === 'ices' && 'Using ICES rectangle baseline data'}
              {source === 'mixed' && 'User data enhanced with ICES baseline'}
              {source === 'supabase' && 'Using user-generated data'}
              {source === 'fallback' && 'Using mock data'}
              {source === 'none' && 'No data available'}
            </div>
          </div>
          <div className="stat">
            <div className="stat-title">Species</div>
            <div className="stat-value">{favouriteIds.length}</div>
            <div className="stat-desc">In favourites list</div>
          </div>
          <div className="stat">
            <div className="stat-title">Insights</div>
            <div className="stat-value">{insights.length}</div>
            <div className="stat-desc">Available insights</div>
          </div>
        </div>
      </header>

      {/* Loading and Error States */}
      {loading && (
        <div className="alert alert-info">
          <div className="loading loading-spinner"></div>
          <span>Loading enhanced insights...</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span>Error: {error}</span>
        </div>
      )}

      {/* Enhanced Insights Display */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Enhanced Insights</h2>
        {insights.map(insight => (
          <div key={insight.id} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-start">
                <h3 className="card-title">{insight.id}</h3>
                {renderDataQualityBadge(insight)}
              </div>
              
              {renderConfidenceScore(insight)}
              
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h4 className="font-semibold">Activity Status</h4>
                  <p className="text-sm">{insight.seasonLabel}</p>
                  <p className="text-xs opacity-70">{insight.recentActivity}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Best Bait</h4>
                  <p className="text-sm">{insight.bestBait}</p>
                  <span className="badge badge-outline badge-xs">
                    {insight.bestBaitSource}
                  </span>
                </div>
                
                {insight.rectangleRegion && (
                  <div>
                    <h4 className="font-semibold">Location Context</h4>
                    <p className="text-sm">{insight.rectangleRegion}</p>
                    {insight.distanceToShoreKm && (
                      <p className="text-xs opacity-70">
                        {insight.distanceToShoreKm.toFixed(1)}km from shore
                      </p>
                    )}
                  </div>
                )}
                
                <div>
                  <h4 className="font-semibold">Conditions</h4>
                  <p className="text-sm">{insight.lastPerfectConditions}</p>
                  <p className="text-xs opacity-70">Best: {insight.nextBestDay}</p>
                </div>
              </div>
              
              {insight.catches !== null && (
                <div className="mt-4 p-3 bg-base-200 rounded-lg">
                  <h4 className="font-semibold">Personal Stats</h4>
                  <p className="text-sm">Catches: {insight.catches}</p>
                  {insight.swipedDateLabel && (
                    <p className="text-xs opacity-70">Last activity: {insight.swipedDateLabel}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Upgraded Entries Comparison */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">ICES-Enhanced Entries (Demo)</h2>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Species</th>
                <th>Data Quality</th>
                <th>Season Status</th>
                <th>Location Confidence</th>
                <th>Recommended Bait</th>
                <th>ICES Enhanced</th>
              </tr>
            </thead>
            <tbody>
              {upgradedEntries.map(entry => (
                <tr key={entry.id}>
                  <td>{entry.name}</td>
                  <td>{renderDataQualityBadge(entry)}</td>
                  <td>{entry.season}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <progress 
                        className="progress progress-primary w-20" 
                        value={entry.locationConfidence} 
                        max="100"
                      ></progress>
                      <span className="text-xs">{entry.locationConfidence}%</span>
                    </div>
                  </td>
                  <td className="text-sm">{entry.bestBait}</td>
                  <td>
                    {entry.isICESEnhanced ? (
                      <span className="badge badge-success badge-sm">✓</span>
                    ) : (
                      <span className="badge badge-error badge-sm">✗</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integration Notes */}
      <div className="alert alert-success">
        <div>
          <h3 className="font-bold">Integration Benefits</h3>
          <ul className="text-sm list-disc list-inside space-y-1">
            <li>ICES rectangle data provides meaningful baseline information</li>
            <li>Location-aware bait and technique recommendations</li>
            <li>Confidence scoring based on species-area compatibility</li>
            <li>Seamless upgrade path from mock data to real user data</li>
            <li>Maintains backward compatibility with existing system</li>
          </ul>
        </div>
      </div>
    </div>
  );
};