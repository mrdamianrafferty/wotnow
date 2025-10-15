import React, { useState } from 'react';
import SimplifiedShareModal from '../components/sharing/SimplifiedShareModal';
import { Share2 } from 'lucide-react';

export default function ShareModalDemo() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Example activity data - in a real implementation, this would come from your activity selection
  const activityData = {
    id: 'football',
    name: 'Football',
    description: 'Perfect conditions for football today. No rain, light breeze, and comfortable temperature.',
    message: "The pitch is looking mint and the weather's perfect for a game!"
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-base-100 p-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Share Modal Demo</h1>
        <p className="text-base-content/70">Click the button below to open the enhanced share modal</p>
      </div>
      
      <div className="card w-full max-w-md bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">{activityData.name}</h2>
          <p>{activityData.description}</p>
          <div className="card-actions justify-end mt-4">
            <button 
              className="btn btn-primary"
              onClick={() => setIsModalOpen(true)}
            >
              <Share2 size={18} className="mr-2" />
              Share Invitation
            </button>
          </div>
        </div>
      </div>
      
      <SimplifiedShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        activityName={activityData.name}
        activityDescription={activityData.description}
        activityMessage={activityData.message}
        activityEmoji="⚽"
      />
    </div>
  );
}
