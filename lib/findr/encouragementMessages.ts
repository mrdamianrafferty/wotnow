/**
 * Fish Count Encouragement Messages
 *
 * Dynamic motivational messages based on total catch count.
 * Used in the Trophy Gallery to encourage anglers at different milestones.
 */

interface EncouragementTier {
  min: number;
  max: number;
  messages: string[];
}

interface MilestoneMessage {
  count: number;
  message: string;
}

const ENCOURAGEMENT_TIERS: EncouragementTier[] = [
  { min: 0, max: 0, messages: [
    "Time to wet a line!",
    "Let's get fishing!",
    "Your first catch awaits!",
    "The sea is calling!",
    "Adventure begins now!"
  ]},
  { min: 1, max: 1, messages: ["First one's always special!"] },
  { min: 2, max: 5, messages: [
    "Great start, keep going!",
    "Building momentum!",
    "Off to a good start!",
    "The journey begins!"
  ]},
  { min: 6, max: 10, messages: ["Double digits incoming!"] },
  { min: 11, max: 20, messages: [
    "You're getting the hang of it!",
    "Fish love you!",
    "On a roll!",
    "Keep them coming!"
  ]},
  { min: 21, max: 30, messages: ["Respectable haul!"] },
  { min: 31, max: 40, messages: ["Impressive dedication!"] },
  { min: 41, max: 60, messages: ["Seasoned angler!"] },
  { min: 61, max: 80, messages: ["Master at work!"] },
  { min: 81, max: 99, messages: ["Century within reach!"] },
  { min: 100, max: 150, messages: ["Triple digits club!"] },
  { min: 151, max: 250, messages: ["Absolute machine!"] },
  { min: 251, max: 350, messages: ["Living the dream!"] },
  { min: 351, max: 450, messages: ["500 club awaits!"] },
  { min: 451, max: 750, messages: ["Pro league territory!"] },
  { min: 751, max: 999, messages: ["Four digits calling!"] },
];

const MILESTONE_MESSAGES: MilestoneMessage[] = [
  { count: 50, message: "Half century! 🎉" },
  { count: 100, message: "Century club! 💯" },
  { count: 200, message: "Double century! 🏆" },
  { count: 365, message: "One a day! 📅" },
  { count: 500, message: "Legend status! 👑" },
  { count: 1000, message: "Four digits! 🌟" },
  { count: 2000, message: "2K elite! 🔥" },
  { count: 5000, message: "5K master! 🐟👑" },
];

export function getFishingEncouragement(count: number): string {
  // Check for exact milestones first
  const milestone = MILESTONE_MESSAGES.find(m => m.count === count);
  if (milestone) return milestone.message;

  // Handle very high numbers
  if (count >= 1000) {
    const thousands = Math.floor(count / 1000);
    if (thousands === 1) return "Legendary angler!";
    return `${thousands}K catches! 🐟👑`;
  }

  // Find appropriate tier
  const tier = ENCOURAGEMENT_TIERS.find(t => count >= t.min && count <= t.max);
  if (tier) {
    // Return random message from tier (use first for consistency in SSR)
    // For client-side randomness, you can use Math.random()
    return tier.messages[0];
  }

  return "Keep fishing!";
}

// Export for testing
export { ENCOURAGEMENT_TIERS, MILESTONE_MESSAGES };
