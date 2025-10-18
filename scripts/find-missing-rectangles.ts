import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function main() {
  console.log('🔍 Finding rectangles with missing conditions data\n');
  
  // Get all rectangles from ices_rectangles
  const { data: icesRects } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code')
    .order('rectangle_code');
  
  // Get all rectangles from findr_conditions_latest
  const { data: condRects } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code')
    .order('rectangle_code');
  
  if (icesRects && condRects) {
    const icesCodes = icesRects.map(r => r.rectangle_code);
    const condCodes = condRects.map(r => r.rectangle_code);
    
    console.log('📊 Statistics:');
    console.log('   ICES rectangles (should have):', icesCodes.length);
    console.log('   Conditions rectangles (actual):', condCodes.length);
    console.log('   Missing:', icesCodes.length - condCodes.length);
    
    // Find missing rectangles
    const missing = icesCodes.filter(code => !condCodes.includes(code));
    
    if (missing.length > 0) {
      console.log('\n❌ Rectangles in ices_rectangles but NOT in findr_conditions_latest:');
      console.log('   Count:', missing.length);
      console.log('\n   First 30:');
      missing.slice(0, 30).forEach(code => console.log('      ' + code));
      
      if (missing.length > 30) {
        console.log('   ... and', missing.length - 30, 'more');
      }
      
      if (missing.includes('28E5')) {
        console.log('\n✅ 28E5 IS one of the missing rectangles');
        console.log('   This explains why predictions are empty!');
      }
    } else {
      console.log('\n✅ All ices_rectangles have conditions data!');
    }
  }
}

main();
