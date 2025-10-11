/**
 * Test page for SessionLogModal component
 * Navigate to /test/session-log-modal to test the session logging functionality
 */

'use client';

import React, { useState } from 'react';
import { Calendar, CheckCircle } from 'lucide-react';
import { SessionLogModal } from '../../components/findr/SessionLogModal';
import type { CatchLogInput } from '@/types/findr-enrichment';

export default function SessionLogModalTestPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittedCatches, setSubmittedCatches] = useState<CatchLogInput[]>([]);

  const handleSubmitCatch = async (input: CatchLogInput) => {
    console.log('[TEST] Mock session catch submitted:', input);
    setSubmittedCatches((prev) => [...prev, input]);
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { success: true };
  };

  const handleSessionSuccess = (catchCount: number) => {
    console.log('[TEST] Session logged successfully with', catchCount, 'catches');
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Session Log Modal Test
          </h1>
          <p className="text-base-content/70">
            Test the multi-step detailed fishing session logging interface
          </p>
        </div>

        {/* Test Actions */}
        <div className="space-y-6">
          
          {/* Open Modal Button */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h2 className="card-title">Test Session Logging</h2>
              <p className="text-sm text-base-content/70 mb-4">
                Click below to open the Session Log Modal and test the complete 4-step flow:
                Date/Time → Location/Habitat → Catches → Photos
              </p>
              <div className="card-actions">
                <button
                  onClick={() => {
                    setSubmittedCatches([]);
                    setIsModalOpen(true);
                  }}
                  className="btn btn-secondary btn-lg"
                >
                  <Calendar className="w-5 h-5" />
                  Open Session Log Modal
                </button>
              </div>
            </div>
          </div>

          {/* Results Display */}
          {submittedCatches.length > 0 && (
            <div className="card bg-success/10 border border-success/20">
              <div className="card-body">
                <h2 className="card-title text-success flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Session Logged Successfully!
                </h2>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium">Total Catches:</span> {submittedCatches.length}
                  </div>
                  <div>
                    <span className="font-medium">Total Fish:</span> {submittedCatches.reduce((sum, entry) => sum + entry.quantity, 0)}
                  </div>
                  
                  {/* Catch Details */}
                  <div className="space-y-2">
                    <span className="font-medium">Catch Details:</span>
                    {submittedCatches.map((entry, index) => (
                      <div key={`${entry.speciesId}-${index}`} className="bg-base-100 rounded-lg p-3 border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Catch #{index + 1}</span>
                          <span className="badge badge-outline">{entry.speciesCommonName}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><strong>Species:</strong> {entry.speciesCommonName}</div>
                          <div><strong>Quantity:</strong> {entry.quantity}</div>
                          <div><strong>Size:</strong> {entry.sizeCategory ?? '—'}</div>
                          <div><strong>Bait:</strong> {entry.baitUsed ?? '—'}</div>
                          <div><strong>Habitat:</strong> {entry.habitatType ?? '—'}</div>
                          <div><strong>Rectangle:</strong> {entry.rectangleCode ?? '—'}</div>
                          {entry.notes && (
                            <div className="col-span-2"><strong>Notes:</strong> {entry.notes}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clear Results */}
                <div className="card-actions">
                  <button
                    onClick={() => setSubmittedCatches([])}
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
              <h2 className="card-title">Session Log Features</h2>
              <div className="text-sm space-y-2 text-base-content/80">
                <div className="flex items-start gap-2">
                  <span className="badge badge-primary badge-sm mt-0.5">Step 1</span>
                  <div>
                    <strong>Date & Time:</strong> Select fishing date and time periods (morning, afternoon, evening, night)
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="badge badge-primary badge-sm mt-0.5">Step 2</span>
                  <div>
                    <strong>Location & Habitat:</strong> Choose habitat type (rocky shore, sandy beach, pier, etc.)
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="badge badge-primary badge-sm mt-0.5">Step 3</span>
                  <div>
                    <strong>Multiple Catches:</strong> Add multiple species with quantities, sizes, baits, and notes
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="badge badge-primary badge-sm mt-0.5">Step 4</span>
                  <div>
                    <strong>Photos:</strong> Upload up to 5 photos with previews (optional)
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modal */}
      <SessionLogModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSessionSuccess}
        onSubmitCatch={handleSubmitCatch}
        rectangleCode="31E8" // Test rectangle
      />
    </div>
  );
}
