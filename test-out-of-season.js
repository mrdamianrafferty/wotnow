// Quick test for out-of-season functionality
import { isOutOfSeason } from './utils/activityHelpers';

// Test with current date (August 17, 2025 - month 8)
const currentDate = new Date('2025-08-17');

console.log('Testing out-of-season detection:');
console.log('Current date:', currentDate.toDateString());
console.log('Current month:', currentDate.getMonth() + 1);

// Test winter activities (should be out of season in August)
console.log('Skiing (months 12,1,2,3):', isOutOfSeason('skiing', currentDate));
console.log('Ice skating (months 12,1,2):', isOutOfSeason('ice_skating', currentDate));

// Test summer activities (should be in season in August)
console.log('Swimming (months 5,6,7,8,9):', isOutOfSeason('swimming', currentDate));
console.log('Basketball (no seasonal months):', isOutOfSeason('basketball_outdoor', currentDate));

// Test in December (winter)
const winterDate = new Date('2025-12-17');
console.log('\nTesting in December:');
console.log('Skiing in December:', isOutOfSeason('skiing', winterDate));
console.log('Swimming in December:', isOutOfSeason('swimming', winterDate));
