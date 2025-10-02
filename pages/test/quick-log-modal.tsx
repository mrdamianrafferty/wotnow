/**
 * Test page for QuickLogModal component
 * 
 * This allows us to test the modal in isolation before integrating
 * into the main catch log page.
 */

'use client';

import React, { useState } from 'react';
import { QuickLogModal } from '../../components/findr/QuickLogModal';
import type { CatchEntry } from '../../hooks/useCatchLog';

export default function QuickLogModalTest() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastCatch, setLastCatch] = useState<CatchEntry | null>(null);

  const handleSuccess = (catchEntry: CatchEntry) => {
    console.log('Catch logged successfully:', catchEntry);
    setLastCatch(catchEntry);
  };

  return (
    <div className="min-h-screen bg-base-100 p-8">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-center">Quick Log Modal Test</h1>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary btn-lg w-full"
        >
          Test Quick Log Modal
        </button>
        
        {lastCatch && (
          <div className="bg-base-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Last Catch Logged:</h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(lastCatch, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <QuickLogModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        rectangleCode="31E8"
      />
    </div>
  );
}