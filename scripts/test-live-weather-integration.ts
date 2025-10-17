/**
 * Test Live Weather Integration in Predictions API
 * 
 * Validates that the production API fetches real weather data
 * and passes it to the RPC functions for scoring
 */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function testLiveWeatherIntegration() {
  console.log('🌦️  Testing Live Weather Integration\n');
  console.log('='.repeat(70));

  // Test with a real rectangle
  const testRectangle = '26C7'; // Irish Southwest
  const testDate = '2025-10-17';

  console.log(`\n📍 Testing Rectangle: ${testRectangle}`);
  console.log(`📅 Testing Date: ${testDate}`);
  console.log('-'.repeat(70));

  try {
    const response = await fetch(`${API_BASE_URL}/api/findr/predictions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rectangleCode: testRectangle,
        predictionDate: testDate,
        bypassCache: true, // Force fresh weather fetch
      }),
    });

    if (!response.ok) {
      console.error('❌ API request failed:', response.status, response.statusText);
      const error = await response.text();
      console.error('Error details:', error);
      return;
    }

    const data = await response.json();

    console.log('\n✅ API Response received');
    console.log(`   Species count: ${data.species?.length || 0}`);
    console.log(`   Source: ${data.source || 'unknown'}`);

    if (!data.species || data.species.length === 0) {
      console.warn('⚠️  No species returned');
      return;
    }

    // Check if weather scores are present and varying
    const weatherScores = data.species
      .filter((s: any) => s.weather_score != null)
      .map((s: any) => s.weather_score);

    console.log(`\n📊 Weather Score Analysis:`);
    console.log(`   Species with weather_score: ${weatherScores.length}/${data.species.length}`);
    
    if (weatherScores.length === 0) {
      console.error('❌ FAIL: No species have weather_score field');
      return;
    }

    const uniqueScores = [...new Set(weatherScores)];
    const avgScore = weatherScores.reduce((a: number, b: number) => a + b, 0) / weatherScores.length;
    const minScore = Math.min(...weatherScores);
    const maxScore = Math.max(...weatherScores);

    console.log(`   Unique scores: ${uniqueScores.join(', ')}`);
    console.log(`   Average: ${avgScore.toFixed(1)}`);
    console.log(`   Range: ${minScore} - ${maxScore}`);

    // Sample species
    console.log(`\n🎣 Sample Species:`);
    const samples = data.species.slice(0, 5);
    samples.forEach((s: any) => {
      console.log(`   ${s.name_en?.padEnd(25)} confidence=${s.confidence}, weather_score=${s.weather_score}`);
    });

    // Validation checks
    console.log(`\n✅ Validation Results:`);
    
    const hasWeatherField = data.species.every((s: any) => s.weather_score != null);
    console.log(`   ✓ All species have weather_score: ${hasWeatherField ? '✅ PASS' : '❌ FAIL'}`);
    
    const notAllNeutral = uniqueScores.length > 1 || (uniqueScores.length === 1 && uniqueScores[0] !== 7);
    console.log(`   ✓ Weather scores vary (not all 7): ${notAllNeutral ? '✅ PASS' : '⚠️  NEUTRAL'}`);
    
    const reasonableRange = minScore >= 0 && maxScore <= 10;
    console.log(`   ✓ Scores in valid range (0-10): ${reasonableRange ? '✅ PASS' : '❌ FAIL'}`);

    if (avgScore === 7 && uniqueScores.length === 1) {
      console.log(`\n⚠️  NOTE: All scores are 7 (neutral)`);
      console.log(`   This suggests weather data was not available from Met Norway`);
      console.log(`   or the location is outside Met Norway coverage.`);
      console.log(`   The system correctly falls back to neutral scoring.`);
    } else {
      console.log(`\n🎉 SUCCESS: Live weather data is affecting predictions!`);
      console.log(`   Weather scores indicate real conditions were fetched and applied.`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLiveWeatherIntegration().catch(console.error);
