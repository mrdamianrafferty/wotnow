import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeAliasTable() {
  console.log('🔍 Analyzing Species Name Alias Table\n');
  console.log('='.repeat(100));
  
  // Get all aliases
  const { data: aliases, error } = await supabase
    .from('species_name_alias')
    .select('*')
    .order('scientific_name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${aliases?.length || 0} alias entries\n`);

  // Group by scientific name
  const byScientific = new Map<string, any[]>();
  aliases?.forEach(alias => {
    if (!byScientific.has(alias.scientific_name)) {
      byScientific.set(alias.scientific_name, []);
    }
    byScientific.get(alias.scientific_name)!.push(alias);
  });

  // Get species data to show official name
  const { data: species } = await supabase
    .from('species')
    .select('name_en, scientific_name')
    .in('scientific_name', Array.from(byScientific.keys()));

  const speciesMap = new Map(species?.map(s => [s.scientific_name, s.name_en]));

  console.log('CURRENT ALIASES BY SPECIES');
  console.log('='.repeat(100));
  
  byScientific.forEach((aliasesList, scientificName) => {
    const officialName = speciesMap.get(scientificName) || 'Unknown';
    console.log(`\n📍 ${officialName}`);
    console.log(`   Scientific: ${scientificName}`);
    console.log(`   Aliases (${aliasesList.length}):`);
    aliasesList.forEach(a => {
      console.log(`      • ${a.name_en_alias}`);
    });
  });

  // Check which species DON'T have aliases
  console.log('\n\n' + '='.repeat(100));
  console.log('SPECIES WITHOUT ALIASES');
  console.log('='.repeat(100));

  const { data: allSpecies } = await supabase
    .from('species')
    .select('name_en, scientific_name')
    .order('name_en');

  const speciesWithAliases = new Set(Array.from(byScientific.keys()));
  const withoutAliases = allSpecies?.filter(s => !speciesWithAliases.has(s.scientific_name)) || [];

  console.log(`\n${withoutAliases.length} species without aliases:\n`);
  
  // Group by category
  const categories = {
    'Bass/Bream/Common': withoutAliases.filter(s => 
      s.name_en.includes('Bass') || 
      s.name_en.includes('Bream') || 
      s.name_en.includes('Seabream') ||
      s.name_en.includes('Common')
    ),
    'European/Atlantic': withoutAliases.filter(s => 
      s.name_en.includes('European') || 
      s.name_en.includes('Atlantic')
    ),
    'Mullet': withoutAliases.filter(s => s.name_en.includes('Mullet')),
    'Other': withoutAliases.filter(s => 
      !s.name_en.includes('Bass') && 
      !s.name_en.includes('Bream') && 
      !s.name_en.includes('Seabream') &&
      !s.name_en.includes('Common') &&
      !s.name_en.includes('European') && 
      !s.name_en.includes('Atlantic') &&
      !s.name_en.includes('Mullet')
    )
  };

  Object.entries(categories).forEach(([category, list]) => {
    if (list.length > 0) {
      console.log(`\n${category} (${list.length}):`);
      list.forEach(s => console.log(`  • ${s.name_en} (${s.scientific_name})`));
    }
  });

  // Generate SQL recommendations
  console.log('\n\n' + '='.repeat(100));
  console.log('RECOMMENDED NEW ALIASES');
  console.log('='.repeat(100));

  const recommendations = [
    {
      species: 'European Bass',
      scientific: 'Dicentrarchus labrax',
      new_aliases: ['Sea Bass', 'European Seabass', 'European Sea Bass', 'Seabass'],
      rationale: 'Most common search terms, single/double word variants'
    },
    {
      species: 'Red Mullet',
      scientific: 'Mullus surmuletus',
      new_aliases: ['Mullet', 'Striped Red Mullet'],
      rationale: 'Generic mullet searches'
    },
    {
      species: 'Cod (Coastal)',
      scientific: 'Gadus morhua',
      new_aliases: ['Cod', 'Atlantic Cod', 'European Cod'],
      rationale: 'People search for "cod" not "coastal cod"'
    },
    {
      species: 'Gilthead Seabream',
      scientific: 'Sparus aurata',
      new_aliases: ['Dorada', 'Sea Bream', 'Gilt-head Bream', 'Gilthead Bream'],
      rationale: 'Spanish/Mediterranean name, various spellings'
    },
    {
      species: 'Sea Bream (Dorada)',
      scientific: 'Sparus aurata',
      new_aliases: ['Dorada', 'Sea Bream', 'Seabream'],
      rationale: 'Common international name'
    },
    {
      species: 'White Seabream',
      scientific: 'Diplodus sargus',
      new_aliases: ['Sargo', 'Sea Bream', 'White Bream'],
      rationale: 'Portuguese/Spanish name'
    },
    {
      species: 'Common Octopus',
      scientific: 'Octopus vulgaris',
      new_aliases: ['Octopus'],
      rationale: 'Simple search'
    },
    {
      species: 'Common Cuttlefish',
      scientific: 'Sepia officinalis',
      new_aliases: ['Cuttlefish'],
      rationale: 'Simple search'
    }
  ];

  console.log('\n-- Migration SQL to add new aliases:\n');
  console.log('INSERT INTO species_name_alias (name_en_alias, scientific_name) VALUES');
  
  const sqlValues: string[] = [];
  recommendations.forEach(rec => {
    rec.new_aliases.forEach(alias => {
      sqlValues.push(`    ('${alias}', '${rec.scientific}')`);
    });
  });
  
  console.log(sqlValues.join(',\n'));
  console.log('ON CONFLICT (name_en_alias) DO NOTHING;\n');

  console.log('\n-- Rationale for each:\n');
  recommendations.forEach(rec => {
    console.log(`-- ${rec.species} (${rec.scientific})`);
    console.log(`--   New aliases: ${rec.new_aliases.join(', ')}`);
    console.log(`--   Why: ${rec.rationale}\n`);
  });

  // Show how to use in RPC
  console.log('\n' + '='.repeat(100));
  console.log('HOW TO USE ALIASES IN RPC FUNCTION');
  console.log('='.repeat(100));
  
  console.log(`
**Current RPC:**
- Returns species without alias lookups
- User searching for "sea bass" won't match "European Bass"

**Enhanced RPC with Alias Support:**

\`\`\`sql
-- Add CTE to join aliases
WITH species_with_aliases AS (
  SELECT 
    s.*,
    ARRAY_AGG(DISTINCT sna.name_en_alias) FILTER (WHERE sna.name_en_alias IS NOT NULL) as aliases
  FROM species s
  LEFT JOIN species_name_alias sna ON s.scientific_name = sna.scientific_name
  GROUP BY s.species_id
)
SELECT 
  swa.species_id,
  swa.name_en,
  swa.scientific_name,
  swa.aliases,  -- Return as array
  ...
FROM species_with_aliases swa
WHERE ...
\`\`\`

**In TypeScript (rpcResponseNormalizer.ts):**

\`\`\`typescript
export interface RPCPrediction {
  ...
  aliases?: string[];  // Add this field
}

export function findSpeciesByName(predictions: any[], searchName: string): any | null {
  const searchLower = searchName.toLowerCase().trim();
  return predictions.find(pred => {
    const name = getSpeciesName(pred).toLowerCase();
    const scientific = (pred.scientific_name || '').toLowerCase();
    const aliases = pred.aliases || [];
    
    // Check official name
    if (name.includes(searchLower) || searchLower.includes(name)) return true;
    
    // Check scientific name
    if (scientific.includes(searchLower) || searchLower.includes(scientific)) return true;
    
    // Check each alias
    for (const alias of aliases) {
      const aliasLower = (alias || '').toLowerCase();
      if (aliasLower.includes(searchLower) || searchLower.includes(aliasLower)) {
        return true;
      }
    }
    
    return false;
  }) || null;
}
\`\`\`

**Benefits:**
✅ User searches "sea bass" → finds "European Bass"
✅ User searches "seabass" → finds "European Bass"  
✅ User searches "dorada" → finds "Gilthead Seabream"
✅ User searches "mullet" → finds "Red Mullet"
✅ User searches "cod" → finds "Cod (Coastal)"
✅ Better UX, more intuitive searches
✅ International name support (Spanish/Portuguese)
`);

  // Test current alias matching
  console.log('\n' + '='.repeat(100));
  console.log('TEST: CURRENT ALIAS MATCHES');
  console.log('='.repeat(100));
  
  const testSearches = [
    'sea bass',
    'seabass',
    'bass',
    'pollock',
    'pollack',
    'sole',
    'dover sole',
    'mackerel',
    'dorada',
    'cod'
  ];

  console.log('\nTesting common search terms:\n');
  for (const search of testSearches) {
    const matches = aliases?.filter(a => 
      a.name_en_alias.toLowerCase().includes(search.toLowerCase()) ||
      search.toLowerCase().includes(a.name_en_alias.toLowerCase())
    );
    
    if (matches && matches.length > 0) {
      const speciesNames = matches.map(m => speciesMap.get(m.scientific_name) || 'Unknown');
      console.log(`✅ "${search}" → ${[...new Set(speciesNames)].join(', ')}`);
    } else {
      console.log(`❌ "${search}" → No matches (needs alias)`);
    }
  }
}

analyzeAliasTable();
