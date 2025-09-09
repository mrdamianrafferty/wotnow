// debug-surf-loop-fix.js
// Script to diagnose and test SurfDayGrade hourly data and identify loop issues
import { gradeDay, gradeHour } from './utils/surfScoring.ts';

// Test 1: All hours with identical data (worst case scenario for debugging)
const sameDataForAllHours = {
  beachFacingDeg: 180, // Facing south
  skill: "novice", // Set to novice to test beginner-friendly small waves
  tideProfile: {
    minM: 0.5,
    maxM: 3.0
  },
  hours: Array(24).fill(null).map((_, i) => ({
    ts: `2025-09-07T${String(i).padStart(2, '0')}:00:00Z`,
    wind: { speedKt: 15, directionDeg: 180 }, // Onshore wind
    primary: { heightM: 0.5, periodS: 8, directionDeg: 180 }, // Small waves (beginner friendly)
    tide: { tideHeightM: 1.5, tideRangeM: 2.5 }
  }))
};

// Test 2: Normal varied data with small waves (should be beginner-friendly for novices)
const smallWavesData = {
  beachFacingDeg: 180,
  skill: "novice",
  tideProfile: {
    minM: 0.5,
    maxM: 3.0
  },
  hours: [
    {
      ts: "2025-09-07T08:00:00Z",
      wind: { speedKt: 5, directionDeg: 0 }, // Offshore wind
      primary: { heightM: 0.5, periodS: 8, directionDeg: 180 }, // Small waves
      tide: { tideHeightM: 1.5, tideRangeM: 2.5 }
    },
    {
      ts: "2025-09-07T09:00:00Z",
      wind: { speedKt: 8, directionDeg: 90 }, // Cross-shore wind
      primary: { heightM: 0.6, periodS: 8, directionDeg: 180 }, // Small waves
      tide: { tideHeightM: 1.8, tideRangeM: 2.5 }
    },
    {
      ts: "2025-09-07T10:00:00Z",
      wind: { speedKt: 10, directionDeg: 180 }, // Onshore wind
      primary: { heightM: 0.7, periodS: 8, directionDeg: 180 }, // Small waves
      tide: { tideHeightM: 2.0, tideRangeM: 2.5 }
    }
  ]
};

// Test different skill levels with the same wave data
console.log("\n---- TEST WITH IDENTICAL DATA FOR ALL HOURS ----");
console.log("Novice Skill Level:");
const noviceResult = gradeDay({ ...sameDataForAllHours, skill: "novice" });
console.log(`- Overall day grade: ${noviceResult.dayLight}`);
console.log("- Hour grades:");
noviceResult.hours.slice(0, 3).forEach(hour => { // Show just first 3 to keep output readable
  console.log(`  ${new Date(hour.ts).toLocaleTimeString()}: ${hour.light} (score: ${hour.score})`);
});

console.log("\nIntermediate Skill Level:");
const intermediateResult = gradeDay({ ...sameDataForAllHours, skill: "intermediate" });
console.log(`- Overall day grade: ${intermediateResult.dayLight}`);
console.log("- Hour grades:");
intermediateResult.hours.slice(0, 3).forEach(hour => {
  console.log(`  ${new Date(hour.ts).toLocaleTimeString()}: ${hour.light} (score: ${hour.score})`);
});

// Test the small waves data with different skill levels
console.log("\n---- TEST WITH SMALL WAVES DATA ----");
console.log("Novice Skill Level:");
const noviceSmallWavesResult = gradeDay({ ...smallWavesData, skill: "novice" });
console.log(`- Overall day grade: ${noviceSmallWavesResult.dayLight}`);
console.log("- Hour grades:");
noviceSmallWavesResult.hours.forEach(hour => {
  console.log(`  ${new Date(hour.ts).toLocaleTimeString()}: ${hour.light} (score: ${hour.score})`);
  console.log(`    Wave height: ${smallWavesData.hours.find(h => h.ts === hour.ts)?.primary.heightM}m`);
  console.log(`    Safety assessment: ${hour.unsafe ? 'Unsafe' : 'Safe'}`);
  console.log(`    Reasons: ${hour.reasons.slice(0, 2).join(', ')}`);
});

console.log("\nIntermediate Skill Level:");
const intermediateSmallWavesResult = gradeDay({ ...smallWavesData, skill: "intermediate" });
console.log(`- Overall day grade: ${intermediateSmallWavesResult.dayLight}`);
console.log("- Hour grades:");
intermediateSmallWavesResult.hours.forEach(hour => {
  console.log(`  ${new Date(hour.ts).toLocaleTimeString()}: ${hour.light} (score: ${hour.score})`);
});

// Check for beginner-friendly assessment with small waves
console.log("\n---- BEGINNER-FRIENDLY WAVE ASSESSMENT ----");
const smallWave = { heightM: 0.5, periodS: 8, directionDeg: 180 };
const mediumWave = { heightM: 1.2, periodS: 10, directionDeg: 180 };
const bigWave = { heightM: 2.0, periodS: 12, directionDeg: 180 };

const testHour = {
  ts: "2025-09-07T12:00:00Z",
  wind: { speedKt: 15, directionDeg: 180 },
  tide: { tideHeightM: 1.5, tideRangeM: 2.5 }
};

console.log("Small Wave (0.5m):");
const smallWaveNovice = gradeHour({ ...testHour, primary: smallWave }, 180, { minM: 0.5, maxM: 3.0 }, "novice");
console.log(`- Novice grade: ${smallWaveNovice.light} (score: ${smallWaveNovice.score})`);
const smallWaveIntermediate = gradeHour({ ...testHour, primary: smallWave }, 180, { minM: 0.5, maxM: 3.0 }, "intermediate");
console.log(`- Intermediate grade: ${smallWaveIntermediate.light} (score: ${smallWaveIntermediate.score})`);

console.log("\nMedium Wave (1.2m):");
const mediumWaveNovice = gradeHour({ ...testHour, primary: mediumWave }, 180, { minM: 0.5, maxM: 3.0 }, "novice");
console.log(`- Novice grade: ${mediumWaveNovice.light} (score: ${mediumWaveNovice.score})`);
const mediumWaveIntermediate = gradeHour({ ...testHour, primary: mediumWave }, 180, { minM: 0.5, maxM: 3.0 }, "intermediate");
console.log(`- Intermediate grade: ${mediumWaveIntermediate.light} (score: ${mediumWaveIntermediate.score})`);

console.log("\nBig Wave (2.0m):");
const bigWaveNovice = gradeHour({ ...testHour, primary: bigWave }, 180, { minM: 0.5, maxM: 3.0 }, "novice");
console.log(`- Novice grade: ${bigWaveNovice.light} (score: ${bigWaveNovice.score})`);
const bigWaveIntermediate = gradeHour({ ...testHour, primary: bigWave }, 180, { minM: 0.5, maxM: 3.0 }, "intermediate");
console.log(`- Intermediate grade: ${bigWaveIntermediate.light} (score: ${bigWaveIntermediate.score})`);

// Summary of findings
console.log("\n---- FINDINGS ----");
console.log("1. Each hour is individually graded by the gradeHour function");
console.log("2. Small waves (0.3-1.0m) might be graded as 'red' (poor) but are considered beginner-friendly for novices");
console.log("3. If all hours have identical input data, they will naturally get identical grades");
console.log("4. The 'best hour' selection will be arbitrary if all hours have identical scores");
