// Debug outdoor meditation scoring issue
console.log('🧘 Debugging Outdoor Meditation Scoring');
console.log('=====================================');

// Manually implement the core logic for testing
function parseConditionString(condition) {
  const match = condition.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(<=|>=|<|>|=|==|!=)(.+)$/);
  if (!match) return null;
  
  const [, key, operator, valueStr] = match;
  const value = parseFloat(valueStr);
  
  return { key, operator, value };
}

function evaluateConditionScore(condition, weather) {
  const parsed = parseConditionString(condition);
  if (!parsed) return 0;
  
  const { key, operator, value: threshold } = parsed;
  const weatherValue = weather[key];
  
  if (weatherValue === undefined || weatherValue === null) return 0;
  
  switch (operator) {
    case '>':
      return weatherValue > threshold ? 1 : Math.max(0, weatherValue / threshold);
    case '>=':
      return weatherValue >= threshold ? 1 : Math.max(0, weatherValue / threshold);
    case '<':
      return weatherValue < threshold ? 1 : Math.max(0, threshold / Math.max(weatherValue, 0.1));
    case '<=':
      return weatherValue <= threshold ? 1 : Math.max(0, threshold / Math.max(weatherValue, 0.1));
    case '=':
    case '==': {
      const tolerance = Math.max(threshold * 0.1, 1);
      return Math.max(0, 1 - Math.abs(weatherValue - threshold) / tolerance);
    }
    case '!=':
      return weatherValue !== threshold ? 1 : 0;
    default:
      return 0;
  }
}

// Current weather conditions (from user report)
const weather = {
  temperature: 22,
  precipitation: 1,  // 1mm light rain
  windSpeed: 15 / 3.6, // 15 km/h converted to m/s (≈4.17)
  clouds: 70,
  humidity: 68,
  visibility: 10
};

// Outdoor meditation poor conditions
const poorConditions = [
  'precipitation>0',
  'windSpeed>25',
  'temperature<2',
  'temperature>32'
];

console.log('Weather conditions:');
console.log(JSON.stringify(weather, null, 2));
console.log('');

console.log('Testing each poor condition:');
console.log('============================');

let totalScore = 0;
let countedConditions = 0;

// Test each poor condition individually
poorConditions.forEach((condition, index) => {
  const score = evaluateConditionScore(condition, weather);
  const parsed = parseConditionString(condition);
  const weatherValue = weather[parsed.key];
  
  console.log(`${index + 1}. "${condition}"`);
  console.log(`   Weather value: ${weatherValue}`);
  console.log(`   Score: ${score.toFixed(3)}`);
  
  if (score > 0.7) {
    console.log(`   ✅ TRIGGERED (score > 0.7) - adds to penalty`);
    totalScore += score;
  } else {
    console.log(`   ⚪ Not triggered (score ≤ 0.7)`);
  }
  countedConditions++;
  console.log('');
});

// Calculate overall penalty (FIXED logic)
let triggeredScore = 0;
let triggeredCount = 0;

poorConditions.forEach((condition) => {
  const score = evaluateConditionScore(condition, weather);
  if (score > 0.7) {
    triggeredScore += score;
    triggeredCount++;
  }
});

const penalty = triggeredCount > 0 ? Math.min(1, triggeredScore / triggeredCount) : 0;

console.log(`Overall poor condition penalty: ${penalty.toFixed(3)}`);
console.log('');

// Show what the penalty should mean for final scoring
if (penalty > 0.7) {
  console.log('✅ PENALTY > 0.7: Activity should be marked as POOR (score 8-20)');
} else {
  console.log('❌ PENALTY ≤ 0.7: Activity might be marked as good/perfect (WRONG!)');
}

console.log('');
console.log('🐛 ANALYSIS:');
console.log('- precipitation>0 with 1mm rain should give score = 1.0 (fully triggered)');
console.log('- This should result in penalty > 0.7');
console.log('- Outdoor meditation should be scored as POOR, not PERFECT');
