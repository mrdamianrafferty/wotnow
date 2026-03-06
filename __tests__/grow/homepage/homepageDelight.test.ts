import {
  getTimeGreeting,
  getSeasonalWisdom,
  getEncouragement,
  getTimeOfDayOverlay,
  getSunGlowOpacity,
  shouldShowRain,
  shouldShowFrost,
  updateStreak,
} from '../../../lib/grow/homepageDelight';

// ── getTimeGreeting ──────────────────────────────────────────────

describe('getTimeGreeting', () => {
  it('returns morning greeting between 5-8', () => {
    expect(getTimeGreeting(5)).toBe('Good morning, gardener');
    expect(getTimeGreeting(8)).toBe('Good morning, gardener');
  });

  it('returns afternoon greeting between 12-13', () => {
    expect(getTimeGreeting(12)).toBe('Afternoon in the garden');
    expect(getTimeGreeting(13)).toBe('Afternoon in the garden');
  });

  it('returns evening greeting between 17-19', () => {
    expect(getTimeGreeting(17)).toBe('Evening garden check');
    expect(getTimeGreeting(19)).toBe('Evening garden check');
  });

  it('returns night greeting for late hours', () => {
    expect(getTimeGreeting(20)).toBe('Garden at rest');
    expect(getTimeGreeting(23)).toBe('Garden at rest');
    expect(getTimeGreeting(2)).toBe('Garden at rest');
  });

  it('returns default "My Garden" for mid-morning/afternoon gaps', () => {
    expect(getTimeGreeting(9)).toBe('My Garden');
    expect(getTimeGreeting(10)).toBe('My Garden');
    expect(getTimeGreeting(15)).toBe('My Garden');
  });
});

// ── getSeasonalWisdom ────────────────────────────────────────────

describe('getSeasonalWisdom', () => {
  it('returns a non-empty string', () => {
    const result = getSeasonalWisdom(new Date(2026, 2, 6)); // March 6
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns March-specific wisdom in March', () => {
    const marchWisdom = [
      'The soil is waking up. Crocuses are pushing through, and the first queen bumblebees are out.',
      'March light is extraordinary',
      'Chit your potatoes on a windowsill',
    ];
    const result = getSeasonalWisdom(new Date(2026, 2, 6));
    expect(marchWisdom.some(w => result.includes(w.slice(0, 20)))).toBe(true);
  });

  it('returns different wisdom for different days in the same month', () => {
    // With 3 messages per month rotating by dayOfYear, different days should
    // produce at least 2 unique messages across a span
    const results = new Set<string>();
    for (let d = 1; d <= 7; d++) {
      results.add(getSeasonalWisdom(new Date(2026, 2, d)));
    }
    expect(results.size).toBeGreaterThanOrEqual(2);
  });
});

// ── getEncouragement ─────────────────────────────────────────────

describe('getEncouragement', () => {
  it('returns harvest celebration when plants are ready', () => {
    const result = getEncouragement({
      bedCount: 3, totalPlants: 5, readyToHarvest: 2, nearHarvest: 0,
    });
    expect(result).toContain('ready to harvest');
  });

  it('returns near-harvest message when close', () => {
    const result = getEncouragement({
      bedCount: 2, totalPlants: 4, readyToHarvest: 0, nearHarvest: 3,
    });
    expect(result).toContain('nearly ready');
  });

  it('returns seed prompt when no beds and no plants', () => {
    const result = getEncouragement({
      bedCount: 0, totalPlants: 0, readyToHarvest: 0, nearHarvest: 0,
    });
    expect(result).toContain('Every garden starts with one seed');
  });

  it('returns beds-waiting prompt when beds exist but empty', () => {
    const result = getEncouragement({
      bedCount: 3, totalPlants: 0, readyToHarvest: 0, nearHarvest: 0,
    });
    expect(result).toContain('Your beds are waiting');
  });

  it('returns small garden encouragement for < 3 plants', () => {
    const result = getEncouragement({
      bedCount: 1, totalPlants: 2, readyToHarvest: 0, nearHarvest: 0,
    });
    expect(result).toContain('Small gardens grow big');
  });

  it('returns real garden message for 10+ plants', () => {
    const result = getEncouragement({
      bedCount: 3, totalPlants: 12, readyToHarvest: 0, nearHarvest: 0,
    });
    expect(result).toContain('12 plants and counting');
  });

  it('returns null for mid-range garden with nothing special', () => {
    const result = getEncouragement({
      bedCount: 2, totalPlants: 5, readyToHarvest: 0, nearHarvest: 0,
    });
    expect(result).toBeNull();
  });

  it('prioritises harvest over near-harvest', () => {
    const result = getEncouragement({
      bedCount: 3, totalPlants: 10, readyToHarvest: 1, nearHarvest: 2,
    });
    expect(result).toContain('ready to harvest');
  });
});

// ── getTimeOfDayOverlay ──────────────────────────────────────────

describe('getTimeOfDayOverlay', () => {
  it('returns dawn gradient for early morning', () => {
    const result = getTimeOfDayOverlay(6);
    expect(result).toContain('linear-gradient');
    expect(result).toContain('251,191,36'); // golden dawn
  });

  it('returns morning gradient for 7-9', () => {
    const result = getTimeOfDayOverlay(8);
    expect(result).toContain('254,243,199');
  });

  it('returns subtle midday gradient for 10-15', () => {
    const result = getTimeOfDayOverlay(12);
    expect(result).toContain('255,255,255');
  });

  it('returns evening gradient for 16-18', () => {
    const result = getTimeOfDayOverlay(17);
    expect(result).toContain('251,146,60');
  });

  it('returns dusk gradient for 19-20', () => {
    const result = getTimeOfDayOverlay(19);
    expect(result).toContain('180,83,9');
  });

  it('returns night gradient for late hours', () => {
    const result = getTimeOfDayOverlay(23);
    expect(result).toContain('30,58,138');
  });
});

// ── getSunGlowOpacity ────────────────────────────────────────────

describe('getSunGlowOpacity', () => {
  it('returns minimum opacity for cold temps', () => {
    expect(getSunGlowOpacity(0)).toBe(0.03);
    expect(getSunGlowOpacity(5)).toBe(0.03);
  });

  it('scales up with temperature', () => {
    const cold = getSunGlowOpacity(10);
    const warm = getSunGlowOpacity(25);
    expect(warm).toBeGreaterThan(cold);
  });

  it('caps at 0.15 for very hot temps', () => {
    expect(getSunGlowOpacity(35)).toBe(0.15);
    expect(getSunGlowOpacity(50)).toBe(0.15);
  });
});

// ── shouldShowRain ───────────────────────────────────────────────

describe('shouldShowRain', () => {
  it('returns false for no precipitation', () => {
    expect(shouldShowRain(0)).toBe(false);
  });

  it('returns true for any precipitation', () => {
    expect(shouldShowRain(0.1)).toBe(true);
    expect(shouldShowRain(5)).toBe(true);
  });
});

// ── shouldShowFrost ──────────────────────────────────────────────

describe('shouldShowFrost', () => {
  it('returns true when air temp is below 0', () => {
    expect(shouldShowFrost(-1, 5)).toBe(true);
  });

  it('returns true when soil temp is below 3', () => {
    expect(shouldShowFrost(2, 2)).toBe(true);
  });

  it('returns false when both temps are safe', () => {
    expect(shouldShowFrost(5, 8)).toBe(false);
  });
});

// ── updateStreak ─────────────────────────────────────────────────

describe('updateStreak', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts a new streak on first visit', () => {
    const result = updateStreak();
    expect(result.count).toBe(1);
    expect(result.isNewDay).toBe(true);
  });

  it('returns same count on repeat visit same day', () => {
    updateStreak();
    const result = updateStreak();
    expect(result.count).toBe(1);
    expect(result.isNewDay).toBe(false);
  });

  it('increments streak on consecutive days', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    localStorage.setItem('gardenStreak', JSON.stringify({ lastDate: yesterday, count: 5 }));

    const result = updateStreak();
    expect(result.count).toBe(6);
    expect(result.isNewDay).toBe(true);
  });

  it('resets streak after a gap', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    localStorage.setItem('gardenStreak', JSON.stringify({ lastDate: twoDaysAgo, count: 10 }));

    const result = updateStreak();
    expect(result.count).toBe(1);
  });

  it('fires milestone on day 7', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    localStorage.setItem('gardenStreak', JSON.stringify({ lastDate: yesterday, count: 6 }));

    const result = updateStreak();
    expect(result.count).toBe(7);
    expect(result.milestone).toBe(7);
  });

  it('returns null milestone on non-milestone days', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    localStorage.setItem('gardenStreak', JSON.stringify({ lastDate: yesterday, count: 4 }));

    const result = updateStreak();
    expect(result.count).toBe(5);
    expect(result.milestone).toBeNull();
  });
});
