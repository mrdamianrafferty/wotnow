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
  rectangleOptions: RectangleOption[];
  optionsLoading: boolean;
  optionsError: string | null;
  usingFallback: boolean;
  selectedCode: string;
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
  onSelectOption: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onManualCodeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDateChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSetToday: () => void;
  onLanguageChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onReload: () => void;
  onResetDeck: () => void;
  showDeckTools?: boolean;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({
  rectangleOptions,
  optionsLoading,
  optionsError,
  usingFallback,
  selectedCode,
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
  onSelectOption,
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
        <MapPin size={16} /> <TranslatedText text="Zone" />
      </label>
      <select
        className="select select-bordered w-full"
        value={selectedCode}
        onChange={onSelectOption}
        aria-label="Select fishing area"
        disabled={rectangleOptions.length === 0}
      >
        {rectangleOptions.length === 0 ? (
          <option value="" disabled>
            <TranslatedText text="No zones available" />
          </option>
        ) : (
          rectangleOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.code} — {option.label}
            </option>
          ))
        )}
      </select>
      {activeOption && (
        <p className="text-xs text-base-content/60">
          {activeOption.region} • {activeOption.centerLat.toFixed(2)}°N,{' '}
          {Math.abs(activeOption.centerLon).toFixed(2)}°
          {activeOption.centerLon >= 0 ? 'E' : 'W'}
        </p>
      )}
      {optionsLoading && (
        <p className="text-xs text-base-content/60 flex items-center gap-2">
          <span className="loading loading-ring loading-xs text-blue-500" aria-hidden />
          <TranslatedText text="Scouting nearby fishing areas…" />
        </p>
      )}
      {optionsError && <p className="text-xs text-error"><TranslatedText text={optionsError} /></p>}
      {!optionsLoading && !optionsError && usingFallback && (
        <p className="text-xs text-base-content/60">
          <TranslatedText text="Showing our offline area list while we reconnect." />
        </p>
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
