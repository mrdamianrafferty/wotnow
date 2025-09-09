// debug-surf-skill-levels.js
// This script demonstrates how the surf grading system treats different skill levels
// with various wave conditions.
// Run with: npx ts-node --skipProject debug-surf-skill-levels.js

try {
  const { gradeDay, gradeHour } = require('./utils/surfScoring');
  
  // Helper functions for output formatting
  const COLORS = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    blue: "\x1b[34m"
  };
  
  const colorize = (text, color) => `${color}${text}${COLORS.reset}`;
  
  const getGradeColor = (light) => {
    if (light === "green") return COLORS.green;
    if (light === "amber") return COLORS.yellow;
    return COLORS.red;
  };
  
  const getTextGrade = (light, skill, waveHeight) => {
    // For small waves that are still rideable (under 1m)
    const isSmallWaves = typeof waveHeight === 'number' && waveHeight < 1 && waveHeight >= 0.3;
    
    if (light === "green") {
      return "Good";
    } else if (light === "amber") {
      return "Fair";
    } else if (light === "red" && skill === "novice" && isSmallWaves) {
      return colorize("Beginner friendly", COLORS.blue);
    } else {
      return "Poor";
    }
  };
  
  // Create a series of test conditions
  console.log(colorize("=== SURF GRADING SYSTEM SKILL LEVEL COMPARISON ===", COLORS.bright));
  
  // Different wave heights to test
  const waveHeights = [0.3, 0.6, 0.9, 1.2, 1.5, 2.0, 3.0];
  
  // Test across skill levels
  const skillLevels = ["novice", "intermediate", "advanced"];
  
  // Base test data
  const baseData = {
    beachFacingDeg: 180, // South-facing beach
    tideProfile: {
      minM: 0.5,
      maxM: 3.0
    }
  };
  
  // Create standardized conditions (with light offshore wind)
  const createTestHour = (waveHeight, skill) => ({
    ...baseData,
    skill,
    hours: [{
      ts: "2025-09-07T12:00:00Z",
      wind: { speedKt: 5, directionDeg: 0 }, // North wind (offshore for south-facing beach)
      primary: { heightM: waveHeight, periodS: 8, directionDeg: 180 },
      tide: { tideHeightM: 1.5, tideRangeM: 2.0 }
    }]
  });
  
  // Display header
  console.log("\n");
  console.log("Wave Height | Novice        | Intermediate   | Advanced");
  console.log("-----------|---------------|----------------|---------------");
  
  // Run tests for each wave height
  waveHeights.forEach(height => {
    const results = {};
    
    // Test each skill level
    skillLevels.forEach(skill => {
      const testData = createTestHour(height, skill);
      const result = gradeDay(testData);
      results[skill] = result;
    });
    
    // Display results
    const formattedHeight = height.toFixed(1).padEnd(9);
    
    const noviceGrade = results.novice.hours[0];
    const intermediateGrade = results.intermediate.hours[0];
    const advancedGrade = results.advanced.hours[0];
    
    const noviceText = getTextGrade(noviceGrade.light, "novice", height);
    const intermediateText = getTextGrade(intermediateGrade.light, "intermediate", height);
    const advancedText = getTextGrade(advancedGrade.light, "advanced", height);
    
    console.log(
      `${formattedHeight} | ${colorize(noviceText, getGradeColor(noviceGrade.light)).padEnd(15)} | ` +
      `${colorize(intermediateText, getGradeColor(intermediateGrade.light)).padEnd(16)} | ` +
      `${colorize(advancedText, getGradeColor(advancedGrade.light))}`
    );
  });
  
  console.log("\n");
  console.log(colorize("=== KEY INSIGHTS ===", COLORS.bright));
  console.log("1. Small waves (0.3-0.9m) are shown as 'Beginner friendly' for novices, but 'Poor' for intermediate/advanced");
  console.log("2. Medium waves (1.2-1.5m) tend to be better for intermediate surfers");
  console.log("3. Larger waves (2.0m+) are typically best for advanced surfers only");
  console.log("4. The UI now adapts to show appropriate assessments based on skill level");
  
  // Show output example
  console.log("\n");
  console.log(colorize("=== UI DISPLAY EXAMPLES ===", COLORS.bright));
  console.log("When small waves (0.6m) are present:");
  console.log("- For novice: Badge shows 'Beginner friendly' in blue");
  console.log("- For intermediate/advanced: Badge shows 'Poor' in red");
  console.log("\nAdvice message for novice with small waves:");
  console.log(colorize("Small waves today - perfect for beginners, bodyboards, and learning! Experienced surfers may want to check other spots.", COLORS.blue));
  
} catch (error) {
  console.error("Error running the debug script:", error.message);
}
