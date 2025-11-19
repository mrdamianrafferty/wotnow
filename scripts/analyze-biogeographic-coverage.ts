import { createClient } from '@supabase/supabase-js';

async function analyzeCoverage() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('=== Analyzing Species Biogeographic Coverage ===\n');

  // Check how many species have biogeographic_regions set
  const { data: allSpecies } = await supabase
    .from('species')
    .select('species_code, name_en, biogeographic_regions')
    .not('species_code', 'is', null);

  const withRegions = allSpecies?.filter(s => s.biogeographic_regions && s.biogeographic_regions.length > 0) || [];
  const withoutRegions = allSpecies?.filter(s => !s.biogeographic_regions || s.biogeographic_regions.length === 0) || [];

  console.log(`Total species: ${allSpecies?.length || 0}`);
  console.log(`Species WITH biogeographic_regions: ${withRegions.length}`);
  console.log(`Species WITHOUT biogeographic_regions (NULL/empty): ${withoutRegions.length}`);

  // Check what regions are used
  const regionCounts: Record<string, number> = {};
  withRegions.forEach(sp => {
    sp.biogeographic_regions?.forEach((r: string) => {
      regionCounts[r] = (regionCounts[r] || 0) + 1;
    });
  });

  console.log('\nRegion distribution:');
  Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).forEach(([region, count]) => {
    console.log(`  ${region}: ${count} species`);
  });

  console.log('\n=== Checking Rectangle 28E5 Mapping ===\n');

  // Check how 28E5 is mapped
  const { data: rect } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region, cmems_region')
    .eq('rectangle_code', '28E5')
    .single();

  console.log('Rectangle 28E5:', JSON.stringify(rect, null, 2));

  console.log('\n=== Testing Filter Logic ===\n');

  // Manually test the filter logic
  const cmemsRegion = rect?.cmems_region;
  let bioRegions: string[] = [];

  if (cmemsRegion === 'IBI') {
    bioRegions = ['BIS', 'IBR'];
  }

  console.log(`CMEMS region '${cmemsRegion}' maps to biogeographic regions: ${JSON.stringify(bioRegions)}`);

  // Count species that would match
  const matching = withRegions.filter(sp =>
    sp.biogeographic_regions?.some((r: string) => bioRegions.includes(r))
  );

  console.log(`\nSpecies with regions that overlap with [${bioRegions.join(', ')}]: ${matching.length}`);
  console.log(`Species without regions (should also be included): ${withoutRegions.length}`);
  console.log(`Expected total: ${matching.length + withoutRegions.length}`);

  console.log('\nSample matching species (first 10):');
  matching.slice(0, 10).forEach(sp => {
    console.log(`  - ${sp.name_en} (${sp.biogeographic_regions?.join(', ')})`);
  });

  if (withoutRegions.length > 0) {
    console.log('\nSample species WITHOUT regions (first 10):');
    withoutRegions.slice(0, 10).forEach(sp => {
      console.log(`  - ${sp.name_en} (NULL/empty)`);
    });
  }
}

analyzeCoverage().catch(console.error);
