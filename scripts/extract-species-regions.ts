import speciesAdviceData from '../data/speciesAdviceData.json';

const regions = new Set<string>();

speciesAdviceData.forEach((species: any) => {
  if (species.contexts?.shore?.regions) {
    regions.add(species.contexts.shore.regions);
  }
  if (species.contexts?.boat?.regions) {
    regions.add(species.contexts.boat.regions);
  }
});

console.log('All unique region strings found in speciesAdviceData.json:\n');
Array.from(regions).sort().forEach(r => console.log(`  - "${r}"`));

console.log('\n\nRegion categorization:');
const categorized = {
  'Mediterranean only': Array.from(regions).filter(r => r.includes('Mediterranean') && !r.includes('Atlantic')),
  'Atlantic only': Array.from(regions).filter(r => r.includes('Atlantic') && !r.includes('Mediterranean')),
  'Both Med + Atlantic': Array.from(regions).filter(r => r.includes('Mediterranean') && r.includes('Atlantic')),
  'North Sea/Northern': Array.from(regions).filter(r => r.includes('North') || r.includes('Baltic') || r.includes('Scandinavia')),
  'British Isles specific': Array.from(regions).filter(r => r.includes('British') || r.includes('Ireland') || r.includes('UK')),
};

Object.entries(categorized).forEach(([category, list]) => {
  console.log(`\n${category} (${list.length}):`);
  list.forEach(r => console.log(`  - ${r}`));
});
