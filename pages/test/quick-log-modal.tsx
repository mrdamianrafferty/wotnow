/**
 * Test page for QuickLogModal component
 * 
 * This allows us to test the modal in isolation before integrating
 * into the main catch log page.
 */

'use client';

import React, { useState } from 'react';
import { QuickLogModal } from '../../components/findr/QuickLogModal';
import type { QuickLogParams } from '@/hooks/useCatchLogger';

export default function QuickLogModalTest() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const handleQuickLog = async (params: QuickLogParams) => {
    console.log('Mock quick log submitted:', params);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true };
  };

  const handleSuccess = () => {
    setLastMessage('Quick log succeeded (mock handler).');
    setIsModalOpen(false);
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
        
        {lastMessage && (
          <div className="bg-base-200 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Last Result:</h3>
            <p className="text-sm">{lastMessage}</p>
          </div>
        )}
      </div>
      
      <QuickLogModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onQuickLog={handleQuickLog}
        onSuccess={handleSuccess}
        rectangleCode="31E8"
      />
    </div>
  );
}
