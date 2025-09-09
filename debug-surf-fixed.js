// Debug script to analyze surf grading (CommonJS version)
const { gradeDay, gradeHour } = require('./utils/surfScoring');

// Sample marine data to test with
const sampleData = {
  beachFacingDeg: 180, // Facing south
  tideProfile: {
    minM: 0.5,
    maxM: 3.0
  },
  hours: [
    {
      ts: "2025-09-07T08:00:00Z",
      wind: { speedKt: 5, directionDeg: 0 }, // North wind (offshore for south-facing beach)
      primary: { heightM: 1.2, periodS: 10, directionDeg: 180 }, // From south
      tide: { tideHeightM: 1.5, tideRangeM: 2.5 }
    },
    {
      ts: "2025-09-07T09:00:00Z",
      wind: { speedKt: 10, directionDeg: 90 }, // East wind (cross-shore)
      primary: { heightM: 1.3, periodS: 9, directionDeg: 180 },
      tide: { tideHeightM: 1.8, tideRangeM: 2.5 }
    },
    {
      ts: "2025-09-07T10:00:00Z",
      wind: { speedKt: 15, directionDeg: 180 }, // South wind (onshore)
      primary: { heightM: 1.4, periodS: 8, directionDeg: 180 },
      tide: { tideHeightM: 2.0, tideRangeM: 2.5 }
    },
    {
      ts: "2025-09-07T11:00:00Z",
      wind: { speedKt: 20, directionDeg: 180 }, // Stronger south wind (onshore)
      primary: { heightM: 1.5, periodS: 7, directionDeg: 180 },
      tide: { tideHeightM: 2.2, tideRangeM: 2.5 }
    },
    {
      ts: "2025-09-07T12:00:00Z",
      wind: { speedKt: 8, directionDeg: 270 }, // West wind (cross-shore)
      primary: { heightM: 1.2, periodS: 8, directionDeg: 170 },
      tide: { tideHeightM: 2.5, tideRangeM: 2.5 }
    }
  ]
};

console.log("Testing surf grading with sample data:");
const dayResult = gradeDay(sampleData);

console.log("\nOverall day grade:", dayResult.dayLight);
console.log("\nBest hour:", dayResult.bestHour ? {
  time: new Date(dayResult.bestHour.ts).toLocaleTimeString(),
  score: dayResult.bestHour.score,
  light: dayResult.bestHour.light
} : "None");

console.log("\nAll hour grades:");
dayResult.hours.forEach(hour => {
  console.log(`- ${new Date(hour.ts).toLocaleTimeString()}: ${hour.light} (score: ${hour.score})`);
});

// Test if each hour gets its own individual grade
console.log("\nDetailed hour analysis:");
sampleData.hours.forEach(hourData => {
  const grade = gradeHour(hourData, sampleData.beachFacingDeg, sampleData.tideProfile);
  console.log(`\n${new Date(hourData.ts).toLocaleTimeString()}`);
  console.log(`- Grade: ${grade.light} (score: ${grade.score})`);
  console.log(`- Wind: ${hourData.wind.speedKt}kt from ${hourData.wind.directionDeg}°`);
  console.log(`- Wave: ${hourData.primary.heightM}m at ${hourData.primary.periodS}s from ${hourData.primary.directionDeg}°`);
  console.log(`- Reasons: ${grade.reasons.join(', ')}`);
});

console.log("\nComponent breakdown for each hour:");
sampleData.hours.forEach(hourData => {
  const grade = gradeHour(hourData, sampleData.beachFacingDeg, sampleData.tideProfile);
  console.log(`\n${new Date(hourData.ts).toLocaleTimeString()}`);
  console.log(`- Components:`, grade.components);
});

// Test with real-world variation to verify different hours get different grades
console.log("\n\nTESTING WITH SIGNIFICANT VARIATION:");
const variedData = {
  ...sampleData,
  hours: [
    {
      ts: "2025-09-07T08:00:00Z",
      wind: { speedKt: 5, directionDeg: 0 }, // Offshore - should be good
      primary: { heightM: 1.2, periodS: 10, directionDeg: 180 },
      tide: { tideHeightM: 1.5, tideRangeM: 2.5 }
    },
    {
      ts: "2025-09-07T09:00:00Z",
      wind: { speedKt: 18, directionDeg: 180 }, // Onshore - should be poor
      primary: { heightM: 1.3, periodS: 9, directionDeg: 180 },
      tide: { tideHeightM: 1.8, tideRangeM: 2.5 }
    },
    {
      ts: "2025-09-07T10:00:00Z",
      wind: { speedKt: 10, directionDeg: 90 }, // Cross-shore - should be fair
      primary: { heightM: 1.4, periodS: 8, directionDeg: 180 },
      tide: { tideHeightM: 2.0, tideRangeM: 2.5 }
    }
  ]
};

const variedResult = gradeDay(variedData);
console.log("\nVaried Data - Hour Grades:");
variedResult.hours.forEach(hour => {
  console.log(`- ${new Date(hour.ts).toLocaleTimeString()}: ${hour.light} (score: ${hour.score})`);
});
