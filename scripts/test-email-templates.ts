/**
 * Test script to send sample emails for visual review
 * Usage: TEST_EMAIL=your@email.com npx tsx scripts/test-email-templates.ts
 */

import { Resend } from 'resend';
import {
  generateWeeklyForecastHTMLV2,
  generateWeeklyForecastTextV2,
  generateDailyDigestHTMLV2,
  generateDailyDigestTextV2,
  type WeeklyForecastDataEnhanced,
  type DailyDigestDataV2,
} from '../lib/findr/emailTemplates';
import { SPECIES_IMAGE_MAP } from '../data/speciesImageMap';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL || 'damian@flyglobalmusic.com';

if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY not set');
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

// Helper to get species image URL - use thumb for email (smaller, square)
const getSpeciesImage = (code: string): string => {
  const info = SPECIES_IMAGE_MAP[code];
  return info?.thumb || info?.mobile || info?.image || '/webp/default-fish.webp';
};

// Sample Weekly Forecast V2 Data
const weeklyData: WeeklyForecastDataEnhanced = {
  userName: 'Damian',
  weekStart: 'Week of January 6, 2025',
  locationName: 'Irish Sea',
  rectangleCode: '31F2',
  species: [],
  starSpecies: [
    {
      speciesName: 'European Sea Bass',
      speciesCode: 'BSS',
      imageUrl: getSpeciesImage('BSS'),
      playfulBio: 'The silver ghost of the shallows - smart, fast, and always hungry at dawn.',
      scientificName: 'Dicentrarchus labrax',
      guild: 'surf_estuary',
      badges: [
        { key: 'gamefish', emoji: '🏆', label: 'Gamefish' },
        { key: 'shore', emoji: '🏖️', label: 'Shore Catch' },
      ],
      recommendedBaits: ['Sandeel', 'Mackerel strips', 'Ragworm'],
      bestTime: 'Dawn and dusk',
      tideSensitivity: 'Best on flood tide, 2 hours before high',
      effectiveTechnique: 'Spinning with lures or float fishing',
      funFact: 'Bass can live for over 25 years and remember feeding spots!',
      forecast: [
        { date: 'Mon 6', confidence: 72 },
        { date: 'Tue 7', confidence: 78 },
        { date: 'Wed 8', confidence: 88 },
        { date: 'Thu 9', confidence: 85 },
        { date: 'Fri 10', confidence: 76 },
        { date: 'Sat 11', confidence: 68 },
        { date: 'Sun 12', confidence: 65 },
      ],
      peakDay: 'Wednesday',
      peakConfidence: 88,
    },
  ],
  environmental: {
    seaTempC: 11.2,
    seaTempTrend: 'stable',
    waterClarity: 'good',
    tidePattern: 'spring',
    pressureHpa: 1018,
    pressureTrend: 'rising',
    waveHeightM: 0.8,
    moonPhase: 'Waxing Gibbous',
    moonIllumination: 72,
    overallRating: 'good',
    bestDaysOfWeek: ['Wednesday', 'Thursday'],
    conditionsSummary: 'Good conditions expected this week. Rising pressure and spring tides create excellent opportunities mid-week.',
  },
  tactical: {
    topBaits: ['Sandeel', 'Ragworm', 'Mackerel strips', 'Lugworm'],
    topTechniques: ['Spinning', 'Float fishing', 'Ledgering'],
    tideAdvice: 'Fish the flood tide for best results, especially 2 hours before high water.',
    timeAdvice: 'Dawn and dusk show peak activity. Early morning sessions recommended.',
  },
  tackleShops: [
    {
      name: 'Skerries Bait & Tackle',
      address: 'Harbour Road, Skerries, Co. Dublin',
      distance: '3.2km',
      rating: 4.7,
      totalRatings: 89,
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Skerries+Bait+Tackle',
    },
    {
      name: 'Dublin Angling Centre',
      address: '15 Main Street, Howth, Dublin',
      distance: '12.5km',
      rating: 4.5,
      totalRatings: 156,
      mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Dublin+Angling+Centre',
    },
  ],
};

// Sample Daily Digest V2 Data (GO verdict)
const dailyDataGo: DailyDigestDataV2 = {
  userName: 'Damian',
  date: 'Wednesday, January 8, 2025',
  locationName: 'Irish Sea',
  rectangleCode: '31F2',
  verdict: 'go',
  verdictScore: 84,
  verdictReason: '88% Sea Bass + rising pressure = perfect conditions',
  topSpecies: {
    speciesName: 'European Sea Bass',
    speciesCode: 'BSS',
    confidence: 88,
    imageUrl: getSpeciesImage('BSS'),
    guild: 'surf_estuary',
    approach: 'Spinning from rocky shoreline at dawn',
    baits: ['Sandeel', 'Mackerel strips', 'White soft plastics'],
    technique: 'Spinning with lures',
    tideAdvice: 'Fish the last 2 hours of flood tide for best results',
  },
  alternatives: [
    { speciesName: 'Pollack', confidence: 76, guild: 'reef_kelp' },
    { speciesName: 'Mackerel', confidence: 72, guild: 'pelagic' },
  ],
  optimalWindow: {
    start: '6:00 AM',
    end: '9:00 AM',
    duration: '3 hours',
    reason: 'Dawn + tide alignment',
    highTide: '7:45 AM',
    lowTide: '1:30 PM',
    sunrise: '8:42 AM',
    sunset: '4:28 PM',
  },
  conditions: {
    seaTempC: 11.2,
    waveHeightM: 0.8,
    waterClarity: 'good',
    pressureTrend: 'rising',
    moonPhase: 'Waxing Gibbous',
    moonIllumination: 72,
    windSpeedKts: 8,
  },
  nearestShop: {
    name: 'Skerries Bait & Tackle',
    address: 'Harbour Road, Skerries, Co. Dublin',
    distance: '3.2km',
    rating: 4.7,
    totalRatings: 89,
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Skerries+Bait+Tackle',
  },
};

// Sample Daily Digest V2 Data (GOOD verdict)
const dailyDataGood: DailyDigestDataV2 = {
  userName: 'Damian',
  date: 'Thursday, January 9, 2025',
  locationName: 'Irish Sea',
  rectangleCode: '31F2',
  verdict: 'good',
  verdictScore: 68,
  verdictReason: '72% Pollack in good conditions',
  topSpecies: {
    speciesName: 'Pollack',
    speciesCode: 'POL',
    confidence: 72,
    imageUrl: getSpeciesImage('POL'),
    guild: 'reef_kelp',
    approach: 'Jigging over reef structure',
    baits: ['Rubber shads', 'Feathers', 'Live sandeel'],
    technique: 'Jigging',
    tideAdvice: 'Best around slack water',
  },
  alternatives: [
    { speciesName: 'Mackerel', confidence: 70, guild: 'pelagic' },
  ],
  optimalWindow: {
    start: '4:00 PM',
    end: '7:00 PM',
    duration: '3 hours',
    reason: 'Dusk + slack water',
    highTide: '2:15 PM',
    lowTide: '8:30 PM',
    sunrise: '8:41 AM',
    sunset: '4:29 PM',
  },
  conditions: {
    seaTempC: 11.0,
    waveHeightM: 1.2,
    waterClarity: 'moderate',
    pressureTrend: 'stable',
    moonPhase: 'Waxing Gibbous',
    moonIllumination: 80,
    windSpeedKts: 12,
  },
  nearestShop: {
    name: 'Skerries Bait & Tackle',
    address: 'Harbour Road, Skerries, Co. Dublin',
    distance: '3.2km',
    rating: 4.7,
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Skerries+Bait+Tackle',
  },
};

async function sendTestEmails() {
  console.log('📧 Sending test emails to:', TEST_EMAIL);

  // Send Weekly Forecast V2
  console.log('\n1. Sending Weekly Forecast V2...');
  try {
    const weeklyResult = await resend.emails.send({
      from: 'Findr <notifications@fishfindr.eu>',
      to: TEST_EMAIL,
      subject: '📅 TEST: Your Week on the Water - Weekly Forecast V2',
      html: generateWeeklyForecastHTMLV2(weeklyData),
      text: generateWeeklyForecastTextV2(weeklyData),
    });
    console.log('   ✅ Weekly Forecast V2 sent:', weeklyResult.data?.id);
  } catch (error) {
    console.error('   ❌ Weekly Forecast V2 failed:', error);
  }

  // Send Daily Digest V2 (GO verdict)
  console.log('\n2. Sending Daily Digest V2 (GO verdict)...');
  try {
    const dailyResult = await resend.emails.send({
      from: 'Findr <notifications@fishfindr.eu>',
      to: TEST_EMAIL,
      subject: '🎯 TEST: GO FISH! Sea Bass at 88% today',
      html: generateDailyDigestHTMLV2(dailyDataGo),
      text: generateDailyDigestTextV2(dailyDataGo),
    });
    console.log('   ✅ Daily Digest V2 (GO) sent:', dailyResult.data?.id);
  } catch (error) {
    console.error('   ❌ Daily Digest V2 (GO) failed:', error);
  }

  // Send Daily Digest V2 (GOOD verdict)
  console.log('\n3. Sending Daily Digest V2 (GOOD verdict)...');
  try {
    const goodResult = await resend.emails.send({
      from: 'Findr <notifications@fishfindr.eu>',
      to: TEST_EMAIL,
      subject: '👍 TEST: Good fishing day - Pollack at 72%',
      html: generateDailyDigestHTMLV2(dailyDataGood),
      text: generateDailyDigestTextV2(dailyDataGood),
    });
    console.log('   ✅ Daily Digest V2 (GOOD) sent:', goodResult.data?.id);
  } catch (error) {
    console.error('   ❌ Daily Digest V2 (GOOD) failed:', error);
  }

  console.log('\n✨ Done! Check your inbox at', TEST_EMAIL);
}

sendTestEmails();
