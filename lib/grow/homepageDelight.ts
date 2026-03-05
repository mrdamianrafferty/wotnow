/**
 * Homepage delight helpers — time-of-day greetings, seasonal wisdom,
 * encouragement engine, and weather-driven atmosphere.
 */

// ── Time-of-day greeting ──────────────────────────────────────────
export function getTimeGreeting(hour?: number): string {
  const h = hour ?? new Date().getHours();
  if (h >= 5 && h < 9) return 'Good morning, gardener';
  if (h >= 12 && h < 14) return 'Afternoon in the garden';
  if (h >= 17 && h < 20) return 'Evening garden check';
  if (h >= 20 || h < 5) return 'Garden at rest';
  return 'My Garden';
}

// ── Seasonal wisdom (3 per month, UK-specific) ────────────────────
const WISDOM: Record<number, string[]> = {
  1: [
    'The days are already longer than at the solstice. The snowdrops know.',
    'Bare soil can still be worked if not frozen. Spread compost and let the worms dig.',
    'Hellebores are flowering in the cold \u2014 one of the bravest plants in the garden.',
  ],
  2: [
    'Hazel catkins are the first real sign \u2014 golden pendants swaying. The bees will visit on a mild day.',
    'Soil temperatures are at their lowest. Patience. But broad beans can go under cover.',
    'The blackbirds have started singing at dusk. The winter is turning.',
  ],
  3: [
    'The soil is waking up. Crocuses are pushing through, and the first queen bumblebees are out.',
    'March light is extraordinary \u2014 low and golden, different to summer. Take a moment to look.',
    'Chit your potatoes on a windowsill. In a few weeks they\u2019ll be ready to go in.',
  ],
  4: [
    'The last frost can still bite in April. Don\u2019t rush tender crops out just yet.',
    'Blackthorn is flowering before its leaves \u2014 a cloud of white along hedgerows.',
    'The dawn chorus peaks this month. It\u2019s worth one early morning. Just once.',
  ],
  5: [
    'The last frost date has likely passed. Harden off your tender plants \u2014 they\u2019ve waited long enough.',
    'May is when a garden overtakes the gardener. That\u2019s exactly as it should be.',
    'Chelsea chop time \u2014 cut back perennials by a third for bushier plants and staggered flowering.',
  ],
  6: [
    'The longest day is near. Not the hottest \u2014 but the pivot point of the year.',
    'Strawberries and elderflower at the same time. One of the great moments of the garden year.',
    'Watch for vine weevil \u2014 notched leaf edges are the sign. Nematodes now, before larvae hatch.',
  ],
  7: [
    'Walk the garden every morning. Early intervention on pests saves a lot of heartache.',
    'Keep cutting sweetpeas \u2014 they stop flowering if they set seed. Give bunches away.',
    'Mulch bare soil and water in the morning so it reaches the roots, not the leaves.',
  ],
  8: [
    'The garden is at its most abundant and its most exhausted. Tend both things at once.',
    'Sow lamb\u2019s lettuce and spinach now. You\u2019ll be grateful in November.',
    'Pick runner beans every two days \u2014 miss one and the plant thinks it\u2019s done.',
  ],
  9: [
    'September light is extraordinary \u2014 mellower than summer, gold through the leaves.',
    'Collect seed from your best plants now. Label immediately \u2014 you won\u2019t remember in February.',
    'Cure squash in a sunny spot for 10 days before storing. It extends keeping time dramatically.',
  ],
  10: [
    'Lift dahlia tubers within a day of the first frost. Store frost-free \u2014 they\u2019ll reward you next year.',
    'Now is the best time to plant bare-root trees. The ground is warm enough for roots to settle.',
    'Fallen leaves aren\u2019t waste \u2014 they\u2019re free leaf mould. Collect them into wire cages or bin bags.',
  ],
  11: [
    'Garlic goes in now \u2014 the cold triggers bulb development. Essentially something for nothing.',
    'Leave the stems \u2014 seed heads are shelter for overwintering insects. The garden is quieter but not done.',
    'Broad beans sown now will crop three weeks earlier than spring-sown. Aquadulce Claudia is the classic.',
  ],
  12: [
    'After the shortest day, the light begins to return. The seed catalogues have already arrived.',
    'This is the season of planning. Sketch your beds, rotate your crops on paper. Next year starts now.',
    'Witch hazel flowers in bare winter \u2014 spidery blooms, faintly scented. A plant that earns its keep.',
  ],
};

export function getSeasonalWisdom(date?: Date): string {
  const d = date ?? new Date();
  const month = d.getMonth() + 1;
  const dayOfYear = Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const messages = WISDOM[month] || WISDOM[1];
  return messages[dayOfYear % messages.length];
}

// ── Encouragement engine ──────────────────────────────────────────
interface EncouragementInput {
  bedCount: number;
  totalPlants: number;
  readyToHarvest: number;
  nearHarvest: number; // within 7 days
}

export function getEncouragement(input: EncouragementInput): string | null {
  const { bedCount, totalPlants, readyToHarvest, nearHarvest } = input;

  if (readyToHarvest > 0) {
    return `${readyToHarvest} plant${readyToHarvest > 1 ? 's' : ''} ready to harvest. What a day!`;
  }
  if (nearHarvest > 0) {
    return `Almost there \u2014 ${nearHarvest} plant${nearHarvest > 1 ? 's' : ''} nearly ready.`;
  }
  if (totalPlants === 0 && bedCount === 0) {
    return 'Every garden starts with one seed. Ready to plant?';
  }
  if (totalPlants === 0 && bedCount > 0) {
    return 'Your beds are waiting. The best time to plant is now.';
  }
  if (totalPlants < 3) {
    return 'Small gardens grow big. You\u2019re on your way.';
  }
  if (totalPlants >= 10) {
    return `${totalPlants} plants and counting. You have a real garden.`;
  }
  return null;
}

// ── Time-of-day background overlay ────────────────────────────────
export function getTimeOfDayOverlay(hour?: number): string {
  const h = hour ?? new Date().getHours();
  if (h >= 5 && h < 7) {
    return 'linear-gradient(180deg, rgba(251,191,36,0.08) 0%, rgba(253,186,116,0.05) 50%, transparent)';
  }
  if (h >= 7 && h < 10) {
    return 'linear-gradient(180deg, rgba(254,243,199,0.10) 0%, rgba(254,249,195,0.05) 60%, transparent)';
  }
  if (h >= 10 && h < 16) {
    return 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 30%)';
  }
  if (h >= 16 && h < 19) {
    return 'linear-gradient(180deg, rgba(251,146,60,0.06) 0%, rgba(253,186,116,0.04) 50%, transparent)';
  }
  if (h >= 19 && h < 21) {
    return 'linear-gradient(180deg, rgba(180,83,9,0.07) 0%, rgba(99,102,241,0.04) 80%, transparent)';
  }
  // Night
  return 'linear-gradient(180deg, rgba(30,58,138,0.08) 0%, rgba(30,41,59,0.06) 60%, transparent)';
}

// ── Weather atmosphere helpers ────────────────────────────────────
export function getSunGlowOpacity(tempC: number): number {
  // Scales from 0.03 at 5C to 0.15 at 30C+
  return Math.min(0.15, Math.max(0.03, 0.03 + (tempC - 5) * 0.005));
}

export function shouldShowRain(precipitation: number): boolean {
  return precipitation > 0;
}

export function shouldShowFrost(
  airTempMin: number,
  soilTemp: number,
): boolean {
  return airTempMin < 0 || soilTemp < 3;
}

// ── Daily streak ──────────────────────────────────────────────────
const STREAK_KEY = 'gardenStreak';

interface StreakData {
  lastDate: string;
  count: number;
}

export function updateStreak(): { count: number; isNewDay: boolean; milestone: number | null } {
  if (typeof window === 'undefined') return { count: 0, isNewDay: false, milestone: null };

  const today = new Date().toISOString().slice(0, 10);
  let stored: StreakData = { lastDate: '', count: 0 };
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch { /* corrupt data */ }

  if (stored.lastDate === today) {
    return { count: stored.count, isNewDay: false, milestone: null };
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newCount = stored.lastDate === yesterday ? stored.count + 1 : 1;

  localStorage.setItem(STREAK_KEY, JSON.stringify({ lastDate: today, count: newCount }));

  const milestones = [3, 7, 14, 30, 60, 100, 365];
  const milestone = milestones.includes(newCount) ? newCount : null;

  return { count: newCount, isNewDay: true, milestone };
}
