import { useState } from 'react';
import { ShareModal } from '../components/sharing/ShareModal';

export default function TestSharePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Share Modal Test</h1>
        
        <div className="card bg-base-100 shadow-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Activity Details</h2>
          <p className="mb-6">Click the button below to test the Share Modal component.</p>
          
          <button 
            className="btn btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            Open Share Modal
          </button>
        </div>

        <ShareModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          activityName="Play Football"
          activityDescription="The weather is perfect for a game today!"
        />
      </div>
    </div>
  );
}