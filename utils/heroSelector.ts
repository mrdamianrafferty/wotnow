export function selectHeroActivity(
  suggestions: Suggestion[],
  isEvening: boolean
): Suggestion | null {
  if (suggestions.length === 0) return null;

  const sorted = suggestions.slice().sort((a, b) => b.score - a.score);

  const thresholds = isEvening ? 
    { perfect: 70, good: 50, acceptable: 25 } : 
    { perfect: 80, good: 60, acceptable: 30 };

  const perfect = sorted.filter(s => s.score >= thresholds.perfect);
  const good = sorted.filter(s => s.score >= thresholds.good && s.score < thresholds.perfect);
  const acceptable = sorted.filter(s => s.score >= thresholds.acceptable && s.score < thresholds.good);
  const indoor = sorted
    .filter(s => s.evaluation === 'indoor' && s.score >= thresholds.acceptable)
    .sort((a, b) => b.score - a.score);

  if (perfect.length > 0) {
    console.log(`🌟 Hero: Perfect activity selected - ${perfect[0].activityId} (${perfect[0].score})`);
    return perfect[0];
  }

  if (good.length > 0) {
    console.log(`👍 Hero: Good activity selected - ${good[0].activityId} (${good[0].score})`);
    return good[0];
  }

  if (acceptable.length > 0) {
    console.log(`🤔 Hero: Acceptable activity selected - ${acceptable[0].activityId} (${acceptable[0].score})`);
    return acceptable[0];
  }

  if (indoor.length > 0) {
    console.log(`🏠 Hero: Indoor fallback selected - ${indoor[0].activityId} (${indoor[0].score})`);
    return indoor[0];
  }

  console.log(`⚠️ Hero: Emergency fallback - ${sorted[0].activityId} (${sorted[0].score})`);
  return sorted[0];
}
