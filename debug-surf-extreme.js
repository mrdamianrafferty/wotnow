// In-depth debug script to test surf grading with extreme variations
// Run with: npx ts-node --skipProject debug-surf-extreme.js

// First, let's check if the surfScoring module is available
try {
  // Import the surfScoring module using a dynamic require
  const { gradeDay, gradeHour } = require('./utils/surfScoring');
  
  // Sample data with extreme variations between hours
  const extremeData = {
    beachFacingDeg: 180, // Facing south
    tideProfile: {
      minM: 0.5,
      maxM: 3.0
    },
    hours: [
      // Great conditions - light offshore wind, good wave height and period
      {
        ts: "2025-09-07T08:00:00Z",
        wind: { speedKt: 5, directionDeg: 0 }, // North wind (offshore for south-facing beach)
        primary: { heightM: 1.2, periodS: 12, directionDeg: 180 }, // From south, good period
        tide: { tideHeightM: 1.5, tideRangeM: 2.5 }
      },
      // Poor conditions - strong onshore wind
      {
        ts: "2025-09-07T09:00:00Z",
        wind: { speedKt: 25, directionDeg: 180 }, // Strong south wind (onshore)
        primary: { heightM: 1.3, periodS: 9, directionDeg: 180 },
        tide: { tideHeightM: 1.8, tideRangeM: 2.5 }
      },
      // Fair conditions - cross-shore wind
      {
        ts: "2025-09-07T10:00:00Z",
        wind: { speedKt: 10, directionDeg: 90 }, // East wind (cross-shore)
        primary: { heightM: 1.4, periodS: 8, directionDeg: 180 },
        tide: { tideHeightM: 2.0, tideRangeM: 2.5 }
      },
      // Dangerous conditions - very large waves
      {
        ts: "2025-09-07T11:00:00Z",
        wind: { speedKt: 10, directionDeg: 0 }, // Offshore
        primary: { heightM: 3.5, periodS: 15, directionDeg: 180 }, // Very large, long period
        tide: { tideHeightM: 1.5, tideRangeM: 2.5 }
      },
      // Mediocre conditions - small waves
      {
        ts: "2025-09-07T12:00:00Z",
        wind: { speedKt: 8, directionDeg: 270 }, // West wind (cross-shore)
        primary: { heightM: 0.5, periodS: 6, directionDeg: 170 }, // Small waves, short period
        tide: { tideHeightM: 2.5, tideRangeM: 2.5 }
      }
    ]
  };

  console.log("TESTING SURF GRADING WITH EXTREME VARIATIONS:");
  const extremeResult = gradeDay(extremeData);

  console.log("\nOverall day grade:", extremeResult.dayLight);
  console.log("\nBest hour:", extremeResult.bestHour ? {
    time: new Date(extremeResult.bestHour.ts).toLocaleTimeString(),
    score: extremeResult.bestHour.score,
    light: extremeResult.bestHour.light
  } : "None");

  console.log("\nHour-by-hour grades:");
  extremeResult.hours.forEach(hour => {
    const hourData = extremeData.hours.find(h => h.ts === hour.ts);
    console.log(`\n${new Date(hour.ts).toLocaleTimeString()}: ${hour.light.toUpperCase()} (score: ${hour.score})`);
    if (hourData) {
      console.log(`- Wind: ${hourData.wind.speedKt}kt from ${hourData.wind.directionDeg}° (${hourData.wind.directionDeg === 0 ? 'offshore' : hourData.wind.directionDeg === 180 ? 'onshore' : 'cross-shore'})`);
      console.log(`- Wave: ${hourData.primary.heightM}m at ${hourData.primary.periodS}s`);
    }
    console.log(`- Reasons: ${hour.reasons.slice(0, 2).join(', ')}`);
  });

  // Now test direct gradeHour calls to verify independent hour grading
  console.log("\n\nDIRECT HOUR GRADING VERIFICATION:");
  extremeData.hours.forEach(hourData => {
    const grade = gradeHour(hourData, extremeData.beachFacingDeg, extremeData.tideProfile);
    console.log(`\n${new Date(hourData.ts).toLocaleTimeString()}`);
    console.log(`- Grade: ${grade.light.toUpperCase()} (score: ${grade.score})`);
    console.log(`- Wind: ${hourData.wind.speedKt}kt from ${hourData.wind.directionDeg}°`);
    console.log(`- Wave: ${hourData.primary.heightM}m at ${hourData.primary.periodS}s`);
    console.log(`- Components:`, grade.components);
  });
  
} catch (error) {
  console.error("Error running the debug script:", error.message);
}
