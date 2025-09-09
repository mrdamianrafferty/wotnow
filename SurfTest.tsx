// Test script to verify SurfDayGrade for novice-friendly small waves
import React from 'react';
import SurfDayGrade from './components/weather-cards/SurfDayGrade';
import { DayMarine, Skill } from './utils/surfScoring';

// Mock data with small waves (beginner-friendly)
const smallWavesData: DayMarine = {
  beachFacingDeg: 180, // South-facing
  skill: "novice" as Skill,
  tideProfile: {
    minM: 0.5,
    maxM: 3.0,
    name: 'Test Beach'
  },
  hours: Array(24).fill(null).map((_, i) => ({
    ts: `2025-09-07T${String(i).padStart(2, '0')}:00:00Z`,
    wind: { speedKt: 10, directionDeg: 180 }, // Onshore wind
    primary: { heightM: 0.6, periodS: 8, directionDeg: 180 }, // Small waves (beginner friendly)
    tide: { tideHeightM: 1.5, tideRangeM: 2.5 }
  }))
};

// Render the component with the test data
const SurfTest = () => {
  return (
    <div>
      <h1>SurfDayGrade Test</h1>
      <SurfDayGrade data={smallWavesData} locationId="test-beach" />
    </div>
  );
};

export default SurfTest;
