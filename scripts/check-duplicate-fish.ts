import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate fish entries...\n');

  // Get all species with their details
  const { data: allSpecies, error } = await supabase
    .from('species')
    .select('species_code, name_en, scientific_name')
    .order('scientific_name');

  if (error) {
    console.error('Error fetching species:', error);
    return;
  }

  console.log(`📊 Total species in database: ${allSpecies.length}\n`);

  // Check for duplicate scientific names
  console.log('=== DUPLICATE SCIENTIFIC NAMES ===\n');
  const scientificNameMap = new Map<string, typeof allSpecies>();
  
  for (const species of allSpecies) {
    const sciName = species.scientific_name.toLowerCase().trim();
    if (!scientificNameMap.has(sciName)) {
      scientificNameMap.set(sciName, []);
    }
    scientificNameMap.get(sciName)!.push(species);
  }

  const duplicateScientific = Array.from(scientificNameMap.entries())
    .filter(([_, species]) => species.length > 1);

  if (duplicateScientific.length > 0) {
    console.log(`⚠️  Found ${duplicateScientific.length} duplicate scientific names:\n`);
    for (const [sciName, species] of duplicateScientific) {
      console.log(`🔴 "${sciName}"`);
      for (const s of species) {
        console.log(`   - ID: ${s.species_code}, English: "${s.name_en}"`);
      }
      console.log();
    }
  } else {
    console.log('✅ No duplicate scientific names found\n');
  }

  // Check specific groups for similar names
  console.log('=== CHECKING SPECIFIC GROUPS ===\n');

  const groupsToCheck = [
    { name: 'Bream/Seabream', keywords: ['bream', 'dorada', 'pagellus', 'pagrus', 'diplodus', 'sparus'] },
    { name: 'Wrasse', keywords: ['wrasse', 'labrus', 'symphodus', 'coris', 'crenilabrus'] },
    { name: 'Mullet', keywords: ['mullet', 'mugil', 'liza', 'chelon', 'mullus'] },
    { name: 'Saithe/Pollock', keywords: ['saithe', 'pollock', 'pollachius', 'coalfish'] },
    { name: 'Bass', keywords: ['bass', 'dicentrarchus', 'seabass'] },
    { name: 'Cod', keywords: ['cod', 'gadus'] },
    { name: 'Ray/Skate', keywords: ['ray', 'skate', 'raja', 'dipturus', 'leucoraja'] },
  ];

  for (const group of groupsToCheck) {
    const matching = allSpecies.filter(s => 
      group.keywords.some(keyword => 
        s.name_en.toLowerCase().includes(keyword) || 
        s.scientific_name.toLowerCase().includes(keyword)
      )
    );

    if (matching.length > 0) {
      console.log(`\n📋 ${group.name} (${matching.length} species):`);
      console.log('─'.repeat(80));
      
      // Sort by scientific name for easier comparison
      matching.sort((a, b) => a.scientific_name.localeCompare(b.scientific_name));
      
      for (const s of matching) {
        console.log(`  ${s.scientific_name.padEnd(35)} | ${s.name_en.padEnd(30)} | ID: ${s.species_code}`);
      }
    }
  }

  // Check for very similar English names
  console.log('\n\n=== SIMILAR ENGLISH NAMES ===\n');
  
  const nameMap = new Map<string, typeof allSpecies>();
  for (const species of allSpecies) {
    const normalized = species.name_en.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[()]/g, '')
      .trim();
    
    if (!nameMap.has(normalized)) {
      nameMap.set(normalized, []);
    }
    nameMap.get(normalized)!.push(species);
  }

  const similarNames = Array.from(nameMap.entries())
    .filter(([_, species]) => species.length > 1);

  if (similarNames.length > 0) {
    console.log(`⚠️  Found ${similarNames.length} similar English names:\n`);
    for (const [name, species] of similarNames) {
      console.log(`🟡 "${name}"`);
      for (const s of species) {
        console.log(`   - ID: ${s.species_code}, Scientific: "${s.scientific_name}", Original: "${s.name_en}"`);
      }
      console.log();
    }
  } else {
    console.log('✅ No similar English names found\n');
  }

  // Get alias information for these groups
  console.log('\n=== ALIASES FOR KEY SPECIES ===\n');
  
  const { data: aliases, error: aliasError } = await supabase
    .from('species_name_alias')
    .select('name_en_alias, scientific_name')
    .order('scientific_name');

  if (!aliasError && aliases) {
    const aliasMap = new Map<string, string[]>();
    for (const alias of aliases) {
      if (!aliasMap.has(alias.scientific_name)) {
        aliasMap.set(alias.scientific_name, []);
      }
      aliasMap.get(alias.scientific_name)!.push(alias.name_en_alias);
    }

    // Show aliases for species in our check groups
    for (const group of groupsToCheck) {
      const matching = allSpecies.filter(s => 
        group.keywords.some(keyword => 
          s.name_en.toLowerCase().includes(keyword) || 
          s.scientific_name.toLowerCase().includes(keyword)
        )
      );

      const withAliases = matching.filter(s => aliasMap.has(s.scientific_name));
      
      if (withAliases.length > 0) {
        console.log(`\n${group.name} with aliases:`);
        for (const s of withAliases) {
          const speciesAliases = aliasMap.get(s.scientific_name)!;
          console.log(`  ${s.scientific_name} (${s.name_en})`);
          console.log(`    Aliases: ${speciesAliases.join(', ')}`);
        }
      }
    }
  }
}

checkDuplicates().then(() => {
  console.log('\n✅ Duplicate check complete');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
