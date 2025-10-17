/**
 * Test page for BlankReportModal component
 * Navigate to /test/blank-report-modal to test the unsuccessful trip logging functionality
 */

'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { BlankReportModal, type BlankReportData } from '../../components/findr/BlankReportModal';

export default function BlankReportModalTestPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastReportData, setLastReportData] = useState<BlankReportData | null>(null);

  const handleReportSubmit = async (reportData: BlankReportData) => {
    console.log('[TEST] Mock submitting blank report:', reportData);
    await new Promise((resolve) => setTimeout(resolve, 300));
  };

  const handleReportSuccess = (reportData: BlankReportData) => {
    console.log('[TEST] Blank report submitted successfully:', reportData);
    setLastReportData(reportData);
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-warning mb-2">
            Blank Report Modal Test
          </h1>
          <p className="text-base-content/70">
            Test the unsuccessful fishing trip logging interface
          </p>
        </div>

        {/* Test Actions */}
        <div className="space-y-6">
          
          {/* Open Modal Button */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">Test Blank Report</h2>
              <p className="text-sm text-base-content/70 mb-4">
                Click below to open the Blank Report Modal and test the 3-step flow for logging 
                unsuccessful fishing trips. This captures valuable data about fishing effort, 
                environmental conditions, and potential reasons for no catches.
              </p>
              <div className="card-actions">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="btn btn-warning btn-lg"
                >
                  <AlertTriangle className="w-5 h-5" />
                  Open Blank Report Modal
                </button>
              </div>
            </div>
          </div>

          {/* Results Display */}
          {lastReportData && (
            <div className="card bg-warning/10 border border-warning/20">
              <div className="card-body">
                <h2 className="card-title text-warning flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Blank Report Submitted Successfully!
                </h2>
                
                <div className="space-y-3 text-sm">
                  
                  {/* Trip Summary */}
                  <div className="bg-base-100 rounded-lg p-3 border">
                    <h3 className="font-medium mb-2">Trip Details</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><strong>Date:</strong> {lastReportData.date}</div>
                      <div><strong>Duration:</strong> {lastReportData.duration_hours}h</div>
                      <div><strong>Time:</strong> {lastReportData.time_period.join(', ')}</div>
                      <div><strong>Habitat:</strong> {lastReportData.habitat_type}</div>
                      <div><strong>Location:</strong> {lastReportData.rectangle_code}</div>
                      <div><strong>Try Again:</strong> {lastReportData.will_try_again ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                  
                  {/* Methods Used */}
                  <div className="bg-base-100 rounded-lg p-3 border">
                    <h3 className="font-medium mb-2">Methods Attempted</h3>
                    <div className="space-y-2 text-xs">
                      <div>
                        <strong>Baits:</strong> {lastReportData.bait_attempted.join(', ')}
                      </div>
                      <div>
                        <strong>Techniques:</strong> {lastReportData.techniques_used.join(', ')}
                      </div>
                    </div>
                  </div>
                  
                  {/* Environmental Conditions */}
                  <div className="bg-base-100 rounded-lg p-3 border">
                    <h3 className="font-medium mb-2">Environmental Conditions</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><strong>Weather:</strong> {lastReportData.weather_conditions.conditions.join(', ')}</div>
                      <div><strong>Water Clarity:</strong> {lastReportData.weather_conditions.water_clarity}</div>
                      <div><strong>Tide:</strong> {lastReportData.weather_conditions.tide_state}</div>
                    </div>
                  </div>
                  
                  {/* Analysis */}
                  {(lastReportData.possible_reasons.length > 0 || lastReportData.effort_notes) && (
                    <div className="bg-base-100 rounded-lg p-3 border">
                      <h3 className="font-medium mb-2">Analysis</h3>
                      {lastReportData.possible_reasons.length > 0 && (
                        <div className="mb-2">
                          <strong className="text-xs">Possible reasons:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {lastReportData.possible_reasons.map((reason, index) => (
                              <span key={index} className="badge badge-outline badge-xs">
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {lastReportData.effort_notes && (
                        <div>
                          <strong className="text-xs">Notes:</strong>
                          <p className="text-xs mt-1 opacity-80">{lastReportData.effort_notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Clear Results */}
                <div className="card-actions">
                  <button
                    onClick={() => setLastReportData(null)}
                    className="btn btn-sm btn-outline"
                  >
                    Clear Results
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feature Overview */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">Blank Report Features</h2>
              <div className="text-sm space-y-2 text-base-content/80">
                <div className="flex items-start gap-2">
                  <span className="badge badge-warning badge-sm mt-0.5">Step 1</span>
                  <div>
                    <strong>Trip Details:</strong> Date, time periods, duration, and location context
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="badge badge-warning badge-sm mt-0.5">Step 2</span>
                  <div>
                    <strong>Methods:</strong> Habitat type, baits attempted, and techniques used
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="badge badge-warning badge-sm mt-0.5">Step 3</span>
                  <div>
                    <strong>Analysis:</strong> Weather conditions, water clarity, tide state, possible reasons, and notes
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-info/10 rounded-lg border border-info/20">
                <p className="text-xs text-info-content">
                  <strong>Why log blank reports?</strong> This data helps identify patterns in unsuccessful 
                  trips, environmental factors that affect fish behavior, and technique effectiveness. 
                  Over time, this creates valuable insights for improving fishing success rates.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modal */}
      <BlankReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleReportSubmit}
        onSuccess={handleReportSuccess}
        rectangleCode="31E8" // Test rectangle
      />
    </div>
  );
}

// Disable static generation since this test page uses client-side state
export async function getServerSideProps() {
  return { props: {} };
}
