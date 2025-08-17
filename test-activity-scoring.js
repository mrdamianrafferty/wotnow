// Test specific activity scoring for the four problematic activities
console.log('🔍 Testing Activity Scoring for Four Problem Activities');
console.log('====================================================');

// Mock the ES modules using dynamic imports
async function runTest() {
  try {
    // Import the scoring functions
    const { calculateConditionMatchScore, calculatePoorConditionPenalty } = await import('./utils/activitySuitability.ts');
    const { activityTypes } = await import('./data/activityTypes.ts');
    
    // Current weather conditions from your description
    const testWeather = {
      temperature: 22,
      precipitation: 0,
      windSpeed: 2.5, // 5 knots converted to m/s (5 * 0.514 = 2.57)
      clouds: 75, // broken clouds
      humidity: 84,
      visibility: 10, // 10km visibility
      waterTemperature: 24,
      waveHeight: 0.4,
      swellHeight: 0.3,
      swellPeriod: 4.4
    };

    console.log('🌤️ Test Weather Conditions:');
    console.log(JSON.stringify(testWeather, null, 2));
    console.log('');

    const problemActivities = ['outdoor_music', 'surfing', 'sea_kayaking', 'cycling'];

    for (const activityId of problemActivities) {
      const activity = activityTypes.find(a => a.id === activityId);
      if (!activity) {
        console.log(`❌ Activity ${activityId} not found`);
        continue;
      }

      console.log(`\n🎯 TESTING: ${activity.name} (${activityId})`);
      console.log('─'.repeat(50));

      // Test poor conditions
      if (activity.poorConditions?.length) {
        const poorPenalty = calculatePoorConditionPenalty(activity.poorConditions, testWeather);
        console.log(`💀 Poor condition penalty: ${poorPenalty.toFixed(3)}`);
        console.log(`   Poor conditions: ${JSON.stringify(activity.poorConditions)}`);
        if (poorPenalty > 0.7) {
          console.log('   ❌ POOR CONDITIONS TRIGGERED - this explains low score!');
        }
      }

      // Test perfect conditions
      if (activity.perfectConditions?.length) {
        const perfectScore = calculateConditionMatchScore(activity.perfectConditions, testWeather);
        console.log(`✨ Perfect match score: ${perfectScore.toFixed(3)}`);
        console.log(`   Perfect conditions: ${JSON.stringify(activity.perfectConditions)}`);
      }

      // Test good conditions  
      if (activity.goodConditions?.length) {
        const goodScore = calculateConditionMatchScore(activity.goodConditions, testWeather);
        console.log(`👍 Good match score: ${goodScore.toFixed(3)}`);
        console.log(`   Good conditions: ${JSON.stringify(activity.goodConditions)}`);
      }

      // Test fair conditions
      if (activity.fairConditions?.length) {
        const fairScore = calculateConditionMatchScore(activity.fairConditions, testWeather);
        console.log(`👌 Fair match score: ${fairScore.toFixed(3)}`);
        console.log(`   Fair conditions: ${JSON.stringify(activity.fairConditions)}`);
      }

      // Predict the score based on the algorithm
      let predictedScore = 50;
      let predictedLevel = 'neutral';

      if (activity.poorConditions?.length) {
        const poorPenalty = calculatePoorConditionPenalty(activity.poorConditions, testWeather);
        if (poorPenalty > 0.7) {
          predictedScore = 8 + Math.random() * 12;
          predictedLevel = 'poor (dangerous)';
        }
      }

      if (predictedLevel !== 'poor (dangerous)') {
        // Check perfect
        if (activity.perfectConditions?.length) {
          const perfectScore = calculateConditionMatchScore(activity.perfectConditions, testWeather);
          if (perfectScore > 0.8) {
            predictedScore = 90 + perfectScore * 8;
            predictedLevel = 'perfect';
          }
        }

        // Check good
        if (predictedLevel !== 'perfect' && activity.goodConditions?.length) {
          const goodScore = calculateConditionMatchScore(activity.goodConditions, testWeather);
          if (goodScore > 0.5) {
            predictedScore = 68 + goodScore * 15;
            predictedLevel = 'good';
          }
        }

        // Check fair
        if (predictedLevel !== 'perfect' && predictedLevel !== 'good' && activity.fairConditions?.length) {
          const fairScore = calculateConditionMatchScore(activity.fairConditions, testWeather);
          if (fairScore > 0.3) {
            predictedScore = 45 + fairScore * 15;
            predictedLevel = 'fair';
          }
        }
      }

      console.log(`🎯 PREDICTED SCORE: ${Math.round(predictedScore)} (${predictedLevel})`);
    }

  } catch (error) {
    console.error('Error running test:', error);
  }
}

runTest();
