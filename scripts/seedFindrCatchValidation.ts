#!/usr/bin/env tsx
/**
 * Seed Findr validation tables with realistic test data
 * Creates linked impression and catch data for testing validation queries
 */

import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envLocalPath });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Mock species data matching your existing log.tsx
const mockSpecies = [
  { id: 'DICL', name: 'Dicentrarchus labrax', common: 'Sea Bass' },
  { id: 'SCSC', name: 'Scomber scombrus', common: 'Mackerel' },
  { id: 'MEME', name: 'Merlangius merlangus', common: 'Whiting' },
  { id: 'POPO', name: 'Pollachius pollachius', common: 'Pollack' },
  { id: 'GAMO', name: 'Gadus morhua', common: 'Atlantic Cod' },
];

const mockRectangles = ['VIIIc', 'VIIa', 'IVc', 'VIIe', 'VIId'];

async function getAvailableRectangles(): Promise<string[]> {
  console.log('Fetching available rectangles...');
  const { data, error } = await client
    .from('findr_rectangles')
    .select('rectangle_code')
    .limit(10);
  
  if (error || !data || data.length === 0) {
    console.warn('No rectangles found in findr_rectangles, using mock rectangles:', mockRectangles);
    return mockRectangles;
  }
  
  const rectangles = data.map(r => r.rectangle_code);
  console.log(`Found ${rectangles.length} rectangles:`, rectangles.slice(0, 5));
  return rectangles;
}
const mockBaits = ['ragworm', 'lugworm', 'mackerel strip', 'live shrimp', 'prawns', 'crab'];
const mockHabitats = ['rocky_shore', 'sandy_beach', 'pier_harbor', 'shallow_water'];

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomDate(daysAgo: number): Date {
  const now = new Date();
  const randomDays = Math.random() * daysAgo;
  return new Date(now.getTime() - randomDays * 24 * 60 * 60 * 1000);
}

// Generate realistic ranked species for prediction impressions
function generateRankedSpecies(): any[] {
  const shuffledSpecies = [...mockSpecies].sort(() => Math.random() - 0.5);
  const numSpecies = 3 + Math.floor(Math.random() * 3); // 3-5 species
  
  return shuffledSpecies.slice(0, numSpecies).map((species, index) => ({
    species_id: species.id,
    species_name: species.common,
    rank: index + 1,
    confidence: Math.floor(95 - index * 10 - Math.random() * 10), // Decreasing confidence by rank
    urgency: index === 0 ? 'high' : index === 1 ? 'medium' : 'low'
  }));
}

function generateEnvironmentalSnapshot(): any {
  return {
    sea_temp: 12 + Math.random() * 10,
    tide_phase: randomChoice(['high', 'low', 'rising', 'falling']),
    wind_speed: 5 + Math.random() * 15,
    wave_height: 0.5 + Math.random() * 2,
    salinity: 34 + Math.random() * 2
  };
}

async function createTestUser(): Promise<string> {
  console.log('Creating test user...');
  
  // Create a test user via auth admin API
  const { data: authData, error: authError } = await client.auth.admin.createUser({
    email: `findr-test-${Date.now()}@example.com`,
    password: 'test-password-123',
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`);
  }

  console.log(`Created test user: ${authData.user.id}`);
  return authData.user.id;
}

async function seedValidationData() {
  console.log('🌱 Seeding Findr validation data...');
  
  try {
    // Get available rectangles first
    const availableRectangles = await getAvailableRectangles();
    
    // Create test user
    const userId = await createTestUser();
    
    console.log('Creating prediction impressions...');
    const impressions: any[] = [];
    
    // Create 20 impressions over the last 30 days
    for (let i = 0; i < 20; i++) {
      const viewedAt = randomDate(30);
      const impression = {
        user_id: userId,
        rectangle_code: randomChoice(availableRectangles),
        viewed_at: viewedAt.toISOString(),
        prediction_date: viewedAt.toISOString().split('T')[0], // Same day predictions
        ranked_species: generateRankedSpecies(),
        environmental_snapshot: generateEnvironmentalSnapshot(),
        urgency_level: randomChoice(['high', 'medium', 'low']),
        source: 'findr-api-v1'
      };
      impressions.push(impression);
    }
    
    const { data: impressionData, error: impressionError } = await client
      .from('findr_prediction_impressions')
      .insert(impressions)
      .select('id, ranked_species, viewed_at');
    
    if (impressionError) {
      throw new Error(`Failed to create impressions: ${impressionError.message}`);
    }
    
    console.log(`✅ Created ${impressionData.length} prediction impressions`);
    
    console.log('Creating catch entries...');
    const catches: any[] = [];
    
    // Create catches for about 60% of impressions (some successful, some blanks)
    const successfulImpressions = impressionData.slice(0, Math.floor(impressionData.length * 0.6));
    
    for (const impression of successfulImpressions) {
      const numCatches = Math.random() < 0.8 ? 1 + Math.floor(Math.random() * 2) : 0; // 80% success rate
      
      if (numCatches === 0) {
        // Blank trip
        const caughtAt = new Date(impression.viewed_at);
        caughtAt.setHours(caughtAt.getHours() + 1 + Math.random() * 4); // 1-5 hours after viewing
        
        catches.push({
          user_id: userId,
          species_id: 'BLANK',
          species_common_name: 'No catch',
          rectangle_code: randomChoice(availableRectangles),
          prediction_impression_id: impression.id,
          caught_at: caughtAt.toISOString(),
          quantity: 0,
          is_blank_trip: true,
          followed_findr_advice: true,
          bait_used: randomChoice(mockBaits),
          notes: 'Tried for a few hours but no luck. Water seemed quiet.'
        });
      } else {
        // Successful catches
        for (let i = 0; i < numCatches; i++) {
          const caughtAt = new Date(impression.viewed_at);
          caughtAt.setHours(caughtAt.getHours() + 1 + Math.random() * 6); // 1-7 hours after viewing
          
          // 70% chance the caught species was in the top 3 predictions (validation success)
          const wasInPredictions = Math.random() < 0.7;
          let caughtSpecies;
          
          if (wasInPredictions && impression.ranked_species.length > 0) {
            // Pick from top 3 predicted species
            const topPredictions = impression.ranked_species.slice(0, 3);
            const predictedSpecies = randomChoice(topPredictions) as any;
            caughtSpecies = mockSpecies.find(s => s.id === predictedSpecies.species_id) || randomChoice(mockSpecies);
          } else {
            // Random species (prediction miss)
            caughtSpecies = randomChoice(mockSpecies);
          }
          
          const bait = randomChoice(mockBaits);
          const habitat = randomChoice(mockHabitats);
          
          catches.push({
            user_id: userId,
            species_id: caughtSpecies.id,
            species_common_name: caughtSpecies.common,
            scientific_name: caughtSpecies.name,
            rectangle_code: randomChoice(availableRectangles),
            prediction_impression_id: impression.id,
            caught_at: caughtAt.toISOString(),
            quantity: 1 + Math.floor(Math.random() * 3),
            size_category: randomChoice(['small', 'average', 'large']),
            bait_used: bait,
            habitat_type: habitat,
            followed_findr_advice: Math.random() < 0.8, // 80% followed advice
            used_recommended_bait: Math.random() < 0.6, // 60% used recommended bait
            used_recommended_habitat: Math.random() < 0.7, // 70% used recommended habitat
            environmental_conditions: generateEnvironmentalSnapshot(),
            notes: `Great session! ${caughtSpecies.common} was active around ${habitat.replace('_', ' ')}.`
          });
        }
      }
    }
    
    // Add some catches without linked impressions (caught without using Findr)
    for (let i = 0; i < 5; i++) {
      const caughtSpecies = randomChoice(mockSpecies);
      catches.push({
        user_id: userId,
        species_id: caughtSpecies.id,
        species_common_name: caughtSpecies.common,
        scientific_name: caughtSpecies.name,
        rectangle_code: randomChoice(availableRectangles),
        prediction_impression_id: null, // No linked prediction
        caught_at: randomDate(30).toISOString(),
        quantity: 1,
        size_category: randomChoice(['small', 'average', 'large']),
        bait_used: randomChoice(mockBaits),
        habitat_type: randomChoice(mockHabitats),
        followed_findr_advice: false, // Wasn't using Findr
        notes: 'Spontaneous fishing trip - didn\'t check predictions first.'
      });
    }
    
    const { data: catchData, error: catchError } = await client
      .from('findr_catch_entries')
      .insert(catches)
      .select('id, species_common_name, is_blank_trip, prediction_impression_id');
    
    if (catchError) {
      throw new Error(`Failed to create catches: ${catchError.message}`);
    }
    
    const successfulCatches = catchData.filter(c => !c.is_blank_trip);
    const blankTrips = catchData.filter(c => c.is_blank_trip);
    
    console.log(`✅ Created ${successfulCatches.length} successful catches`);
    console.log(`✅ Created ${blankTrips.length} blank trips`);
    
    // Summary stats
    console.log('\n📊 Seed data summary:');
    console.log(`- Test user ID: ${userId}`);
    console.log(`- Prediction impressions: ${impressionData.length}`);
    console.log(`- Total catch entries: ${catchData.length}`);
    console.log(`- Successful catches: ${successfulCatches.length}`);
    console.log(`- Blank trips: ${blankTrips.length}`);
    console.log(`- Catches with prediction link: ${catchData.filter(c => c.prediction_impression_id).length}`);
    
    console.log('\n🎣 Ready to test validation queries! The data includes:');
    console.log('- Linked impressions → catches for accuracy analysis');
    console.log('- Both successful catches and blank trips');
    console.log('- Mix of predicted vs unpredicted species catches');
    console.log('- Catches with and without Findr prediction links');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

async function main() {
  await seedValidationData();
  console.log('\n🌱 Findr validation seeding complete!');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Unexpected error in validation seeding', error);
    process.exit(1);
  });
}