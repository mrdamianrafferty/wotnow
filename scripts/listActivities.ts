import { activityTypes } from '../data/activityTypes';

console.log('Count:', activityTypes.length);
console.log('IDs:', activityTypes.map(a => a.id).sort());