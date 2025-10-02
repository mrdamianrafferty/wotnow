/**
 * NotificationSetupModal Component
 * 
 * Modal for configuring notification preferences for a species
 * Allows users to set thresholds, channels, and quiet hours
 */

import React, { useState, useEffect } from 'react';
import { X, Bell, Mail, Smartphone, Clock, AlertCircle } from 'lucide-react';
import type { NotificationPreferences, Species } from '../../types/favourites';

interface NotificationSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  species: Species;
  initialPreferences?: NotificationPreferences;
  onSave: (preferences: NotificationPreferences) => Promise<void>;
}

export function NotificationSetupModal({
  isOpen,
  onClose,
  species,
  initialPreferences,
  onSave
}: NotificationSetupModalProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    speciesId: species.id,
    enabled: initialPreferences?.enabled ?? true,
    channels: initialPreferences?.channels ?? {
      push: true,
      email: false,
      sms: false
    },
    threshold: initialPreferences?.threshold ?? 75,
    quietHours: initialPreferences?.quietHours,
    maxPerDay: initialPreferences?.maxPerDay ?? 3
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setPreferences({
        speciesId: species.id,
        enabled: initialPreferences?.enabled ?? true,
        channels: initialPreferences?.channels ?? {
          push: true,
          email: false,
          sms: false
        },
        threshold: initialPreferences?.threshold ?? 75,
        quietHours: initialPreferences?.quietHours,
        maxPerDay: initialPreferences?.maxPerDay ?? 3
      });
      setError(null);
    }
  }, [isOpen, species.id, initialPreferences]);
  
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      await onSave(preferences);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            Notification Settings
          </h3>
          <button 
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Species Info */}
        <div className="mb-6 p-3 bg-base-200 rounded-lg">
          <p className="text-sm text-base-content/70 mb-1">Tracking</p>
          <p className="font-semibold">{species.commonName}</p>
          {species.scientificName && (
            <p className="text-sm text-base-content/60 italic">{species.scientificName}</p>
          )}
        </div>
        
        {/* Enable/Disable Toggle */}
        <div className="form-control mb-6">
          <label className="label cursor-pointer">
            <span className="label-text font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Enable Notifications
            </span>
            <input 
              type="checkbox" 
              className="toggle toggle-primary"
              checked={preferences.enabled}
              onChange={(e) => setPreferences({ ...preferences, enabled: e.target.checked })}
            />
          </label>
        </div>
        
        {preferences.enabled && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Confidence Threshold */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Confidence Threshold</span>
                <span className="label-text-alt text-primary font-bold">
                  {preferences.threshold}%
                </span>
              </label>
              <input 
                type="range"
                min="50"
                max="100"
                step="5"
                value={preferences.threshold}
                onChange={(e) => setPreferences({ ...preferences, threshold: Number(e.target.value) })}
                className="range range-primary range-sm"
              />
              <div className="w-full flex justify-between text-xs text-base-content/50 px-2 mt-1">
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
              <p className="text-xs text-base-content/60 mt-2">
                Alert me when confidence reaches this level
              </p>
            </div>
            
            {/* Notification Channels */}
            <div className="space-y-3">
              <label className="label">
                <span className="label-text font-semibold">Notification Channels</span>
              </label>
              
              <label className="label cursor-pointer bg-base-200 rounded-lg p-3">
                <span className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-primary" />
                  <span>Push Notifications</span>
                </span>
                <input 
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm"
                  checked={preferences.channels.push}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    channels: { ...preferences.channels, push: e.target.checked }
                  })}
                />
              </label>
              
              <label className="label cursor-pointer bg-base-200 rounded-lg p-3">
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-info" />
                  <span>Email</span>
                </span>
                <input 
                  type="checkbox"
                  className="checkbox checkbox-info checkbox-sm"
                  checked={preferences.channels.email}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    channels: { ...preferences.channels, email: e.target.checked }
                  })}
                />
              </label>
              
              <label className="label cursor-pointer bg-base-200 rounded-lg p-3 opacity-50">
                <span className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-success" />
                  <span>SMS (Coming Soon)</span>
                </span>
                <input 
                  type="checkbox"
                  className="checkbox checkbox-success checkbox-sm"
                  disabled
                  checked={false}
                />
              </label>
            </div>
            
            {/* Max Per Day */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Maximum Alerts Per Day</span>
                <span className="label-text-alt font-bold">
                  {preferences.maxPerDay}
                </span>
              </label>
              <input 
                type="range"
                min="1"
                max="10"
                step="1"
                value={preferences.maxPerDay}
                onChange={(e) => setPreferences({ ...preferences, maxPerDay: Number(e.target.value) })}
                className="range range-sm"
              />
              <p className="text-xs text-base-content/60 mt-2">
                Prevent notification spam
              </p>
            </div>
            
            {/* Quiet Hours */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Quiet Hours (Optional)
                </span>
              </label>
              
              <div className="flex items-center gap-3">
                <input 
                  type="time"
                  value={preferences.quietHours?.start || ''}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    quietHours: {
                      start: e.target.value,
                      end: preferences.quietHours?.end || '07:00'
                    }
                  })}
                  className="input input-bordered input-sm flex-1"
                  placeholder="Start"
                />
                <span className="text-sm text-base-content/50">to</span>
                <input 
                  type="time"
                  value={preferences.quietHours?.end || ''}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    quietHours: {
                      start: preferences.quietHours?.start || '22:00',
                      end: e.target.value
                    }
                  })}
                  className="input input-bordered input-sm flex-1"
                  placeholder="End"
                />
              </div>
              
              {preferences.quietHours?.start && (
                <button
                  onClick={() => setPreferences({ ...preferences, quietHours: undefined })}
                  className="btn btn-ghost btn-xs mt-2"
                >
                  Clear quiet hours
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="alert alert-error mt-4">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        {/* Actions */}
        <div className="modal-action">
          <button 
            onClick={onClose} 
            className="btn btn-ghost"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="btn btn-primary"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </div>
      
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}

export default NotificationSetupModal;
