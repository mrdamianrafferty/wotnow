// Debug surf grading with realistic data patterns
// Run with: npx ts-node --skipProject debug-surf-fixed.js

try {
  const { gradeDay, gradeHour } = require('./utils/surfScoring');
  
  // Create a more realistic data set where conditions change gradually throughout the day
  const realisticData = {
    beachFacingDeg: 180, // South-facing beach
    tideProfile: {
      minM: 0.5,
      maxM: 3.0
    },
    hours: []
  };
  
  // Generate 24 hours of data with realistic patterns
  // Starting from 6am
  const baseDate = new Date("2025-09-07T06:00:00Z");
  
  // Wind often increases during the day and shifts direction
  // Waves often have small changes throughout the day
  for (let i = 0; i < 24; i++) {
    const hourDate = new Date(baseDate);
    hourDate.setHours(hourDate.getHours() + i);
    
    // Wind increases during day, peaks in afternoon, then drops
    let windSpeed = 5;
    if (i < 6) { // Morning: light winds
      windSpeed = 5 + i * 0.5;
    } else if (i < 12) { // Midday: increasing winds
      windSpeed = 8 + (i - 6) * 1.5;
    } else if (i < 18) { // Afternoon: peak winds
      windSpeed = 17 - (i - 12) * 0.8;
    } else { // Evening: dropping winds
      windSpeed = 12 - (i - 18) * 1;
    }
    
    // Wind direction often shifts during the day
    // Start with offshore morning winds, shifting to onshore in afternoon
    let windDirection = 0; // North wind (offshore) in morning
    if (i < 8) {
      windDirection = 0; // North wind (offshore)
    } else if (i < 12) {
      // Gradually shift to easterly
      windDirection = 0 + (i - 8) * (90 / 4); // Shift from N to E
    } else if (i < 18) {
      // Gradually shift to southerly
      windDirection = 90 + (i - 12) * (90 / 6); // Shift from E to S
    } else {
      // Hold at southerly
      windDirection = 180;
    }
    
    // Wave height often fluctuates slightly with tide
    const waveHeight = 1.2 + Math.sin(i * Math.PI / 6) * 0.3;
    
    // Wave period often changes more slowly
    const wavePeriod = 8 + Math.sin(i * Math.PI / 12) * 2;
    
    // Tide cycles
    const tideHeight = 1.5 + Math.sin(i * Math.PI / 6) * 1.2;
    
    realisticData.hours.push({
      ts: hourDate.toISOString(),
      wind: { 
        speedKt: Math.round(windSpeed * 10) / 10, 
        directionDeg: Math.round(windDirection) 
      },
      primary: { 
        heightM: Math.round(waveHeight * 10) / 10, 
        periodS: Math.round(wavePeriod * 10) / 10, 
        directionDeg: 180 // Consistent swell direction
      },
      tide: { 
        tideHeightM: Math.round(tideHeight * 10) / 10, 
        tideRangeM: 2.5 
      }
    });
  }

  console.log("TESTING SURF GRADING WITH REALISTIC DATA PATTERNS:");
  const result = gradeDay(realisticData);

  console.log("\nOverall day grade:", result.dayLight);
  console.log("\nBest hour:", result.bestHour ? {
    time: new Date(result.bestHour.ts).toLocaleTimeString(),
    score: result.bestHour.score,
    light: result.bestHour.light
  } : "None");

  console.log("\nHour-by-hour grades:");
  const uniqueLights = [...new Set(result.hours.map(h => h.light))];
  console.log("Unique grade types:", uniqueLights);
  console.log("Has mixed grades:", uniqueLights.length > 1);
  
  result.hours.forEach(hour => {
    const hourData = realisticData.hours.find(h => h.ts === hour.ts);
    const hourTime = new Date(hour.ts);
    
    console.log(`\n${hourTime.toLocaleTimeString()}: ${hour.light.toUpperCase()} (score: ${hour.score})`);
    if (hourData) {
      console.log(`- Wind: ${hourData.wind.speedKt}kt from ${hourData.wind.directionDeg}°`);
      console.log(`- Wave: ${hourData.primary.heightM}m at ${hourData.primary.periodS}s`);
      console.log(`- Tide: ${hourData.tide.tideHeightM}m`);
    }
  });

  // Analyze what factors cause grade changes
  console.log("\n\nANALYZING GRADE TRANSITIONS:");
  
  let prevGrade = null;
  result.hours.forEach((hour, index) => {
    if (index === 0) {
      prevGrade = hour.light;
      return;
    }
    
    if (hour.light !== prevGrade) {
      const prevHour = result.hours[index - 1];
      const hourTime = new Date(hour.ts);
      const prevTime = new Date(prevHour.ts);
      
      console.log(`\nGrade changed from ${prevGrade.toUpperCase()} to ${hour.light.toUpperCase()} between ${prevTime.toLocaleTimeString()} and ${hourTime.toLocaleTimeString()}`);
      console.log(`- Previous score: ${prevHour.score}, New score: ${hour.score}`);
      
      const prevHourData = realisticData.hours.find(h => h.ts === prevHour.ts);
      const currHourData = realisticData.hours.find(h => h.ts === hour.ts);
      
      if (prevHourData && currHourData) {
        console.log("Changes in conditions:");
        console.log(`- Wind: ${prevHourData.wind.speedKt}kt → ${currHourData.wind.speedKt}kt`);
        console.log(`- Wind direction: ${prevHourData.wind.directionDeg}° → ${currHourData.wind.directionDeg}°`);
        console.log(`- Wave height: ${prevHourData.primary.heightM}m → ${currHourData.primary.heightM}m`);
        console.log(`- Wave period: ${prevHourData.primary.periodS}s → ${currHourData.primary.periodS}s`);
        console.log(`- Tide height: ${prevHourData.tide.tideHeightM}m → ${currHourData.tide.tideHeightM}m`);
      }
      
      prevGrade = hour.light;
    }
  });
  
  // Check the thresholds for grade changes
  console.log("\n\nGRADE THRESHOLD ANALYSIS:");
  
  // Sort hours by score to find the threshold boundaries
  const sortedHours = [...result.hours].sort((a, b) => a.score - b.score);
  
  let foundGreenAmberBoundary = false;
  let foundAmberRedBoundary = false;
  
  for (let i = 1; i < sortedHours.length; i++) {
    const prevHour = sortedHours[i - 1];
    const currHour = sortedHours[i];
    
    if (!foundAmberRedBoundary && prevHour.light === "red" && currHour.light === "amber") {
      console.log(`Red → Amber boundary at score: ${prevHour.score} to ${currHour.score}`);
      foundAmberRedBoundary = true;
    }
    
    if (!foundGreenAmberBoundary && prevHour.light === "amber" && currHour.light === "green") {
      console.log(`Amber → Green boundary at score: ${prevHour.score} to ${currHour.score}`);
      foundGreenAmberBoundary = true;
    }
  }
  
} catch (error) {
  console.error("Error running the debug script:", error.message);
}
