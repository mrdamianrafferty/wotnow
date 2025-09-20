import {
  SuggestionLike,
  uniqueByActivityId,
  selectWithVariety,
  recordHeroSelection,
} from './heroVariety';

/**
 * Choose the "hero" activity for a day, preferring outdoor and higher scores,
 * then apply variety rules from heroVariety to avoid repeating the same hero.
 *
 * Input "suggestions" should already be the day's scored activities.
 */
export function selectHeroActivity<T extends SuggestionLike>(
  suggestions: T[],
  _isEveningToday?: boolean
): T | null {
  if (!Array.isArray(suggestions) || suggestions.length === 0) return null;

  // 1) Deduplicate
  const unique = uniqueByActivityId(suggestions);

  // 2) Prefer outdoor categories first (perfect/good/fair/poor). Only if none exist, allow indoor.
  const isOutdoor = (lvl: string) => lvl === 'perfect' || lvl === 'good' || lvl === 'fair' || lvl === 'poor';
  const outdoor = unique.filter((s) => isOutdoor(s.evaluation));
  const indoor = unique.filter((s) => !isOutdoor(s.evaluation));

  // 3) Sort by score desc for both pools
  outdoor.sort((a, b) => b.score - a.score);
  indoor.sort((a, b) => b.score - a.score);

  // 4) Choose pool
  const pool = outdoor.length > 0 ? outdoor : indoor;

  // 5) Apply variety choice
  const chosen = selectWithVariety(pool);
  if (!chosen) return null;

  // 6) Record the selection for future variety
  recordHeroSelection(chosen.activityId);

  return chosen;
}
