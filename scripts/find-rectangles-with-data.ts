import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findRectanglesWithData() {
  console.log('🔍 Searching for rectangles with environmental data...\n');

  // Get all rectangles with recent data
  const { data, error } = await supabase
    .from('findr_conditions_snapshots')
    .select('rectangle_code, captured_at, sea_temp_c')
    .gte('captured_at', '2025-10-01')
    .order('captured_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Group by rectangle
  const rectangleMap = new Map<string, any[]>();
  data?.forEach(row => {
    if (!rectangleMap.has(row.rectangle_code)) {
      rectangleMap.set(row.rectangle_code, []);
    }
    rectangleMap.get(row.rectangle_code)!.push(row);
  });

  const rectangles = Array.from(rectangleMap.entries()).map(([code, records]) => {
    const latest = records[0];
    
    // Parse rectangle code to get approximate coordinates
    // Format: XXYY where XX is latitude band, YY is longitude band
    const latBand = parseInt(code.substring(0, 2));
    const lonCode = code.substring(2, 3);
    
    // ICES rectangle system: 
    // Latitude: 30 + latBand/2 (each band is 0.5 degrees)
    // Longitude: Depends on letter (A=12W, B=11W, C=10W, etc.)
    const avgLat = 30 + (latBand * 0.5);
    const lonOffset = lonCode.charCodeAt(0) - 'A'.charCodeAt(0);
    const avgLon = -12 + lonOffset;
    
    // Determine region based on coordinates
    let region = 'Unknown';
    if (avgLat >= 35 && avgLat <= 46 && avgLon >= -5 && avgLon <= 40) {
      region = 'Mediterranean';
    } else if (avgLat >= 36 && avgLat <= 45 && avgLon >= -10 && avgLon <= -5) {
      region = 'IBI (Portugal)';
    } else if (avgLat >= 43 && avgLat <= 49 && avgLon >= -10 && avgLon <= -1) {
      region = 'Bay of Biscay';
    } else if (avgLat >= 48 && avgLat <= 52 && avgLon >= -6 && avgLon <= 2) {
      region = 'English Channel';
    } else if (avgLat >= 49 && avgLat <= 61 && avgLon >= -10 && avgLon <= -2) {
      region = 'Atlantic (UK/Ireland)';
    } else if (avgLat >= 51 && avgLat <= 61 && avgLon >= 2 && avgLon <= 15) {
      region = 'North Sea';
    } else if (avgLat >= 54 && avgLat <= 70 && avgLon >= 5 && avgLon <= 30) {
      region = 'Norwegian Sea';
    } else if (avgLat >= 54 && avgLat <= 66 && avgLon >= 10 && avgLon <= 25) {
      region = 'Baltic Sea';
    } else if (avgLat <= 42) {
      region = 'Atlantic (South)';
    }
    
    return {
      code,
      count: records.length,
      latest: latest.captured_at,
      temp: latest.sea_temp_c,
      lat: avgLat.toFixed(2),
      lon: avgLon.toFixed(2),
      region
    };
  });

  // Sort by region
  rectangles.sort((a, b) => a.region.localeCompare(b.region) || a.code.localeCompare(b.code));

  console.log(`Found ${rectangles.length} rectangles with data\n`);
  
  // Group by region
  const byRegion = new Map<string, typeof rectangles>();
  rectangles.forEach(r => {
    if (!byRegion.has(r.region)) {
      byRegion.set(r.region, []);
    }
    byRegion.get(r.region)!.push(r);
  });

  // Display by region
  byRegion.forEach((rects, region) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📍 ${region} (${rects.length} rectangles)`);
    console.log(`${'='.repeat(80)}`);
    
    rects.slice(0, 5).forEach(r => {
      const tempStr = r.temp ? r.temp.toFixed(1).padStart(5) : ' null';
      console.log(`  ${r.code.padEnd(6)} | Lat: ${r.lat.padStart(6)}, Lon: ${r.lon.padStart(7)} | Temp: ${tempStr}°C | Data: ${r.count.toString().padStart(3)} records | Latest: ${r.latest.split('T')[0]}`);
    });
    
    if (rects.length > 5) {
      console.log(`  ... and ${rects.length - 5} more rectangles in this region`);
    }
  });

  // Generate test area suggestions
  console.log('\n\n' + '='.repeat(80));
  console.log('💡 SUGGESTED TEST AREAS FOR 15-REGION TEST');
  console.log('='.repeat(80));
  console.log('\nPick one rectangle from each region for comprehensive testing:\n');

  const suggestions: Array<{region: string, code: string, lat: string, lon: string, description: string}> = [];

  byRegion.forEach((rects, region) => {
    if (rects.length > 0) {
      const pick = rects[0];
      const description = getLocationDescription(parseFloat(pick.lat), parseFloat(pick.lon));
      suggestions.push({
        region,
        code: pick.code,
        lat: pick.lat,
        lon: pick.lon,
        description
      });
    }
  });

  suggestions.forEach((s, idx) => {
    console.log(`${(idx + 1).toString().padStart(2)}. ${s.code} - ${s.region.padEnd(25)} (${s.description})`);
  });

  // Generate code snippet
  console.log('\n\n' + '='.repeat(80));
  console.log('📝 CODE SNIPPET FOR test-15-european-areas.ts');
  console.log('='.repeat(80));
  console.log('\nconst testAreas: TestArea[] = [');
  
  suggestions.forEach((s, idx) => {
    console.log(`  {`);
    console.log(`    name: '${s.description}',`);
    console.log(`    rectangleCode: '${s.code}',`);
    console.log(`    region: '${s.region}',`);
    console.log(`    expectedSpecies: [], // TODO: Add expected species`);
    console.log(`    unexpectedSpecies: [] // TODO: Add Mediterranean species if not Mediterranean`);
    console.log(`  }${idx < suggestions.length - 1 ? ',' : ''}`);
  });
  
  console.log('];\n');
}

function getLocationDescription(lat: number, lon: number): string {
  // Mediterranean
  if (lat >= 40 && lat <= 44 && lon >= 0 && lon <= 10) return 'Western Mediterranean (France/Spain)';
  if (lat >= 38 && lat <= 42 && lon >= 10 && lon <= 18) return 'Central Mediterranean (Italy)';
  if (lat >= 35 && lat <= 40 && lon >= 20 && lon <= 30) return 'Eastern Mediterranean (Greece)';
  if (lat >= 35 && lat <= 40 && lon >= -5 && lon <= 5) return 'Southern Mediterranean (Spain)';
  
  // Atlantic regions
  if (lat >= 36 && lat <= 40 && lon >= -10 && lon <= -6) return 'Southern Portugal (Algarve)';
  if (lat >= 38 && lat <= 41 && lon >= -10 && lon <= -8) return 'Central Portugal (Lisbon)';
  if (lat >= 41 && lat <= 44 && lon >= -10 && lon <= -6) return 'Northern Portugal/Galicia';
  if (lat >= 43 && lat <= 45 && lon >= -5 && lon <= -1) return 'Bay of Biscay (Spain)';
  if (lat >= 45 && lat <= 49 && lon >= -6 && lon <= -1) return 'Bay of Biscay (France)';
  
  // English Channel & UK
  if (lat >= 48 && lat <= 51 && lon >= -6 && lon <= 2) return 'English Channel';
  if (lat >= 49 && lat <= 52 && lon >= -6 && lon <= -2) return 'Celtic Sea (Cornwall/Wales)';
  if (lat >= 52 && lat <= 55 && lon >= -6 && lon <= -3) return 'Irish Sea';
  if (lat >= 54 && lat <= 59 && lon >= -8 && lon <= -2) return 'Scottish West Coast';
  if (lat >= 58 && lat <= 61 && lon >= -3 && lon <= 0) return 'Northern Scotland';
  
  // North Sea
  if (lat >= 51 && lat <= 54 && lon >= 2 && lon <= 5) return 'Southern North Sea (Netherlands)';
  if (lat >= 54 && lat <= 57 && lon >= 0 && lon <= 3) return 'Central North Sea (UK)';
  if (lat >= 57 && lat <= 60 && lon >= 0 && lon <= 5) return 'Northern North Sea (Scotland)';
  if (lat >= 54 && lat <= 58 && lon >= 5 && lon <= 10) return 'Eastern North Sea (Denmark)';
  
  // Norwegian/Baltic
  if (lat >= 58 && lat <= 65 && lon >= 5 && lon <= 12) return 'Norwegian Coast';
  if (lat >= 54 && lat <= 61 && lon >= 10 && lon <= 20) return 'Baltic Sea';
  
  return `Lat ${lat.toFixed(1)}, Lon ${lon.toFixed(1)}`;
}

findRectanglesWithData();
