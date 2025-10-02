import { activityTypes } from '../data/activityTypes';
import { buildUiTaxonomyFromActivities, SECONDARY_CATEGORIES } from '../data/taxonomy';

// Add: show where activityTypes is being resolved from
// eslint-disable-next-line @typescript-eslint/no-var-requires
const resolvedPath = require.resolve('../data/activityTypes');
console.log('[validateTaxonomy] activityTypes resolved from:', resolvedPath);

function main() {
  const uiTax = buildUiTaxonomyFromActivities(activityTypes);
  const dataIds = new Set(activityTypes.map(a => a.id));
  const covered = new Set<string>();
  const rows: { sub: string; count: number }[] = [];

  // Add: quick peek at IDs to verify the set
  console.log('[validateTaxonomy] activityTypes length:', activityTypes.length);
  console.log('[validateTaxonomy] sample IDs:', activityTypes.slice(0, 25).map(a => a.id));

  for (const c of uiTax) {
    for (const sc of c.subcategories) {
      for (const id of sc.acts) covered.add(id);
      rows.push({ sub: sc.key, count: sc.acts.length });
    }
  }

  const uncovered = Array.from(dataIds).filter(id => !covered.has(id));

  console.log('Secondary categories:', SECONDARY_CATEGORIES);
  console.log(`Activities in data: ${dataIds.size}`);
  console.log(`Covered by taxonomy: ${covered.size}`);
  console.log('\nPer-subcategory coverage:');
  rows.forEach(r => console.log(` - ${r.sub}: ${r.count}`));

  if (uncovered.length) {
    console.warn('\nUnclassified (should be 0; these fell into the fallback if present):');
    uncovered.forEach(id => console.warn(' -', id));
    process.exit(1);
  } else {
    console.log('\nOK: All activities are covered by the built taxonomy.');
    process.exit(0);
  }
}

main();