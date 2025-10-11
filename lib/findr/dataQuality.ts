import type { CatchLogRequest } from '@/types/findr-enrichment';

export interface DataQualityFactors {
  hasPhoto: boolean;
  hasGPS: boolean;
  hasUserLocation: boolean;
  hasDepth: boolean;
  hasSubstrate: boolean;
  hasNotes: boolean;
  hasEnvironmentalData: boolean;
  entryType?: CatchLogRequest['entry_type'];
}

export interface CatchPointFactors {
  hasPhoto: boolean;
  hasGPS: boolean;
  hasUserLocation: boolean;
  entryType: CatchLogRequest['entry_type'];
  dataQualityScore: number;
}

const BASELINE_SCORE = 5;
const PHOTO_WEIGHT = 30;
const GPS_WEIGHT = 32;
const USER_LOCATION_WEIGHT = 18;
const ENVIRONMENT_WEIGHT = 8;
const DEPTH_WEIGHT = 6;
const SUBSTRATE_WEIGHT = 5;
const NOTES_WEIGHT = 6;
const DETAILED_BONUS = 7;
const NO_LOCATION_CAP = 45;
const NO_PHOTO_CAP = 75;

export function calculateDataQualityScore(factors: DataQualityFactors): number {
  let score = BASELINE_SCORE;

  if (factors.hasPhoto) {
    score += PHOTO_WEIGHT;
  }

  if (factors.hasGPS) {
    score += GPS_WEIGHT;
  } else if (factors.hasUserLocation) {
    score += USER_LOCATION_WEIGHT;
  }

  if (factors.hasEnvironmentalData) {
    score += ENVIRONMENT_WEIGHT;
  }

  if (factors.hasDepth) {
    score += DEPTH_WEIGHT;
  }

  if (factors.hasSubstrate) {
    score += SUBSTRATE_WEIGHT;
  }

  if (factors.hasNotes) {
    score += NOTES_WEIGHT;
  }

  if (factors.entryType === 'detailed') {
    score += DETAILED_BONUS;
  }

  const maxWithoutPhoto = factors.hasPhoto ? 100 : NO_PHOTO_CAP;
  let cappedScore = Math.min(score, maxWithoutPhoto);

  if (!factors.hasGPS && !factors.hasUserLocation) {
    cappedScore = Math.min(cappedScore, NO_LOCATION_CAP);
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(cappedScore)));
  return finalScore;
}

export function calculateCatchPoints(factors: CatchPointFactors): number {
  let points = 10;

  if (factors.hasPhoto) {
    points += 15;
  }

  if (factors.hasGPS) {
    points += 12;
  } else if (factors.hasUserLocation) {
    points += 6;
  }

  if (factors.entryType === 'detailed') {
    points += 7;
  } else if (factors.entryType === 'historical') {
    points += 3;
  }

  if (factors.dataQualityScore >= 80) {
    points += 15;
  } else if (factors.dataQualityScore >= 65) {
    points += 10;
  } else if (factors.dataQualityScore >= 50) {
    points += 5;
  }

  return points;
}
