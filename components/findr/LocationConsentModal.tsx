// components/findr/LocationConsentModal.tsx
"use client";

import { useState } from 'react';
// Using standard emoji icons instead of heroicons for simplicity
import { LocationPreferences } from '../../hooks/useLocationConsent';

interface LocationConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preferences: Partial<LocationPreferences>) => Promise<void>;
}

export function LocationConsentModal({ isOpen, onClose, onSave }: LocationConsentModalProps) {
  const [step, setStep] = useState<'intro' | 'method' | 'preferences'>('intro');
  const [preferences, setPreferences] = useState<Partial<LocationPreferences>>({
    shareGPS: false,
    shareCourse: true,
    autoDetect: false,
    maxDistance: 50
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setLoading(true);
      await onSave(preferences);
      onClose();
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        
        {/* Intro Step */}
        {step === 'intro' && (
          <div className="p-6">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-3">🗺️</span>
              <h2 className="text-xl font-bold">Better Fishing Predictions</h2>
            </div>
            
            <p className="text-gray-600 mb-6">
              Help us provide more accurate fishing predictions by sharing your general fishing area. 
              We respect your privacy and only use this to improve your experience.
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex items-start">
                <span className="text-xl mr-3">🔒</span>
                <div>
                  <h3 className="font-medium">Privacy First</h3>
                  <p className="text-sm text-gray-600">Your exact location is never stored. We use fishing zones (~30km areas).</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="text-xl mr-3">📍</span>
                <div>
                  <h3 className="font-medium">Better Predictions</h3>
                  <p className="text-sm text-gray-600">Local tide times, species abundance, and area-specific fishing tips.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Not now
              </button>
              <button
                onClick={() => setStep('method')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Method Selection Step */}
        {step === 'method' && (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">How would you like to set your fishing area?</h2>
            
            <div className="space-y-3 mb-6">
              <label className="block p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="method"
                  value="manual"
                  checked={!preferences.autoDetect}
                  onChange={() => setPreferences(prev => ({ ...prev, autoDetect: false, shareGPS: false }))}
                  className="mr-3"
                />
                <div>
                  <h3 className="font-medium">Select on Map (Recommended)</h3>
                  <p className="text-sm text-gray-600">Click your fishing areas on a map. No GPS required.</p>
                </div>
              </label>
              
              <label className="block p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="method"
                  value="coarse"
                  checked={preferences.autoDetect && !preferences.shareGPS}
                  onChange={() => setPreferences(prev => ({ ...prev, autoDetect: true, shareGPS: false, shareCourse: true }))}
                  className="mr-3"
                />
                <div>
                  <h3 className="font-medium">Auto-detect Region</h3>
                  <p className="text-sm text-gray-600">Share your general region (city-level) for automatic area selection.</p>
                </div>
              </label>
              
              <label className="block p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="method"
                  value="precise"
                  checked={preferences.shareGPS}
                  onChange={() => setPreferences(prev => ({ ...prev, autoDetect: true, shareGPS: true, shareCourse: true }))}
                  className="mr-3"
                />
                <div>
                  <h3 className="font-medium">GPS Location</h3>
                  <p className="text-sm text-gray-600">Most accurate predictions. Location is rounded to fishing zones.</p>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('intro')}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => setStep('preferences')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Preferences Step */}
        {step === 'preferences' && (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Customize Your Settings</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Maximum distance from home (km)
                </label>
                <select
                  value={preferences.maxDistance}
                  onChange={(e) => setPreferences(prev => ({ ...prev, maxDistance: Number(e.target.value) }))}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value={25}>25 km (local waters)</option>
                  <option value={50}>50 km (day trips)</option>
                  <option value={100}>100 km (weekend trips)</option>
                  <option value={200}>200 km (holiday fishing)</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={preferences.shareCourse || false}
                    onChange={(e) => setPreferences(prev => ({ ...prev, shareCourse: e.target.checked }))}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium">Share general region</span>
                    <p className="text-sm text-gray-600">Help improve predictions for your area</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium mb-2">What you&apos;ll get:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Local tide times and marine conditions</li>
                <li>• Species abundance for your area</li>
                <li>• Shore vs boat fishing recommendations</li>
                <li>• Weather optimized for coastal fishing</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('method')}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}