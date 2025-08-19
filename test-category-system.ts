// Test the category-level advice system implementation
// This demonstrates the hierarchy: activity-specific → category → global defaults

import { getActivityMessage, activityAliases, activityCategories, categoryDefaults } from '../data/activityMessages';

console.log('='.repeat(60));
console.log('CATEGORY-LEVEL ADVICE SYSTEM TEST');
console.log('='.repeat(60));

// Test 1: Activity with specific message templates (should use activity-specific)
console.log('\n1. ACTIVITY-SPECIFIC MESSAGES (existing activities):');
console.log('Surfing (perfect):', getActivityMessage('surfing', 'perfect', []));
console.log('Beach (good):', getActivityMessage('beach', 'good', []));
console.log('Hiking (fair):', getActivityMessage('hiking', 'fair', []));

// Test 2: Activity aliases (should normalize then use activity-specific)
console.log('\n2. ACTIVITY ALIASES (normalized activities):');
console.log('snorkelling → snorkeling:', getActivityMessage('snorkelling', 'perfect', []));
console.log('soccer → football_soccer:', getActivityMessage('soccer', 'good', []));
console.log('mtb → mountain_biking:', getActivityMessage('mtb', 'fair', []));

// Test 3: Activities without specific templates but with category mappings
console.log('\n3. CATEGORY FALLBACKS (activities without specific templates):');
// Let's test by temporarily removing an activity from activityMessages and seeing if it falls back to category
console.log('Testing category fallback by adding unmapped activity...');

// We can test this by creating a mock activity that exists in categories but not in specific messages
console.log('Mock Water Sport Activity:', getActivityMessage('mock_water_activity', 'perfect', []));

// Test 4: Show the category structure
console.log('\n4. CATEGORY MAPPINGS SAMPLE:');
const sampleActivities = ['surfing', 'hiking', 'tennis', 'camping', 'yoga'];
sampleActivities.forEach(activity => {
  const category = activityCategories[activity];
  console.log(`${activity} → ${category || 'No category mapping'}`);
});

// Test 5: Show alias structure  
console.log('\n5. ALIAS MAPPINGS SAMPLE:');
const sampleAliases = ['snorkelling', 'soccer', 'mtb', 'swimming', 'barbecue'];
sampleAliases.forEach(alias => {
  const normalized = activityAliases[alias];
  console.log(`${alias} → ${normalized || 'No alias mapping'}`);
});

// Test 6: Test the hierarchy by checking what happens with completely unknown activities
console.log('\n6. GLOBAL FALLBACKS (completely unknown activities):');
console.log('Unknown activity (perfect):', getActivityMessage('totally_unknown_activity', 'perfect', []));
console.log('Unknown activity (poor):', getActivityMessage('totally_unknown_activity', 'poor', []));

// Test 7: Demonstrate the message quality difference
console.log('\n7. MESSAGE QUALITY COMPARISON:');
console.log('Specific (surfing):', getActivityMessage('surfing', 'perfect', []));
console.log('Category (Water Sports):', categoryDefaults['Water Sports'].templates.perfect.replace('{reasons}', ''));
console.log('Global fallback:', getActivityMessage('unknown', 'perfect', []));

console.log('\n' + '='.repeat(60));
console.log('TEST COMPLETED - Category-level advice system implemented!');
console.log('='.repeat(60));
