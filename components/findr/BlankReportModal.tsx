/**
 * BlankReportModal Component
 * 
 * Modal for logging unsuccessful fishing trips when no catches were made.
 * Captures effort, environmental conditions, and attempted strategies
 * to build a complete picture of fishing attempts for pattern analysis.
 * 
 * This is valuable data for:
 * - Understanding when fish aren't biting
 * - Environmental pattern recognition
 * - Bait/technique effectiveness analysis
 * - Location success rate tracking
 */

'use client';

import React, { useState, useCallback } from 'react';
import { 
  X, Calendar, Clock, MapPin, Target, Thermometer,
  Waves, AlertTriangle, FileText, CheckCircle 
} from 'lucide-react';
import { TranslatedText } from '../translation/TranslatedFishCard';

// Types
interface BlankReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reportData: BlankReportData) => void;
  onSubmit: (reportData: BlankReportData) => Promise<void>;
  rectangleCode?: string;
}

export interface BlankReportData {
  id?: string;
  date: string;
  time_period: TimePeriod[];
  duration_hours: number;
  habitat_type: HabitatType;
  rectangle_code: string;
  bait_attempted: string[];
  techniques_used: string[];
  weather_conditions: WeatherConditions;
  possible_reasons: string[];
  effort_notes?: string;
  will_try_again: boolean;
  logged_at: string;
}

type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';
type HabitatType = 'rocky_shore' | 'sandy_beach' | 'pier_harbor' | 'estuary' | 'shallow_water' | 'deep_water' | 'wreck_reef' | 'open_sea';

interface WeatherConditions {
  conditions: ('sunny' | 'cloudy' | 'rainy' | 'windy' | 'calm' | 'rough_seas')[];
  water_clarity: 'crystal_clear' | 'clear' | 'murky' | 'very_murky';
  tide_state: 'high' | 'rising' | 'falling' | 'low';
}

// Options data
const TIME_PERIODS = [
  { value: 'morning' as TimePeriod, label: 'Morning', hours: '5AM - 12PM' },
  { value: 'afternoon' as TimePeriod, label: 'Afternoon', hours: '12PM - 6PM' },
  { value: 'evening' as TimePeriod, label: 'Evening', hours: '6PM - 10PM' },
  { value: 'night' as TimePeriod, label: 'Night', hours: '10PM - 5AM' },
];

const HABITAT_OPTIONS = [
  { value: 'rocky_shore' as HabitatType, label: 'Rocky Shore' },
  { value: 'sandy_beach' as HabitatType, label: 'Sandy Beach' },
  { value: 'pier_harbor' as HabitatType, label: 'Pier/Harbor' },
  { value: 'estuary' as HabitatType, label: 'Estuary' },
  { value: 'shallow_water' as HabitatType, label: 'Shallow Water' },
  { value: 'deep_water' as HabitatType, label: 'Deep Water' },
  { value: 'wreck_reef' as HabitatType, label: 'Wreck/Reef' },
  { value: 'open_sea' as HabitatType, label: 'Open Sea' },
];

const COMMON_BAITS = [
  'Lugworm', 'Ragworm', 'Prawns', 'Crab', 'Feather rigs',
  'Spinners', 'Soft plastics', 'Bread', 'Mackerel strip', 'Squid'
];

const COMMON_TECHNIQUES = [
  'Bottom fishing', 'Float fishing', 'Spinning', 'Feathering', 
  'Ledgering', 'Drift fishing', 'Fly fishing', 'Jigging'
];

const WEATHER_CONDITIONS = [
  { value: 'sunny', label: 'Sunny', icon: '☀️' },
  { value: 'cloudy', label: 'Cloudy', icon: '☁️' },
  { value: 'rainy', label: 'Rainy', icon: '🌧️' },
  { value: 'windy', label: 'Windy', icon: '💨' },
  { value: 'calm', label: 'Calm', icon: '😌' },
  { value: 'rough_seas', label: 'Rough Seas', icon: '🌊' },
];

const POSSIBLE_REASONS = [
  'Wrong bait choice',
  'Poor weather conditions',
  'Wrong time of day',
  'Too much noise/disturbance',
  'Tide timing was off',
  'Water too murky',
  'Water too clear',
  'Seasonal timing',
  'Location overfished',
  'Equipment issues',
  'Just one of those days',
];

export function BlankReportModal({ isOpen, onClose, onSuccess, onSubmit, rectangleCode = '31E8' }: BlankReportModalProps) {
  // Form state
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  const [timePeriods, setTimePeriods] = useState<TimePeriod[]>(['afternoon']);
  const [durationHours, setDurationHours] = useState(2);
  const [habitat, setHabitat] = useState<HabitatType>('rocky_shore');
  const [baitsAttempted, setBaitsAttempted] = useState<string[]>(['Lugworm']);
  const [techniquesUsed, setTechniquesUsed] = useState<string[]>(['Bottom fishing']);
  
  // Weather conditions
  const [weatherConditions, setWeatherConditions] = useState<('sunny' | 'cloudy' | 'rainy' | 'windy' | 'calm' | 'rough_seas')[]>(['sunny']);
  const [waterClarity, setWaterClarity] = useState<'crystal_clear' | 'clear' | 'murky' | 'very_murky'>('clear');
  const [tideState, setTideState] = useState<'high' | 'rising' | 'falling' | 'low'>('rising');
  
  const [possibleReasons, setPossibleReasons] = useState<string[]>([]);
  const [effortNotes, setEffortNotes] = useState('');
  const [willTryAgain, setWillTryAgain] = useState(true);
  
  // UI state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Helper functions
  const toggleArrayItem = useCallback(<T,>(array: T[], item: T, setter: (newArray: T[]) => void) => {
    setter(
      array.includes(item)
        ? array.filter(i => i !== item)
        : [...array, item]
    );
  }, []);
  
  const toggleTimePeriod = useCallback((period: TimePeriod) => {
    toggleArrayItem(timePeriods, period, setTimePeriods);
  }, [timePeriods, toggleArrayItem]);
  
  const toggleBait = useCallback((bait: string) => {
    toggleArrayItem(baitsAttempted, bait, setBaitsAttempted);
  }, [baitsAttempted, toggleArrayItem]);
  
  const toggleTechnique = useCallback((technique: string) => {
    toggleArrayItem(techniquesUsed, technique, setTechniquesUsed);
  }, [techniquesUsed, toggleArrayItem]);
  
  const toggleWeatherCondition = useCallback((condition: typeof weatherConditions[number]) => {
    toggleArrayItem(weatherConditions, condition, setWeatherConditions);
  }, [weatherConditions, toggleArrayItem]);
  
  const togglePossibleReason = useCallback((reason: string) => {
    toggleArrayItem(possibleReasons, reason, setPossibleReasons);
  }, [possibleReasons, toggleArrayItem]);
  
  // Reset form
  const handleClose = useCallback(() => {
    setCurrentStep(1);
    setDate(new Date().toISOString().split('T')[0]);
    setTimePeriods(['afternoon']);
    setDurationHours(2);
    setHabitat('rocky_shore');
    setBaitsAttempted(['Lugworm']);
    setTechniquesUsed(['Bottom fishing']);
    setWeatherConditions(['sunny']);
    setWaterClarity('clear');
    setTideState('rising');
    setPossibleReasons([]);
    setEffortNotes('');
    setWillTryAgain(true);
    setIsSubmitting(false);
    setError(null);
    onClose();
  }, [onClose]);
  
  // Form validation
  const canProceedFromStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1: return date.length > 0 && timePeriods.length > 0 && durationHours > 0;
      case 2: return habitat.length > 0 && baitsAttempted.length > 0 && techniquesUsed.length > 0;
      case 3: return weatherConditions.length > 0;
      default: return false;
    }
  }, [date, timePeriods, durationHours, habitat, baitsAttempted, techniquesUsed, weatherConditions]);
  
  // Submit the blank report
  const handleSubmit = useCallback(async () => {
    if (!canProceedFromStep(3)) {
      setError('Please complete all required fields');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const reportData: BlankReportData = {
        date,
        time_period: timePeriods,
        duration_hours: durationHours,
        habitat_type: habitat,
        rectangle_code: rectangleCode,
        bait_attempted: baitsAttempted,
        techniques_used: techniquesUsed,
        weather_conditions: {
          conditions: weatherConditions,
          water_clarity: waterClarity,
          tide_state: tideState,
        },
        possible_reasons: possibleReasons,
        effort_notes: effortNotes.trim() || undefined,
        will_try_again: willTryAgain,
        logged_at: new Date().toISOString(),
      };
      
      await onSubmit(reportData);

      onSuccess(reportData);
      handleClose();
      
    } catch (err) {
      console.error('[BlankReportModal] Failed to submit blank report:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit report');
      setIsSubmitting(false);
    }
  }, [
    date, timePeriods, durationHours, habitat, rectangleCode, baitsAttempted,
    techniquesUsed, weatherConditions, waterClarity, tideState, possibleReasons,
    effortNotes, willTryAgain, onSubmit, onSuccess, handleClose, canProceedFromStep
  ]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={handleClose} />
      
      {/* Modal */}
      <div className="relative bg-base-100 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2 text-warning">
            <AlertTriangle className="w-5 h-5" />
            <TranslatedText text="Blank Report" />
          </h3>
          <button 
            onClick={handleClose} 
            className="btn btn-sm btn-circle btn-ghost"
            disabled={isSubmitting}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Subtitle */}
        <p className="text-sm text-base-content/70 mb-4">
          <TranslatedText text="Log your fishing effort even when you didn't catch anything - this data is valuable for pattern analysis!" />
        </p>
        
        {/* Progress Steps */}
        <ul className="steps steps-horizontal w-full mb-6 text-xs">
          <li className={`step ${currentStep >= 1 ? 'step-warning' : ''}`}>
            <TranslatedText text="Trip Details" />
          </li>
          <li className={`step ${currentStep >= 2 ? 'step-warning' : ''}`}>
            <TranslatedText text="Methods" />
          </li>
          <li className={`step ${currentStep >= 3 ? 'step-warning' : ''}`}>
            <TranslatedText text="Analysis" />
          </li>
        </ul>
        
        {/* Error Display */}
        {error && (
          <div className="alert alert-error mb-4">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        {/* Step 1: Trip Details */}
        {currentStep === 1 && (
          <div className="space-y-4">
            
            {/* Date */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  <TranslatedText text="Date" />
                </span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input input-bordered"
                max={new Date().toISOString().split('T')[0]}
                disabled={isSubmitting}
              />
            </div>
            
            {/* Time Periods */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  <Clock className="w-4 h-4 inline mr-2" />
                  <TranslatedText text="Time periods" />
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TIME_PERIODS.map(period => (
                  <button
                    key={period.value}
                    onClick={() => toggleTimePeriod(period.value)}
                    className={`btn btn-sm h-auto p-3 ${
                      timePeriods.includes(period.value) ? 'btn-warning' : 'btn-outline'
                    }`}
                    disabled={isSubmitting}
                  >
                    <div className="text-center">
                      <div className="font-medium text-sm">{period.label}</div>
                      <div className="text-xs opacity-70">{period.hours}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Duration */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  <Clock className="w-4 h-4 inline mr-2" />
                  <TranslatedText text="Duration (hours)" />
                </span>
              </label>
              <input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={durationHours}
                onChange={(e) => setDurationHours(parseFloat(e.target.value) || 0)}
                className="input input-bordered"
                disabled={isSubmitting}
              />
            </div>
            
            {/* Location Context */}
            <div className="bg-base-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium">ICES Rectangle:</span>
                <span className="font-mono">{rectangleCode}</span>
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex justify-end">
              <button
                onClick={() => setCurrentStep(2)}
                className="btn btn-warning"
                disabled={!canProceedFromStep(1) || isSubmitting}
              >
                <TranslatedText text="Next" /> →
              </button>
            </div>
          </div>
        )}
        
        {/* Step 2: Methods Used */}
        {currentStep === 2 && (
          <div className="space-y-4">
            
            {/* Habitat */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  <Target className="w-4 h-4 inline mr-2" />
                  <TranslatedText text="Habitat type" />
                </span>
              </label>
              <select
                value={habitat}
                onChange={(e) => setHabitat(e.target.value as HabitatType)}
                className="select select-bordered"
                disabled={isSubmitting}
              >
                {HABITAT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Baits Attempted */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  <TranslatedText text="Baits attempted" />
                  <span className="text-xs opacity-60 ml-1">
                    (<TranslatedText text="select all used" />)
                  </span>
                </span>
              </label>
              <div className="grid grid-cols-2 gap-1">
                {COMMON_BAITS.map(bait => (
                  <button
                    key={bait}
                    onClick={() => toggleBait(bait)}
                    className={`btn btn-xs ${
                      baitsAttempted.includes(bait) ? 'btn-warning' : 'btn-outline'
                    }`}
                    disabled={isSubmitting}
                  >
                    {bait}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Techniques Used */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  <TranslatedText text="Techniques used" />
                  <span className="text-xs opacity-60 ml-1">
                    (<TranslatedText text="select all tried" />)
                  </span>
                </span>
              </label>
              <div className="grid grid-cols-2 gap-1">
                {COMMON_TECHNIQUES.map(technique => (
                  <button
                    key={technique}
                    onClick={() => toggleTechnique(technique)}
                    className={`btn btn-xs ${
                      techniquesUsed.includes(technique) ? 'btn-warning' : 'btn-outline'
                    }`}
                    disabled={isSubmitting}
                  >
                    {technique}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="btn btn-ghost"
                disabled={isSubmitting}
              >
                ← <TranslatedText text="Back" />
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="btn btn-warning"
                disabled={!canProceedFromStep(2) || isSubmitting}
              >
                <TranslatedText text="Next" /> →
              </button>
            </div>
          </div>
        )}
        
        {/* Step 3: Conditions & Analysis */}
        {currentStep === 3 && (
          <div className="space-y-4">
            
            {/* Weather Conditions */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  <Thermometer className="w-4 h-4 inline mr-2" />
                  <TranslatedText text="Weather conditions" />
                </span>
              </label>
              <div className="grid grid-cols-3 gap-1">
                {WEATHER_CONDITIONS.map(condition => (
                  <button
                    key={condition.value}
                    onClick={() => toggleWeatherCondition(condition.value as typeof weatherConditions[number])}
                    className={`btn btn-xs h-auto p-2 ${
                      weatherConditions.includes(condition.value as typeof weatherConditions[number]) ? 'btn-warning' : 'btn-outline'
                    }`}
                    disabled={isSubmitting}
                  >
                    <div className="text-center">
                      <div className="text-lg">{condition.icon}</div>
                      <div className="text-xs">{condition.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Water Conditions */}
            <div className="grid grid-cols-2 gap-2">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-sm">
                    <TranslatedText text="Water clarity" />
                  </span>
                </label>
                <select
                  value={waterClarity}
                  onChange={(e) => setWaterClarity(e.target.value as typeof waterClarity)}
                  className="select select-sm select-bordered"
                  disabled={isSubmitting}
                >
                  <option value="crystal_clear">Crystal Clear</option>
                  <option value="clear">Clear</option>
                  <option value="murky">Murky</option>
                  <option value="very_murky">Very Murky</option>
                </select>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-sm">
                    <Waves className="w-4 h-4 inline mr-1" />
                    <TranslatedText text="Tide state" />
                  </span>
                </label>
                <select
                  value={tideState}
                  onChange={(e) => setTideState(e.target.value as typeof tideState)}
                  className="select select-sm select-bordered"
                  disabled={isSubmitting}
                >
                  <option value="high">High</option>
                  <option value="rising">Rising</option>
                  <option value="falling">Falling</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            
            {/* Possible Reasons */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  <TranslatedText text="Why do you think you didn't catch anything?" />
                  <span className="text-xs opacity-60 ml-1">
                    (<TranslatedText text="optional, select all that apply" />)
                  </span>
                </span>
              </label>
              <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                {POSSIBLE_REASONS.map(reason => (
                  <button
                    key={reason}
                    onClick={() => togglePossibleReason(reason)}
                    className={`btn btn-xs justify-start ${
                      possibleReasons.includes(reason) ? 'btn-warning' : 'btn-outline'
                    }`}
                    disabled={isSubmitting}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Notes */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  <FileText className="w-4 h-4 inline mr-2" />
                  <TranslatedText text="Additional notes" />
                  <span className="text-xs opacity-60 ml-1">
                    (<TranslatedText text="optional" />)
                  </span>
                </span>
              </label>
              <textarea
                value={effortNotes}
                onChange={(e) => setEffortNotes(e.target.value)}
                placeholder="Any other observations, lessons learned, or plans for next time..."
                className="textarea textarea-bordered resize-none"
                rows={3}
                disabled={isSubmitting}
              />
            </div>
            
            {/* Will Try Again */}
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text font-medium">
                  <TranslatedText text="Will you try this spot again?" />
                </span>
                <input
                  type="checkbox"
                  checked={willTryAgain}
                  onChange={(e) => setWillTryAgain(e.target.checked)}
                  className="checkbox checkbox-warning"
                  disabled={isSubmitting}
                />
              </label>
            </div>
            
            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="btn btn-ghost"
                disabled={isSubmitting}
              >
                ← <TranslatedText text="Back" />
              </button>
              <button
                onClick={handleSubmit}
                className="btn btn-warning"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    <TranslatedText text="Saving..." />
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <TranslatedText text="Save Report" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
