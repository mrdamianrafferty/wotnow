/**
 * Test page for ReferenceDataTables component
 * 
 * This page provides comprehensive testing of the reference data tables
 * with full functionality testing, keyboard shortcuts, and interaction examples.
 */

'use client';

import React, { useState } from 'react';
import { BarChart3, Info, Fish, Target, MapPin } from 'lucide-react';
import { ReferenceDataTables } from '../../components/findr/ReferenceDataTables';

export default function ReferenceDataTablesTestPage() {
  const [isTablesOpen, setIsTablesOpen] = useState(false);
  const [initialView, setInitialView] = useState<'species' | 'baits' | 'habitats'>('species');

  return (
    <div className="min-h-screen bg-base-200 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="card-title text-3xl text-primary flex items-center gap-3">
              <BarChart3 className="w-8 h-8" />
              Reference Data Tables Test Page
            </h1>
            <p className="text-base-content/70">
              Comprehensive testing environment for the reference data tables component with 
              species information, bait effectiveness tracking, and habitat analysis.
            </p>
          </div>
        </div>

        {/* Quick Launch Section */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-xl flex items-center gap-2">
              <Info className="w-5 h-5" />
              Quick Launch Options
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              
              <div className="card bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <div className="card-body text-center p-4">
                  <Fish className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold mb-2">Species Data</h3>
                  <p className="text-sm text-base-content/70 mb-3">
                    Browse species catalog with success rates, preferred baits, and seasonal patterns
                  </p>
                  <button
                    onClick={() => {
                      setInitialView('species');
                      setIsTablesOpen(true);
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    View Species
                  </button>
                </div>
              </div>
              
              <div className="card bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20">
                <div className="card-body text-center p-4">
                  <Target className="w-8 h-8 text-secondary mx-auto mb-2" />
                  <h3 className="font-semibold mb-2">Bait Effectiveness</h3>
                  <p className="text-sm text-base-content/70 mb-3">
                    Analyze bait performance, success rates, and optimal conditions
                  </p>
                  <button
                    onClick={() => {
                      setInitialView('baits');
                      setIsTablesOpen(true);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    View Baits
                  </button>
                </div>
              </div>
              
              <div className="card bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20">
                <div className="card-body text-center p-4">
                  <MapPin className="w-8 h-8 text-accent mx-auto mb-2" />
                  <h3 className="font-semibold mb-2">Habitat Analysis</h3>
                  <p className="text-sm text-base-content/70 mb-3">
                    Explore habitat types, success rates, and optimal fishing conditions
                  </p>
                  <button
                    onClick={() => {
                      setInitialView('habitats');
                      setIsTablesOpen(true);
                    }}
                    className="btn btn-accent btn-sm"
                  >
                    View Habitats
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Overview */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-xl">Component Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              
              <div>
                <h3 className="font-semibold text-lg mb-3">Data Management</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>Species Catalog:</strong> Comprehensive fish species information with success rates and preferences</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>Bait Tracking:</strong> Effectiveness analysis with cost and availability data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>Habitat Analysis:</strong> Location types with optimal conditions and timing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>Expandable Rows:</strong> Detailed information revealed on demand</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-lg mb-3">User Interface</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-success">•</span>
                    <span><strong>Sortable Columns:</strong> Click headers to sort by name, success rate, or usage</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-success">•</span>
                    <span><strong>Search Functionality:</strong> Real-time filtering across all data fields</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-success">•</span>
                    <span><strong>Tab Navigation:</strong> Switch between species, baits, and habitats</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-success">•</span>
                    <span><strong>Data Export:</strong> Download filtered data as JSON files</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Testing Instructions */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-xl">Testing Instructions</h2>
            <div className="space-y-4 mt-4">
              
              <div className="alert alert-info">
                <Info className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold">Navigation Testing</h3>
                  <p className="text-sm">Use the tab buttons to switch between Species, Baits, and Habitats views.</p>
                </div>
              </div>
              
              <div className="alert alert-warning">
                <Target className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold">Search Testing</h3>
                  <p className="text-sm">Try searching for &ldquo;mackerel&rdquo;, &ldquo;lugworm&rdquo;, or &ldquo;rocky&rdquo; to test filtering.</p>
                </div>
              </div>
              
              <div className="alert alert-success">
                <BarChart3 className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold">Sorting Testing</h3>
                  <p className="text-sm">Click column headers to test sorting. Notice the sort direction indicators.</p>
                </div>
              </div>
              
              <div className="alert alert-error">
                <Fish className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold">Expansion Testing</h3>
                  <p className="text-sm">Click the chevron buttons to expand rows and see detailed information.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sample Data Preview */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-xl">Sample Data Preview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              
              <div className="stats stats-vertical shadow">
                <div className="stat">
                  <div className="stat-title">Species Records</div>
                  <div className="stat-value text-primary">4</div>
                  <div className="stat-desc">Including mackerel, sea bass, cod, plaice</div>
                </div>
              </div>
              
              <div className="stats stats-vertical shadow">
                <div className="stat">
                  <div className="stat-title">Bait Types</div>
                  <div className="stat-value text-secondary">4</div>
                  <div className="stat-desc">Lugworm, ragworm, feathers, prawns</div>
                </div>
              </div>
              
              <div className="stats stats-vertical shadow">
                <div className="stat">
                  <div className="stat-title">Habitat Types</div>
                  <div className="stat-value text-accent">3</div>
                  <div className="stat-desc">Rocky shore, sandy beach, pier/harbor</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Launch Button */}
        <div className="card bg-gradient-to-r from-primary to-secondary text-primary-content shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title justify-center text-2xl mb-4">Ready to Test?</h2>
            <p className="mb-6">Launch the reference data tables to explore all features and functionality.</p>
            <button
              onClick={() => setIsTablesOpen(true)}
              className="btn btn-lg bg-white text-primary hover:bg-base-100"
            >
              <BarChart3 className="w-6 h-6" />
              Open Reference Data Tables
            </button>
          </div>
        </div>
      </div>

      {/* Reference Data Tables Component */}
      <ReferenceDataTables
        isOpen={isTablesOpen}
        onClose={() => setIsTablesOpen(false)}
        initialView={initialView}
      />
    </div>
  );
}
// Disable static generation for this page
export async function getServerSideProps() {
  return { props: {} };
}
