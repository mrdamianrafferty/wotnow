import * as fs from 'fs';
import * as path from 'path';

// Load species advice data
const adviceData = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data/speciesAdviceData.json'), 'utf-8')
);

// Map from advice regions text to database region arrays
function parseRegions(regionsText: string): string[] {
  if (!regionsText) return [];
  
  const regions = new Set<string>();
  const text = regionsText.toLowerCase();
  
  // Check for specific regions mentioned
  if (text.includes('mediterranean')) regions.add('Mediterranean');
  if (text.includes('atlantic')) regions.add('Atlantic');
  if (text.includes('north sea')) regions.add('North Sea');
  if (text.includes('celtic')) regions.add('Celtic Sea');
  if (text.includes('english channel') || text.includes('channel')) regions.add('English Channel');
  if (text.includes('irish sea')) regions.add('Irish Sea');
  if (text.includes('biscay') || text.includes('bay of biscay')) regions.add('Bay of Biscay');
  if (text.includes('ibi') || text.includes('iberia')) regions.add('IBI');
  
  return Array.from(regions);
}

// Generate SQL UPDATE statements
const updates: string[] = [];

adviceData.forEach((species: any) => {
  const contexts = Object.values(species.contexts || {});
  const allRegions = new Set<string>();
  
  contexts.forEach((context: any) => {
    const regions = parseRegions(context.regions || '');
    regions.forEach(r => allRegions.add(r));
  });
  
  if (allRegions.size > 0) {
    const regionsArray = Array.from(allRegions).map(r => `'${r}'`).join(', ');
    updates.push(
      `UPDATE species SET biogeographic_regions = ARRAY[${regionsArray}] WHERE name_en = '${species.name.replace("'", "''")}';\n`
    );
  }
});

console.log('-- Generated SQL to populate biogeographic_regions from speciesAdviceData.json\n');
console.log(updates.join(''));
console.log(`\n-- Total: ${updates.length} species`);
