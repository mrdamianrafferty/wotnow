'use client';

import React from 'react';
import { MapPin, RefreshCcw } from 'lucide-react';
import type { RectangleOption } from '../../hooks/useFindrRectangleOptions';
import { TranslatedText } from '../translation/TranslatedFishCard';

interface _LanguageOption {
  value: string;
  label: string;
}



export interface SettingsFormProps {
  manualCode: string;
  manualNormalized: string | null;
  manualInvalid: boolean;
  predictionDate: string;
  language: string;
  loading: boolean;
  deckResetDisabled: boolean;
  activeOption: RectangleOption | null;
  activeRectangle: string | null;
  formattedLastUpdated: string | null;
  totalPredictions: number;
  onManualCodeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDateChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSetToday: () => void;
  onLanguageChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onReload: () => void;
  onResetDeck: () => void;
  showDeckTools?: boolean;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({
  manualCode,
  manualNormalized,
  manualInvalid,
  predictionDate,
  language: _language,
  loading,
  deckResetDisabled,
  activeOption,
  activeRectangle,
  formattedLastUpdated,
  totalPredictions,
  onManualCodeChange,
  onDateChange,
  onSetToday,
  onLanguageChange: _onLanguageChange,
  onReload,
  onResetDeck,
  showDeckTools = true,
}) => (
  <div className="grid gap-6 md:grid-cols-2">
    <div className="space-y-3">
      <label className="font-semibold text-sm flex items-center gap-2">
        <MapPin size={16} /> <TranslatedText text="Current fishing location" />
      </label>
      {activeOption ? (
        <div className="p-4 bg-base-200 rounded-lg border border-base-300">
          <p className="font-medium text-base-content">
            {activeOption.code} — {activeOption.label}
          </p>
          <p className="text-xs text-base-content/60 mt-2">
            {activeOption.region} • {activeOption.centerLat.toFixed(2)}°N,{' '}
            {Math.abs(activeOption.centerLon).toFixed(2)}°
            {activeOption.centerLon >= 0 ? 'E' : 'W'}
          </p>
          <p className="text-xs text-info mt-2">
            <TranslatedText text="Change location using the button at the top of the page" />
          </p>
        </div>
      ) : (
        <div className="p-4 bg-base-200 rounded-lg border border-base-300">
          <p className="text-sm text-base-content/60">
            <TranslatedText text="No location selected" />
          </p>
          <p className="text-xs text-info mt-2">
            <TranslatedText text="Use the location button at the top of the page to set your fishing area" />
          </p>
        </div>
      )}
    </div>

    <div className="space-y-3">
      <label className="font-semibold text-sm"><TranslatedText text="Custom ICES area code (optional)" /></label>
      <input
        className="input input-bordered w-full uppercase tracking-widest"
        value={manualCode}
        onChange={onManualCodeChange}
        placeholder="e.g. 31E8"
        aria-label="Custom fishing area code"
      />
      {manualInvalid ? (
        <p className="text-xs text-error"><TranslatedText text="Use the standard area format (NNAN), for example 31E8." /></p>
      ) : manualNormalized ? (
        <p className="text-xs text-success"><TranslatedText text="Fishing this custom area" />: {manualNormalized}.</p>
      ) : (
        <p className="text-xs text-base-content/60"><TranslatedText text="Leave blank to use the area you picked above." /></p>
      )}
    </div>

    <div className="space-y-3">
      <label className="font-semibold text-sm"><TranslatedText text="Prediction date" /></label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={predictionDate}
          onChange={onDateChange}
          className="input input-bordered"
          aria-label="Prediction date"
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={onSetToday}>
          <TranslatedText text="Today" />
        </button>
      </div>
    </div>

    {showDeckTools && (
      <div className="space-y-3">
        <label className="font-semibold text-sm"><TranslatedText text="Prediction tools" /></label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onReload}
            disabled={!activeRectangle || loading}
          >
            <RefreshCcw size={16} />
            <span className="ml-1"><TranslatedText text="Refresh predictions" /></span>
          </button>
                    <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onResetDeck}
            disabled={deckResetDisabled}
          >
            <TranslatedText text="Reset lineup" />
          </button>
        </div>
        <p className="text-xs text-base-content/70">
          <TranslatedText text="Last checked" />: {formattedLastUpdated ? formattedLastUpdated : <TranslatedText text="Waiting on the latest cast" />}
        </p>
        <p className="text-xs text-base-content/60"><TranslatedText text="Species loaded" />: {totalPredictions}</p>
      </div>
    )}
  </div>
);

export default SettingsForm;
