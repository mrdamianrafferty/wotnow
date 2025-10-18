import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeAliases() {
  console.log('🔍 Analyzing Species Alias Column Usage\n');
  
  // Check all species with aliases
  const { data: allSpecies } = await supabase
    .from('species')
    .select('name_en, alias, scientific_name, species_code')
    .order('name_en');

  console.log('='.repeat(100));
  console.log('CURRENT ALIAS USAGE');
  console.log('='.repeat(100));
  
  const withAliases = allSpecies?.filter(s => s.alias) || [];
  const withoutAliases = allSpecies?.filter(s => !s.alias) || [];
  
  console.log(`\nTotal species: ${allSpecies?.length}`);
  console.log(`With aliases: ${withAliases.length}`);
  console.log(`Without aliases: ${withoutAliases.length}\n`);

  if (withAliases.length > 0) {
    console.log('Species WITH aliases:');
    console.log('-'.repeat(100));
    withAliases.forEach(s => {
      console.log(`${s.name_en.padEnd(35)} | Alias: ${(s.alias || '').padEnd(30)} | ${s.scientific_name}`);
    });
  }

  // Check for common species that might need aliases
  console.log('\n\n' + '='.repeat(100));
  console.log('SPECIES THAT MIGHT BENEFIT FROM ALIASES');
  console.log('='.repeat(100));
  
  const { data: commonNames } = await supabase
    .from('species')
    .select('name_en, alias, scientific_name, species_code')
    .or('name_en.ilike.%bass%,name_en.ilike.%seabream%,name_en.ilike.%sea bream%,name_en.ilike.%mullet%,name_en.ilike.%cod%,name_en.ilike.%bream%')
    .order('name_en');

  console.log('\nBass, Bream, Mullet, and Cod species:\n');
  commonNames?.forEach(s => {
    const hasAlias = s.alias ? '✅' : '❌';
    const aliasStr = s.alias || 'NO ALIAS';
    console.log(`${hasAlias} ${s.name_en.padEnd(35)} | ${aliasStr.padEnd(30)} | ${s.scientific_name}`);
  });

  // Analyze naming patterns
  console.log('\n\n' + '='.repeat(100));
  console.log('NAMING PATTERN ANALYSIS');
  console.log('='.repeat(100));
  
  const patterns = {
    'European': allSpecies?.filter(s => s.name_en.includes('European')) || [],
    'Atlantic': allSpecies?.filter(s => s.name_en.includes('Atlantic')) || [],
    'Common': allSpecies?.filter(s => s.name_en.includes('Common')) || [],
    'Sea': allSpecies?.filter(s => s.name_en.includes('Sea') && !s.name_en.includes('Seabream')) || [],
    'Coastal': allSpecies?.filter(s => s.name_en.includes('Coastal')) || []
  };

  Object.entries(patterns).forEach(([pattern, species]) => {
    console.log(`\n"${pattern}" species (${species.length}):`);
    species.forEach(s => {
      const hasAlias = s.alias ? '✅' : '❌';
      console.log(`  ${hasAlias} ${s.name_en} ${s.alias ? `(aka: ${s.alias})` : ''}`);
    });
  });

  // Generate alias suggestions
  console.log('\n\n' + '='.repeat(100));
  console.log('ALIAS SUGGESTIONS');
  console.log('='.repeat(100));
  
  const suggestions = [
    {
      name_en: 'European Bass',
      current_alias: allSpecies?.find(s => s.name_en === 'European Bass')?.alias,
      suggested_aliases: ['Sea Bass', 'European Sea Bass', 'Bass', 'Seabass'],
      rationale: 'Most commonly searched as "sea bass" or "seabass"'
    },
    {
      name_en: 'Gilthead Seabream',
      current_alias: allSpecies?.find(s => s.name_en === 'Gilthead Seabream')?.alias,
      suggested_aliases: ['Gilt-head Bream', 'Dorada', 'Sea Bream'],
      rationale: 'Known as Dorada in Mediterranean, often called "sea bream"'
    },
    {
      name_en: 'Sea Bream (Dorada)',
      current_alias: allSpecies?.find(s => s.name_en === 'Sea Bream (Dorada)')?.alias,
      suggested_aliases: ['Dorada', 'Gilthead Bream', 'Sea Bream'],
      rationale: 'Spanish/Portuguese name widely used'
    },
    {
      name_en: 'Red Mullet',
      current_alias: allSpecies?.find(s => s.name_en === 'Red Mullet')?.alias,
      suggested_aliases: ['Striped Red Mullet', 'Mullet'],
      rationale: 'Generic "mullet" search should find this'
    },
    {
      name_en: 'Cod (Coastal)',
      current_alias: allSpecies?.find(s => s.name_en === 'Cod (Coastal)')?.alias,
      suggested_aliases: ['Cod', 'Atlantic Cod', 'European Cod'],
      rationale: 'Most people search for "cod" not "coastal cod"'
    },
    {
      name_en: 'Common Sole',
      current_alias: allSpecies?.find(s => s.name_en === 'Common Sole')?.alias,
      suggested_aliases: ['Sole', 'Dover Sole', 'European Sole'],
      rationale: 'Often called simply "sole"'
    }
  ];

  console.log('\nRecommended alias updates:\n');
  suggestions.forEach((s, idx) => {
    const exists = allSpecies?.find(sp => sp.name_en === s.name_en);
    if (exists) {
      console.log(`${idx + 1}. ${s.name_en}`);
      console.log(`   Current: ${s.current_alias || 'NULL'}`);
      console.log(`   Suggested: ${s.suggested_aliases.join(' | ')}`);
      console.log(`   Why: ${s.rationale}`);
      console.log('');
    }
  });

  // Generate SQL for updates
  console.log('\n' + '='.repeat(100));
  console.log('SQL UPDATE STATEMENTS');
  console.log('='.repeat(100));
  console.log('\n-- Add/Update aliases for common species:\n');
  
  suggestions.forEach(s => {
    const exists = allSpecies?.find(sp => sp.name_en === s.name_en);
    if (exists) {
      const aliasValue = s.suggested_aliases.join(' | ');
      console.log(`UPDATE species SET alias = '${aliasValue}' WHERE name_en = '${s.name_en}';`);
    }
  });

  // Check how alias could be used in search
  console.log('\n\n' + '='.repeat(100));
  console.log('HOW TO USE ALIASES IN SEARCH');
  console.log('='.repeat(100));
  
  console.log(`
**Current Search Logic:**
- Searches only name_en field
- Case-insensitive match
- User searches "sea bass" → might not find "European Bass"

**Improved Search Logic (using alias):**
1. Search name_en field (as before)
2. ALSO search alias field (if present)
3. Split alias by '|' and check each variant

**Example Implementation:**

\`\`\`typescript
// In findSpeciesByName function
export function findSpeciesByName(predictions: any[], searchName: string): any | null {
  const searchLower = searchName.toLowerCase();
  return predictions.find(pred => {
    const name = getSpeciesName(pred).toLowerCase();
    const scientific = (pred.scientific_name || '').toLowerCase();
    const aliases = (pred.alias || '').toLowerCase().split('|').map(a => a.trim());
    
    // Check name
    if (name.includes(searchLower) || searchLower.includes(name)) return true;
    
    // Check scientific name
    if (scientific.includes(searchLower) || searchLower.includes(scientific)) return true;
    
    // Check each alias
    for (const alias of aliases) {
      if (alias && (alias.includes(searchLower) || searchLower.includes(alias))) {
        return true;
      }
    }
    
    return false;
  }) || null;
}
\`\`\`

**RPC Function Enhancement:**
Currently, RPC doesn't return alias field. Add it:

\`\`\`sql
SELECT 
  s.species_id,
  s.species_code,
  s.name_en,
  s.scientific_name,
  s.alias,  -- ADD THIS
  ...
FROM species s
\`\`\`

**Benefits:**
1. User searches "sea bass" → finds "European Bass"
2. User searches "dorada" → finds "Gilthead Seabream"
3. User searches "mullet" → finds "Red Mullet"
4. More intuitive search experience
5. Better international support (Spanish/Portuguese names)
`);
}

analyzeAliases();
