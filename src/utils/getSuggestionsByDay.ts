import { evaluateCondition } from './activitySuitability';
export function getSuggestionsByDay({ forecast = [], interests = [], activities = [] }) {
  console.debug("getSuggestionsByDay called with:", { forecast, interests, activities });
  

  if (!Array.isArray(activities)) {
    console.error("🚨 activities argument is not an array. Received:", activities);
    if (activities && Array.isArray(activities.activities)) {
      console.warn("⚠️ Unwrapping activities.activities property");
      activities = activities.activities;
    } else {
      return [];
    }
  }

  if (!Array.isArray(forecast)) {
    console.error("🚨 forecast argument is not an array. Received:", forecast);
    return [];
  }

  return forecast.map(day => {
    const weather = day.weather || {};

    // Priority buckets
    const perfectOutdoor: { activityId: string, evaluation: string }[] = [];
    const goodOutdoor: { activityId: string, evaluation: string }[] = [];
    const indoorAlternativesNames: string[] = [];
    const userIndoor: { activityId: string, evaluation: string }[] = [];

    // First pass: collect activities by type and suitability
    activities.forEach(activity => {
      const isInterest = interests.includes(activity.id);
      const isOutdoor = activity.secondaryCategory === 'Outdoor';
      const isIndoor = activity.secondaryCategory === 'Indoor';
      if (!isInterest) return;
      const currentMonth = new Date(day.date).getMonth() + 1; // JS months are 0-based
      if (activity.seasonalMonths && !activity.seasonalMonths.includes(currentMonth)) {
        console.debug(`Activity '${activity.id}' skipped because it is out of season.`);
        return;
      }

      if (isOutdoor) {
        // Check poor conditions first
        let poor = false;
        if (activity.poorConditions && activity.poorConditions.length > 0) {
          poor = activity.poorConditions.some(c => {
            const res = evaluateCondition(c, weather);
            console.debug(`Checking poor condition '${c}' for activity '${activity.id}': ${res}`);
            return res;
          });
          if (poor) {
            console.debug(`Activity '${activity.id}' skipped due to poor condition.`);
            return; // skip activity entirely
          }
        }

        // Check perfect conditions
        let perfect = false;
        if (activity.perfectConditions && activity.perfectConditions.length > 0) {
          perfect = activity.perfectConditions.every(c => {
            const res = evaluateCondition(c, weather);
            console.debug(`Checking perfect condition '${c}' for activity '${activity.id}': ${res}`);
            return res;
          });
          if (perfect) {
            console.debug(`Activity '${activity.id}' added as perfect.`);
            perfectOutdoor.push({ activityId: activity.id, evaluation: 'perfect' });
            return;
          }
        }
        // Check good conditions (relaxed: at least 66% must pass)
        let good = false;
        if (activity.goodConditions && activity.goodConditions.length > 0) {
          const passed = activity.goodConditions.filter(c => {
            const res = evaluateCondition(c, weather);
            console.debug(`Checking good condition '${c}' for activity '${activity.id}': ${res}`);
            return res;
          }).length;

          const ratio = passed / activity.goodConditions.length;

          if (ratio >= 0.33) {
            good = true;
            console.debug(`Activity '${activity.id}' added as good (passed ${passed}/${activity.goodConditions.length}).`);
            goodOutdoor.push({ activityId: activity.id, evaluation: 'good' });
            return;
          }
        }
        // If no perfect/good, and no poor detected earlier, add as acceptable
        if (!perfect && !good && !poor) {
          console.debug(`Activity '${activity.id}' added as acceptable.`);
          goodOutdoor.push({ activityId: activity.id, evaluation: 'acceptable' });
          return;
        }
        // If no perfect/good/acceptable, collect indoor alternative name if available
        if (activity.indoorAlternative) {
          indoorAlternativesNames.push(activity.indoorAlternative);
        }
      } else if (isIndoor) {
        userIndoor.push({ activityId: activity.id, evaluation: 'indoor' });
      }
    });

    // Combine in priority order:
    let combined: { activityId: string, evaluation: string }[] = [
      ...perfectOutdoor,
      ...goodOutdoor
    ];

    // Add indoor alternatives (by name) if still under 10
    if (combined.length < 10 && indoorAlternativesNames.length > 0) {
      for (const altName of indoorAlternativesNames) {
        // Find the activity in activities by name
        const altActivity = activities.find(a => a.name === altName);
        if (altActivity) {
          combined.push({ activityId: altActivity.id, evaluation: 'indoorAlternative' });
          if (combined.length >= 10) break;
        }
      }
    }

    // Add user's own indoor activities if still under 10
    if (combined.length < 10 && userIndoor.length > 0) {
      for (const indoor of userIndoor) {
        combined.push(indoor);
        if (combined.length >= 10) break;
      }
    }

    return {
      date: day.date,
      suggestions: combined.slice(0, 10)
    };
  });
}
