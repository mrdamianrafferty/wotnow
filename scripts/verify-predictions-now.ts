import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function verify() {
  console.log('Testing Bay of Biscay (25E1) predictions...\n');
  
  const { data: predictions, error } = await supabase.rpc('get_environmental_predictions_basic', {
    target_rectangle: '25E1',
    target_date: '2025-10-18'
  });
  
  if (error) {
    console.log('RPC Error:', error.message);
    return;
  }
  
  console.log(`Total predictions: ${predictions?.length || 0}\n`);
  
  if (predictions && predictions.length > 0) {
    console.log('Top 15:\n');
    predictions.slice(0, 15).forEach((p: any, i: number) => {
      console.log(`${(i+1).toString().padStart(2)}. ${p.confidence}% - ${p.name_en}`);
    });
    
    const boguePos = predictions.findIndex((p: any) => p.name_en === 'Bogue');
    const bonitoPos = predictions.findIndex((p: any) => p.name_en === 'Atlantic Bonito');
    const comberPos = predictions.findIndex((p: any) => p.name_en === 'Comber');
    
    console.log(`\nBogue: Position ${boguePos + 1}`);
    console.log(`Atlantic Bonito: ${bonitoPos >= 0 ? 'Position ' + (bonitoPos + 1) : 'Not found'}`);
    console.log(`Comber: ${comberPos >= 0 ? 'Found (BAD)' : 'Filtered out (GOOD)'}`);
  }
}

verify().catch(console.error);
