// debug-surf-ui-preview.js
// This script shows how the surf UI renders for different wave sizes and skill levels
// Run with: npx ts-node --skipProject debug-surf-ui-preview.js

try {
  // Simulated components and helper functions to mirror the actual UI
  const COLORS = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    blue: "\x1b[34m",
    bg_green: "\x1b[42m",
    bg_yellow: "\x1b[43m",
    bg_red: "\x1b[41m",
    bg_blue: "\x1b[44m",
    black: "\x1b[30m",
  };
  
  const colourFor = (light, isBeginnerFriendly = false) => {
    if (isBeginnerFriendly) return COLORS.bg_blue;
    if (light === "green") return COLORS.bg_green;
    if (light === "amber") return COLORS.bg_yellow;
    return COLORS.bg_red;
  };
  
  const textFor = (light, skill = "intermediate", waveHeight) => {
    const isSmallWaves = typeof waveHeight === 'number' && waveHeight < 1 && waveHeight >= 0.3;
    
    if (light === "green") {
      return "Good";
    } else if (light === "amber") {
      return "Fair";
    } else if (light === "red" && skill === "novice" && isSmallWaves) {
      return "Beginner friendly";
    } else {
      return "Poor";
    }
  };
  
  const isBeginnerFriendly = (light, skill = "intermediate", waveHeight) => {
    return light === "red" && skill === "novice" && typeof waveHeight === 'number' && waveHeight < 1 && waveHeight >= 0.3;
  };
  
  // Test scenarios
  const scenarios = [
    { waveHeight: 0.6, skill: "novice", light: "red", name: "Small waves (0.6m) - Novice" },
    { waveHeight: 0.6, skill: "intermediate", light: "red", name: "Small waves (0.6m) - Intermediate" },
    { waveHeight: 1.2, skill: "intermediate", light: "green", name: "Medium waves (1.2m) - Intermediate" },
    { waveHeight: 2.0, skill: "advanced", light: "green", name: "Large waves (2.0m) - Advanced" }
  ];
  
  // Simulate badge UI element
  const renderBadge = (light, skill, waveHeight) => {
    const isBeginner = isBeginnerFriendly(light, skill, waveHeight);
    const badgeColor = colourFor(light, isBeginner);
    const text = textFor(light, skill, waveHeight);
    return `${badgeColor}${COLORS.black} ${text} ${COLORS.reset}`;
  };
  
  // Simulate advice message
  const renderAdvice = (light, skill, waveHeight) => {
    if (light === "green") {
      return "Good conditions for surfing! Check the best times above for optimal experience.";
    } else if (light === "amber") {
      return "Fair conditions with some challenges. Be careful and check the forecast details.";
    } else {
      const isSmallWaves = typeof waveHeight === 'number' && waveHeight < 1 && waveHeight >= 0.3;
      if (skill === "novice" && isSmallWaves) {
        return "Small waves today - perfect for beginners, bodyboards, and learning! Experienced surfers may want to check other spots.";
      } else {
        return "Poor conditions today. Consider alternative activities or check back tomorrow.";
      }
    }
  };
  
  // Render UI for each scenario
  console.log(`${COLORS.bright}=== SURF UI PREVIEW FOR DIFFERENT SCENARIOS ===${COLORS.reset}\n`);
  
  scenarios.forEach(scenario => {
    console.log(`${COLORS.bright}SCENARIO: ${scenario.name}${COLORS.reset}`);
    console.log('----------------------------------------');
    
    // Badge display
    console.log(`Surf Outlook ${renderBadge(scenario.light, scenario.skill, scenario.waveHeight)}`);
    
    // Surf advice
    console.log('\nSurf Advice:');
    console.log(renderAdvice(scenario.light, scenario.skill, scenario.waveHeight));
    
    // Hour-by-hour example
    console.log('\nExample hour display:');
    console.log(`12:00 PM ${renderBadge(scenario.light, scenario.skill, scenario.waveHeight)}`);
    
    // Settings display
    console.log('\nSettings:');
    console.log(`Experience Level: ${scenario.skill}`);
    
    console.log('\n');
  });
  
  console.log(`${COLORS.bright}KEY BENEFITS OF THE UPDATE:${COLORS.reset}`);
  console.log('1. Beginners now get encouraging feedback for small waves (instead of "Poor")');
  console.log('2. Different skill levels see appropriate assessments for their abilities');
  console.log('3. Users can switch between skill levels to see different perspectives');
  console.log('4. Visual distinction (blue badge) for beginner-friendly conditions');
  
} catch (error) {
  console.error("Error running the debug script:", error);
}
