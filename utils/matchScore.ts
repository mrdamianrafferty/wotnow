// utils/matchScore.ts
export function matchScore(activityTags: string[] = [], contextTags: string[] = []): number {
  return activityTags.reduce((score, tag) => score + contextTags.includes(tag), 0);
}
