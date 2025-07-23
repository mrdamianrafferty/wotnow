// src/utils/matchScore.ts
export function matchScore(activityTags: string[], contextTags: string[]): number {
  const WEEK_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  let score = 0;
  for (const tag of activityTags) {
    if (!contextTags.includes(tag)) continue;
    // 5 points for a direct weekday match, 1 for everything else
    score += WEEK_DAYS.includes(tag) ? 5 : 1;
  }
  return score;
}
