import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function main() {
  console.log('🎣 Testing Rectangle 28E5\n');
  
  const { data, error } = await supabase.rpc('get_environmental_predictions_enhanced', {
    target_rectangle: '28E5',
    target_date: '2025-10-18',
    user_lat: 43.0,
    user_lon: -8.0
  });
  
  if (error) {
    console.log('❌ RPC ERROR:', error.message);
    console.log('Full error:', error);
  } else if (!data || data.length === 0) {
    console.log('⚠️ No predictions returned');
  } else {
    console.log(`✅ Got ${data.length} predictions\n`);
    console.log('Top 10 by Bite Score:');
    data.slice(0, 10).forEach((p: any, i: number) => {
      console.log(`${i+1}. ${p.name_en}: Bite=${p.bite_score}, Confidence=${p.confidence}%, Temp=${p.temp_score}`);
    });
    
    console.log('\nBite Score Range:');
    const bites = data.map((d: any) => d.bite_score).filter((b: any) => b != null);
    if (bites.length > 0) {
      const avg = bites.reduce((a: number, b: number) => a + b, 0) / bites.length;
      console.log(`Min: ${Math.min(...bites)}, Max: ${Math.max(...bites)}, Avg: ${avg.toFixed(1)}`);
    }
    
    console.log('\nChecking environmental conditions used:');
    if (data[0]) {
      const first = data[0];
      console.log('Sample prediction:', {
        species: first.name_en,
        biogeographic_regions: first.biogeographic_regions
      });
    }
  }
}

main();
