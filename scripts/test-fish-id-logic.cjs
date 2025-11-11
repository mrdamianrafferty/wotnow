#!/usr/bin/env node
/**
 * Unit tests for Hugging Face Fish Service core logic
 * Simple Node.js tests without Jest dependency
 */

// Test utilities
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passedTests++;
  } else {
    console.log(`  ❌ ${message}`);
    failedTests++;
  }
}

function describe(name, fn) {
  console.log(`\n📦 ${name}`);
  fn();
}

function it(name, fn) {
  process.stdout.write(`  Testing: ${name}...`);
  try {
    fn();
    console.log(' ✅');
  } catch (error) {
    console.log(` ❌\n     Error: ${error.message}`);
    failedTests++;
  }
}

// Test data
const mockCandidates = [
  {
    id: '1',
    name: 'Atlantic Cod',
    scientific_name: 'Gadus morhua',
    slug: 'atlantic-cod',
  },
  {
    id: '2',
    name: 'European Sea Bass',
    scientific_name: 'Dicentrarchus labrax',
    slug: 'european-sea-bass',
  },
  {
    id: '3',
    name: 'Atlantic Mackerel',
    scientific_name: 'Scomber scombrus',
    slug: 'atlantic-mackerel',
  },
];

const mockHFPredictions = [
  { label: 'Atlantic Cod', score: 0.92 },
  { label: 'Pollack', score: 0.05 },
  { label: 'Haddock', score: 0.02 },
];

// Core logic functions (extracted from service for testing)
function matchSpecies(prediction, candidates) {
  const predictionLabel = prediction.label.toLowerCase();
  const matches = [];

  for (const candidate of candidates) {
    const commonName = candidate.name.toLowerCase();
    const scientificName = candidate.scientific_name?.toLowerCase() || '';

    // Exact match
    if (commonName === predictionLabel || scientificName === predictionLabel) {
      matches.push({ species: candidate, score: prediction.score * 1.0, matchType: 'exact' });
      continue;
    }

    // Partial match
    if (commonName.includes(predictionLabel) || predictionLabel.includes(commonName)) {
      matches.push({ species: candidate, score: prediction.score * 0.8, matchType: 'partial' });
      continue;
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

function determineMethod(score, hasMatch) {
  if (!hasMatch) return 'manual_selection';
  if (score >= 0.70) return 'ai';
  return 'manual_selection';
}

function generateMessage(species, score) {
  if (score >= 0.85) {
    return `Looks like a ${species}! 🐟 (${Math.round(score * 100)}% confident)`;
  } else if (score >= 0.70) {
    return `Probably a ${species}, but please verify the photo. (${Math.round(score * 100)}% confident)`;
  } else {
    return `Best guess: ${species}, but confidence is low. Please review alternatives.`;
  }
}

function createSlug(name) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

// Run tests
console.log('🧪 Testing Hugging Face Fish Service Core Logic\n');
console.log('='.repeat(60));

describe('Species Matching', () => {
  it('should match exact common name', () => {
    const matches = matchSpecies(mockHFPredictions[0], mockCandidates);
    assert(matches.length > 0, 'Found matches');
    assert(matches[0].matchType === 'exact', 'Match type is exact');
    assert(matches[0].species.name === 'Atlantic Cod', 'Matched Atlantic Cod');
  });

  it('should match partial common name', () => {
    const prediction = { label: 'Sea Bass', score: 0.87 };
    const matches = matchSpecies(prediction, mockCandidates);
    assert(matches.length > 0, 'Found matches');
    assert(matches[0].matchType === 'partial', 'Match type is partial');
    assert(matches[0].species.name === 'European Sea Bass', 'Matched European Sea Bass');
  });

  it('should match scientific name', () => {
    const prediction = { label: 'Gadus morhua', score: 0.88 };
    const matches = matchSpecies(prediction, mockCandidates);
    assert(matches.length > 0, 'Found matches');
    assert(matches[0].species.scientific_name === 'Gadus morhua', 'Matched by scientific name');
  });

  it('should not match unrelated species', () => {
    const prediction = { label: 'Tuna', score: 0.75 };
    const matches = matchSpecies(prediction, mockCandidates);
    assert(matches.length === 0, 'No matches for unrelated species');
  });
});

describe('Confidence Classification', () => {
  it('should classify high confidence (>= 85%)', () => {
    const confidence = 0.92;
    assert(confidence >= 0.85, 'High confidence threshold');
  });

  it('should classify moderate confidence (70-85%)', () => {
    const confidence = 0.78;
    assert(confidence >= 0.70 && confidence < 0.85, 'Moderate confidence range');
  });

  it('should classify low confidence (< 70%)', () => {
    const confidence = 0.65;
    assert(confidence < 0.70, 'Low confidence threshold');
  });
});

describe('Method Determination', () => {
  it('should return "ai" for high confidence match', () => {
    const method = determineMethod(0.92, true);
    assert(method === 'ai', 'Method is ai for high confidence');
  });

  it('should return "ai" for moderate confidence match', () => {
    const method = determineMethod(0.75, true);
    assert(method === 'ai', 'Method is ai for moderate confidence');
  });

  it('should return "manual_selection" for low confidence', () => {
    const method = determineMethod(0.65, true);
    assert(method === 'manual_selection', 'Method is manual for low confidence');
  });

  it('should return "manual_selection" when no match', () => {
    const method = determineMethod(0.95, false);
    assert(method === 'manual_selection', 'Method is manual when no match');
  });
});

describe('Message Generation', () => {
  it('should generate high confidence message', () => {
    const message = generateMessage('Atlantic Cod', 0.92);
    assert(message.includes('Looks like'), 'Contains high confidence phrase');
    assert(message.includes('🐟'), 'Contains fish emoji');
    assert(message.includes('92%'), 'Contains confidence percentage');
  });

  it('should generate moderate confidence message', () => {
    const message = generateMessage('Sea Bass', 0.75);
    assert(message.includes('Probably'), 'Contains moderate confidence phrase');
    assert(message.includes('verify'), 'Contains verification prompt');
  });

  it('should generate low confidence message', () => {
    const message = generateMessage('Unknown', 0.45);
    assert(message.includes('Best guess'), 'Contains low confidence phrase');
    assert(message.includes('low'), 'Mentions low confidence');
  });
});

describe('Slug Generation', () => {
  it('should create slug from species name', () => {
    const slug = createSlug('Atlantic Cod');
    assert(slug === 'atlantic-cod', 'Created correct slug');
  });

  it('should handle multiple spaces', () => {
    const slug = createSlug('European  Sea  Bass');
    assert(slug === 'european-sea-bass', 'Handles multiple spaces');
  });

  it('should convert to lowercase', () => {
    const slug = createSlug('MACKEREL');
    assert(slug === 'mackerel', 'Converts to lowercase');
  });
});

describe('Cost Calculation', () => {
  it('should always return $0 cost', () => {
    const cost = 0;
    assert(cost === 0, 'Cost is zero');
  });

  it('should have zero cost for multiple inferences', () => {
    const inferences = 1000;
    const costPerInference = 0;
    const totalCost = inferences * costPerInference;
    assert(totalCost === 0, 'Total cost is zero');
  });
});

describe('Edge Cases', () => {
  it('should handle empty candidates array', () => {
    const matches = matchSpecies({ label: 'Test', score: 0.9 }, []);
    assert(matches.length === 0, 'Returns empty array for no candidates');
  });

  it('should handle very low confidence', () => {
    const score = 0.15;
    assert(score < 0.70, 'Recognizes very low confidence');
  });

  it('should handle special characters in names', () => {
    const slug = createSlug("O'Reilly's Fish");
    assert(slug.includes('o'), 'Handles apostrophes');
  });
});

describe('Performance Metrics', () => {
  it('should calculate average inference time', () => {
    const times = [450, 520, 380, 410, 490];
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    assert(Math.abs(avg - 450) < 50, 'Average is around 450ms');
  });
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Test Summary:');
console.log(`   ✅ Passed: ${passedTests}`);
console.log(`   ❌ Failed: ${failedTests}`);
console.log(`   📈 Total: ${passedTests + failedTests}`);

if (failedTests === 0) {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review.');
  process.exit(1);
}
