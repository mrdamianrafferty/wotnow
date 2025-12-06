require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function insertConditions() {
  console.log('Fetching template from 26D6...');
  
  const { data: template, error: fetchError } = await supabase
    .from('findr_conditions_latest')
    .select('*')
    .eq('rectangle_code', '26D6')
    .single();
  
  if (fetchError || !template) { 
    console.log('No template found:', fetchError?.message); 
    return; 
  }
  
  console.log('Template sea_temp_c:', template.sea_temp_c);
  
  // Create new record for 28E5
  const newRecord = { 
    ...template, 
    rectangle_code: '28E5', 
    snapshot_day: new Date().toISOString().split('T')[0], 
    captured_at: new Date().toISOString() 
  };
  delete newRecord.id;
  
  console.log('Inserting conditions for 28E5...');
  
  const { data, error } = await supabase
    .from('findr_conditions_snapshots')
    .insert(newRecord)
    .select();
  
  if (error) { 
    console.log('Insert error:', error.message, error.code); 
  } else { 
    console.log('Successfully inserted conditions for:', data?.[0]?.rectangle_code); 
  }
  
  // Verify it shows in the view
  const { data: check } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code, sea_temp_c')
    .eq('rectangle_code', '28E5');
  
  console.log('Verification - 28E5 in view:', check);
}

insertConditions();
