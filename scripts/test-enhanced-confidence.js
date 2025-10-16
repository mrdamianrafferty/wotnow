const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testEnhancedConfidence() {
  console.log('🧪 Testing Enhanced Confidence Scoring\n');
  console.log('=' .repeat(80));
  
  const rectangles = ['31F1', '37I0', '28E5'];
  const targetDate = '2025-10-16';
  
  for (const rect of rectangles) {
    console.log(`\n📍 Rectangle: ${rect}`);
    console.log('-'.repeat(80));
    
    const { data, error } = await supabase.rpc('get_environmental_predictions_basic', {
      target_rectangle: rect,
      target_date: targetDate
    });
    
    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
      continue;
    }
    
    if (!data || data.length === 0) {
      console.log(`  ⚠️  No predictions returned`);
      continue;
    }
    
    // Collect confidence statistics
    const confidences = data.map(p => p.confidence);
    const uniqueValues = [...new Set(confidences)];
    const min = Math.min(...confidences);
    const max = Math.max(...confidences);
    const avg = (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(1);
    
    console.log(`  📊 Statistics:`);
    console.log(`     Species count: ${data.length}`);
    console.log(`     Confidence range: ${min}-${max}`);
    console.log(`     Average confidence: ${avg}%`);
    console.log(`     Unique values: ${uniqueValues.length} (${uniqueValues.length === 1 ? '❌ ALL SAME!' : '✅ VARIED'})`);
    
    // Show top 5 species with confidence breakdown
    console.log(`\n  🏆 Top 5 Species:`);
    data.slice(0, 5).forEach((p, i) => {
      console.log(`\n     ${i + 1}. ${p.species_name}`);
      console.log(`        Confidence: ${p.confidence}%`);
      console.log(`        Final Score: ${p.final_score}`);
      
      // Find confidence breakdown in rationale
      if (p.rationale && Array.isArray(p.rationale)) {
        const confidenceRationale = p.rationale.find(r => r.includes('Confidence:'));
        if (confidenceRationale) {
          console.log(`        ${confidenceRationale}`);
        }
      }
    });
    
    // Distribution analysis
    const ranges = {
      'Very High (90-100)': confidences.filter(c => c >= 90).length,
      'High (80-89)': confidences.filter(c => c >= 80 && c < 90).length,
      'Good (70-79)': confidences.filter(c => c >= 70 && c < 80).length,
      'Moderate (60-69)': confidences.filter(c => c >= 60 && c < 70).length,
      'Low (50-59)': confidences.filter(c => c >= 50 && c < 60).length,
      'Very Low (<50)': confidences.filter(c => c < 50).length,
    };
    
    console.log(`\n  📈 Distribution:`);
    Object.entries(ranges).forEach(([range, count]) => {
      if (count > 0) {
        const pct = ((count / data.length) * 100).toFixed(0);
        const bar = '█'.repeat(Math.floor(count / 2));
        console.log(`     ${range.padEnd(20)} ${bar} ${count} (${pct}%)`);
      }
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Test complete! Check if confidence scores vary across species.\n');
}

testEnhancedConfidence().catch(console.error);
