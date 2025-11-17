import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function querySchema() {
  console.log('Querying ices_rectangles schema...\n');

  // Get a sample row to see all columns
  const { data: rect } = await supabase
    .from('ices_rectangles')
    .select('*')
    .eq('rectangle_code', '31F2')
    .single();

  console.log('Sample ices_rectangles row (31F2):');
  console.log(JSON.stringify(rect, null, 2));

  console.log('\n\nColumn names:');
  if (rect) {
    Object.keys(rect).forEach(key => {
      console.log(`  - ${key}: ${typeof rect[key]} (value: ${rect[key]})`);
    });
  }
}

querySchema().catch(console.error);
