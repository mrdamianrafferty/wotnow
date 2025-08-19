// Test script for the new category-level advice system
const { getActivityMessage, activityAliases, activityCategories } = require('./data/activityMessages.ts');

console.log('Testing category-level advice system...\n');

// Test 1: Activity with specific message
console.log('Test 1 - Activity with specific message (surfing):');
console.log(getActivityMessage('surfing', 'perfect', []));
console.log('');

// Test 2: Activity without specific message but with category fallback
console.log('Test 2 - Activity without specific message, using category fallback:');
console.log(getActivityMessage('fake_water_sport', 'good', []));
console.log('');

// Test 3: Activity alias normalization
console.log('Test 3 - Activity alias normalization (snorkelling → snorkeling):');
console.log(getActivityMessage('snorkelling', 'perfect', []));
console.log('');

// Test 4: Completely unknown activity falling back to global defaults
console.log('Test 4 - Unknown activity using global defaults:');
console.log(getActivityMessage('completely_unknown_activity', 'fair', []));
console.log('');

// Test 5: Show category mappings
console.log('Test 5 - Category mappings sample:');
console.log('surfing → ', activityCategories['surfing']);
console.log('hiking → ', activityCategories['hiking']);
console.log('tennis → ', activityCategories['tennis']);
console.log('');

// Test 6: Show alias mappings
console.log('Test 6 - Alias mappings sample:');
console.log('snorkelling → ', activityAliases['snorkelling']);
console.log('soccer → ', activityAliases['soccer']);
console.log('mtb → ', activityAliases['mtb']);
