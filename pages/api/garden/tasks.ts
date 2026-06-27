import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../../lib/supabase/env';
import { getOpenWeatherKey } from '../../../lib/utils/openWeatherKey';

const OPENWEATHER_API_KEY = getOpenWeatherKey();

interface GardenTask {
  id: string;
  taskCode: string;
  title: string;
  emoji: string;
  shortDescription: string;
  fullDescription: string;
  score: number;
  urgency: 'critical' | 'optimal' | 'good' | 'upcoming';
  urgencyBadge: string;
  bestWindow: string;
  timeRequired: number;
  category: string;
  reasoning: string[];
  weatherContext: string;
  soilTemp?: string;
  weatherIcon: string;
  plant?: string;
  inMyTasks?: boolean;
}

interface WeatherData {
  temperature: number;
  conditions: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  icon: string;
}

interface PlantData {
  id: string;
  name: string;
  type: string;
  health: string;
  planted_at: string | null;
  last_watered_at: string | null;
}

// Geocode location to get coordinates
async function geocodeLocation(location: string): Promise<{ lat: number; lon: number; displayName: string } | null> {
  if (!OPENWEATHER_API_KEY) {
    console.warn('No OpenWeather API key configured');
    return null;
  }

  try {
    const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${OPENWEATHER_API_KEY}`;
    const geocodeResponse = await fetch(geocodeUrl);

    if (!geocodeResponse.ok) {
      return null;
    }

    const geocodeData = await geocodeResponse.json();
    if (geocodeData && geocodeData.length > 0) {
      const result = geocodeData[0];
      return {
        lat: result.lat,
        lon: result.lon,
        displayName: `${result.name}${result.state ? ', ' + result.state : ''}${result.country ? ', ' + result.country : ''}`
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }

  return null;
}

// Fetch weather data from OpenWeather
async function getWeatherData(location: string): Promise<{ weather: WeatherData; coords: { lat: number; lon: number }; displayName: string } | null> {
  if (!OPENWEATHER_API_KEY) {
    console.warn('No OpenWeather API key configured - using estimated weather');
    return null;
  }

  try {
    // Geocode location first
    const geoData = await geocodeLocation(location);
    if (!geoData) {
      return null;
    }

    // Fetch current weather
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${geoData.lat}&lon=${geoData.lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    const weatherResponse = await fetch(weatherUrl);

    if (!weatherResponse.ok) {
      return null;
    }

    const data = await weatherResponse.json();

    return {
      weather: {
        temperature: Math.round(data.main.temp),
        conditions: data.weather[0]?.main || 'Clear',
        humidity: data.main.humidity,
        windSpeed: data.wind?.speed || 0,
        precipitation: data.rain?.['1h'] || 0,
        icon: data.weather[0]?.icon || '01d',
      },
      coords: {
        lat: geoData.lat,
        lon: geoData.lon,
      },
      displayName: geoData.displayName,
    };
  } catch (error) {
    console.error('Weather fetch error:', error);
    return null;
  }
}

// Get user's plants if authenticated
async function getUserPlants(req: NextApiRequest): Promise<PlantData[]> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return [];
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('grow_user_plants')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to fetch user plants:', error);
      return [];
    }

    return data as PlantData[];
  } catch (error) {
    console.error('Error fetching user plants:', error);
    return [];
  }
}

// Calculate hardiness zone from latitude (simplified)
function getHardinessZone(lat: number): string {
  // Very simplified zone calculation based on latitude
  // This is a rough approximation for the US
  if (lat >= 48) return '3a';
  if (lat >= 45) return '4b';
  if (lat >= 42) return '5b';
  if (lat >= 39) return '6b';
  if (lat >= 36) return '7b';
  if (lat >= 33) return '8b';
  if (lat >= 30) return '9b';
  return '10b';
}

// Estimate last frost date based on zone
function getLastFrostInfo(zone: string): { date: string; daysSince: number } {
  const now = new Date();
  const year = now.getFullYear();

  // Simplified frost date mapping
  const frostDates: Record<string, { month: number; day: number }> = {
    '3a': { month: 5, day: 15 },
    '4b': { month: 5, day: 10 },
    '5b': { month: 5, day: 1 },
    '6b': { month: 4, day: 20 },
    '7b': { month: 4, day: 15 },
    '8b': { month: 3, day: 30 },
    '9b': { month: 3, day: 1 },
    '10b': { month: 2, day: 1 },
  };

  const frostInfo = frostDates[zone] || frostDates['7b'];
  const frostDate = new Date(year, frostInfo.month - 1, frostInfo.day);

  // If frost date hasn't occurred yet this year, use last year
  if (frostDate > now) {
    frostDate.setFullYear(year - 1);
  }

  const daysSince = Math.floor((now.getTime() - frostDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    date: frostDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    daysSince,
  };
}

// Generate tasks based on plants, weather, and season
function generateTasks(
  plants: PlantData[],
  weather: WeatherData | null,
  location: string,
  zone: string,
  currentMonth: number
): GardenTask[] {
  const tasks: GardenTask[] = [];
  const now = new Date();
  const temp = weather?.temperature || 20; // Celsius fallback (68°F)
  const conditions = weather?.conditions || 'Clear';
  const _humidity = weather?.humidity || 50;

  // Plant-specific tasks
  plants.forEach((plant) => {
    const plantType = plant.type.toLowerCase();
    const lastWatered = plant.last_watered_at ? new Date(plant.last_watered_at) : null;
    const daysSinceWatered = lastWatered
      ? Math.floor((now.getTime() - lastWatered.getTime()) / (1000 * 60 * 60 * 24))
      : 7;

    // Watering tasks based on weather
    if (temp > 27 && daysSinceWatered > 1) {
      tasks.push({
        id: `water-${plant.id}`,
        taskCode: 'water',
        title: `Water ${plant.name}`,
        emoji: '💧',
        shortDescription: `High temperatures require frequent watering`,
        fullDescription: `Your ${plant.name} needs watering. Temperature is ${temp}°C and plants dry out quickly in hot weather.`,
        score: 90,
        urgency: 'critical',
        urgencyBadge: '🔥 Urgent',
        bestWindow: 'Early morning or evening',
        timeRequired: 10,
        category: 'watering',
        reasoning: [
          `Temperature is ${temp}°C - hot conditions increase water needs`,
          `Last watered ${daysSinceWatered} days ago`,
          `${plant.name} may show stress in this heat`,
        ],
        weatherContext: `${temp}°C, ${conditions.toLowerCase()}`,
        weatherIcon: '☀️',
        plant: plant.name,
      });
    } else if (daysSinceWatered > 3 && conditions !== 'Rain') {
      tasks.push({
        id: `water-${plant.id}`,
        taskCode: 'water',
        title: `Water ${plant.name}`,
        emoji: '💧',
        shortDescription: `Regular watering needed`,
        fullDescription: `Your ${plant.name} is due for watering. Keep soil consistently moist for healthy growth.`,
        score: 70,
        urgency: 'optimal',
        urgencyBadge: '✅ Perfect timing',
        bestWindow: 'Morning or evening',
        timeRequired: 10,
        category: 'watering',
        reasoning: [
          `Last watered ${daysSinceWatered} days ago`,
          `No rain expected today`,
          `Consistent moisture supports healthy growth`,
        ],
        weatherContext: `${temp}°C, ${conditions.toLowerCase()}`,
        weatherIcon: weather?.icon || '🌤️',
        plant: plant.name,
      });
    }

    // Fertilizing for vegetables and herbs
    if ((plantType.includes('tomato') || plantType.includes('pepper') || plantType.includes('herb')) &&
        [5, 6, 7, 8].includes(currentMonth)) {
      tasks.push({
        id: `fertilize-${plant.id}`,
        taskCode: 'fertilize',
        title: `Feed ${plant.name}`,
        emoji: '🪴',
        shortDescription: `Growing season feeding`,
        fullDescription: `Apply balanced fertilizer to your ${plant.name} to support strong growth and production during peak season.`,
        score: 75,
        urgency: 'good',
        urgencyBadge: '🌱 Good timing',
        bestWindow: 'Next 2 weeks',
        timeRequired: 15,
        category: 'feeding',
        reasoning: [
          'Peak growing season for heavy feeders',
          'Regular feeding improves yields',
          'Apply every 2-3 weeks during active growth',
        ],
        weatherContext: `${temp}°C, ${conditions.toLowerCase()}`,
        weatherIcon: weather?.icon || '🌤️',
        plant: plant.name,
      });
    }

    // Pruning tomatoes
    if (plantType.includes('tomato')) {
      tasks.push({
        id: `prune-${plant.id}`,
        taskCode: 'prune',
        title: `Prune ${plant.name}`,
        emoji: '✂️',
        shortDescription: `Remove suckers for better fruiting`,
        fullDescription: `Remove suckers (shoots between main stem and branches) from your ${plant.name} to focus energy on fruit production.`,
        score: 65,
        urgency: 'good',
        urgencyBadge: '🌱 Good timing',
        bestWindow: 'Weekly during growing season',
        timeRequired: 10,
        category: 'pruning',
        reasoning: [
          'Removing suckers improves air circulation',
          'Directs energy to fruit production',
          'Weekly maintenance keeps plants manageable',
        ],
        weatherContext: `${temp}°C, ${conditions.toLowerCase()}`,
        weatherIcon: weather?.icon || '🌤️',
        plant: plant.name,
      });
    }
  });

  // General seasonal tasks
  if ([4, 5].includes(currentMonth)) {
    // Spring planting season
    tasks.push({
      id: 'spring-planting',
      taskCode: 'plant-spring',
      title: 'Start Spring Planting',
      emoji: '🌱',
      shortDescription: 'Perfect time for cool-season crops',
      fullDescription: 'Plant lettuce, peas, spinach, and other cool-season vegetables. Soil temperatures are ideal for germination.',
      score: 85,
      urgency: 'optimal',
      urgencyBadge: '✅ Perfect timing',
      bestWindow: 'Next 2 weeks',
      timeRequired: 45,
      category: 'planting',
      reasoning: [
        `Soil temperature is ideal for cool-season crops`,
        `Last frost date has likely passed in zone ${zone}`,
        `Cool temperatures prevent bolting in greens`,
      ],
      weatherContext: `${temp}°C, ${conditions.toLowerCase()}`,
      soilTemp: `Soil: 7-13°C (ideal)`,
      weatherIcon: weather?.icon || '🌤️',
    });
  }

  if ([5, 6].includes(currentMonth) && temp > 18) { // 18°C ≈ 65°F
    // Warm season planting
    tasks.push({
      id: 'summer-planting',
      taskCode: 'plant-summer',
      title: 'Plant Warm-Season Crops',
      emoji: '🍅',
      shortDescription: 'Time for tomatoes, peppers, and squash',
      fullDescription: 'Transplant warm-season vegetables like tomatoes, peppers, cucumbers, and squash. Soil is warm enough for strong root development.',
      score: 90,
      urgency: 'optimal',
      urgencyBadge: '✅ Perfect timing',
      bestWindow: 'This week',
      timeRequired: 60,
      category: 'planting',
      reasoning: [
        `Soil temperature above 16°C - perfect for warm-season crops`,
        `Air temperature ${temp}°C supports growth`,
        `Full growing season ahead for maximum yields`,
      ],
      weatherContext: `${temp}°C, ${conditions.toLowerCase()}`,
      soilTemp: `Soil: 16-21°C (ideal)`,
      weatherIcon: weather?.icon || '☀️',
    });
  }

  // Mulching task for summer heat
  if ([6, 7, 8].includes(currentMonth) && temp > 24) { // 24°C ≈ 75°F
    tasks.push({
      id: 'summer-mulch',
      taskCode: 'mulch',
      title: 'Apply Mulch',
      emoji: '🧹',
      shortDescription: 'Protect soil from summer heat',
      fullDescription: 'Apply 2-3 inches of organic mulch around plants to retain moisture, suppress weeds, and keep roots cool.',
      score: 80,
      urgency: 'optimal',
      urgencyBadge: '✅ Perfect timing',
      bestWindow: 'Before peak summer heat',
      timeRequired: 30,
      category: 'maintenance',
      reasoning: [
        `Temperature ${temp}°C - mulch helps cool soil`,
        `Reduces watering needs by 25-50%`,
        `Suppresses weeds that compete for water`,
      ],
      weatherContext: `${temp}°C, ${conditions.toLowerCase()}`,
      weatherIcon: weather?.icon || '☀️',
    });
  }

  // Fall planting
  if ([8, 9].includes(currentMonth) && temp < 29) { // 29°C ≈ 85°F
    tasks.push({
      id: 'fall-planting',
      taskCode: 'plant-fall',
      title: 'Start Fall Garden',
      emoji: '🥬',
      shortDescription: 'Plant cool-season crops for fall harvest',
      fullDescription: 'Direct sow lettuce, spinach, radishes, and carrots for fall harvest. Cooler temperatures produce sweeter, crisper vegetables.',
      score: 85,
      urgency: 'optimal',
      urgencyBadge: '✅ Perfect timing',
      bestWindow: 'Next 2-3 weeks',
      timeRequired: 45,
      category: 'planting',
      reasoning: [
        `Cooling temperatures ideal for greens and root crops`,
        `60-75 days until first frost in zone ${zone}`,
        `Fall crops often sweeter than spring plantings`,
      ],
      weatherContext: `${temp}°C, ${conditions.toLowerCase()}`,
      weatherIcon: weather?.icon || '🍂',
    });
  }

  // Weeding - always relevant in growing season
  if ([4, 5, 6, 7, 8, 9].includes(currentMonth)) {
    tasks.push({
      id: 'weeding',
      taskCode: 'weed',
      title: 'Weed Garden Beds',
      emoji: '🧹',
      shortDescription: 'Remove competing weeds',
      fullDescription: 'Pull weeds while they\'re small and before they go to seed. Easier to remove now than later.',
      score: 60,
      urgency: 'good',
      urgencyBadge: '🌱 Good timing',
      bestWindow: 'After rain when soil is moist',
      timeRequired: 30,
      category: 'maintenance',
      reasoning: [
        'Weeds compete for water and nutrients',
        'Remove before they set seed',
        'Easier to pull when soil is moist',
      ],
      weatherContext: `${temp}°C, ${conditions.toLowerCase()}`,
      weatherIcon: weather?.icon || '🌤️',
    });
  }

  // Winter planning tasks (November - March)
  if ([11, 12, 1, 2, 3].includes(currentMonth)) {
    tasks.push({
      id: 'winter-planning',
      taskCode: 'plan-season',
      title: 'Plan Next Growing Season',
      emoji: '📋',
      shortDescription: 'Review last season and plan ahead',
      fullDescription: 'Order seed catalogs, plan your garden layout, and decide what to grow next season. Review what worked well and what to change.',
      score: 80,
      urgency: 'optimal',
      urgencyBadge: '✅ Perfect timing',
      bestWindow: 'Winter months',
      timeRequired: 60,
      category: 'planning',
      reasoning: [
        'Seed catalogs arrive in winter',
        'Best selection before varieties sell out',
        'Time to reflect and plan improvements',
      ],
      weatherContext: `${temp}°C, ${conditions.toLowerCase()}`,
      weatherIcon: '📅',
    });

    tasks.push({
      id: 'winter-tool-maintenance',
      taskCode: 'maintain-tools',
      title: 'Clean and Sharpen Garden Tools',
      emoji: '🔧',
      shortDescription: 'Maintain tools during off-season',
      fullDescription: 'Clean, sharpen, and oil your garden tools. Remove rust, sharpen blades, and repair any broken handles.',
      score: 70,
      urgency: 'good',
      urgencyBadge: '🌱 Good timing',
      bestWindow: 'Winter off-season',
      timeRequired: 45,
      category: 'maintenance',
      reasoning: [
        'Sharp tools make gardening easier',
        'Prevents rust and extends tool life',
        'Quiet season is perfect for maintenance',
      ],
      weatherContext: `${temp}°C, ${conditions.toLowerCase()}`,
      weatherIcon: '🛠️',
    });

    if ([1, 2].includes(currentMonth)) {
      tasks.push({
        id: 'start-seeds-indoors',
        taskCode: 'seed-start',
        title: 'Start Seeds Indoors',
        emoji: '🌱',
        shortDescription: 'Get a head start on spring',
        fullDescription: 'Start tomatoes, peppers, and other warm-season crops indoors 6-8 weeks before last frost date. Use grow lights or a sunny window.',
        score: 85,
        urgency: 'optimal',
        urgencyBadge: '✅ Perfect timing',
        bestWindow: 'Late winter',
        timeRequired: 45,
        category: 'planting',
        reasoning: [
          `Last frost in zone ${zone} is approximately 6-8 weeks away`,
          'Indoor start gives plants a strong head start',
          'Ensures transplants are ready when weather permits',
        ],
        weatherContext: `${temp}°C, ${conditions.toLowerCase()}`,
        soilTemp: 'Indoor: 18-24°C (ideal)',
        weatherIcon: '🪴',
      });
    }
  }

  // Add some general tasks if we don't have many tasks yet
  if (tasks.length < 3) {
    tasks.push({
      id: 'garden-journal',
      taskCode: 'journal',
      title: 'Update Garden Journal',
      emoji: '📝',
      shortDescription: 'Track your gardening progress',
      fullDescription: 'Record what you planted, when, and how it performed. Note weather patterns, pest problems, and successes to help plan future seasons.',
      score: 65,
      urgency: 'good',
      urgencyBadge: '🌱 Good timing',
      bestWindow: 'Ongoing',
      timeRequired: 15,
      category: 'planning',
      reasoning: [
        'Historical records improve future planning',
        'Track what works in your specific climate',
        'Helps identify patterns and solve problems',
      ],
      weatherContext: `${temp}°C, ${conditions.toLowerCase()}`,
      weatherIcon: '📚',
    });

    tasks.push({
      id: 'soil-test',
      taskCode: 'test-soil',
      title: 'Test Your Soil',
      emoji: '🔬',
      shortDescription: 'Know your soil pH and nutrients',
      fullDescription: 'Get a soil test kit or send samples to your local extension office. Understanding your soil helps you choose the right amendments and plants.',
      score: 75,
      urgency: 'good',
      urgencyBadge: '🌱 Good timing',
      bestWindow: 'Before planting season',
      timeRequired: 30,
      category: 'planning',
      reasoning: [
        'Soil pH affects nutrient availability',
        'Identifies deficiencies before planting',
        'Prevents wasted effort on wrong amendments',
      ],
      weatherContext: `${temp}°C, ${conditions.toLowerCase()}`,
      weatherIcon: '🧪',
    });

    tasks.push({
      id: 'compost-bin',
      taskCode: 'check-compost',
      title: 'Turn Your Compost',
      emoji: '♻️',
      shortDescription: 'Maintain your compost pile',
      fullDescription: 'Turn your compost pile to add oxygen and speed decomposition. Check moisture levels and add browns or greens as needed.',
      score: 60,
      urgency: 'good',
      urgencyBadge: '🌱 Good timing',
      bestWindow: 'Every 2-3 weeks',
      timeRequired: 20,
      category: 'maintenance',
      reasoning: [
        'Oxygen speeds decomposition',
        'Creates rich soil amendment for free',
        'Reduces kitchen and yard waste',
      ],
      weatherContext: `${temp}°C, ${conditions.toLowerCase()}`,
      weatherIcon: '🌱',
    });
  }

  // Sort by score (highest first)
  tasks.sort((a, b) => b.score - a.score);

  return tasks;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use query location if provided, otherwise use a generic default
    // Frontend should load user's saved location from database
    const location = (req.query.location as string) || 'San Francisco, CA'; // Generic default for first-time users
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    // Fetch weather data
    const weatherData = await getWeatherData(location);
    const weather = weatherData?.weather || null;
    const coords = weatherData?.coords || null;
    const displayName = weatherData?.displayName || location;

    // Get user's plants if authenticated
    const plants = await getUserPlants(req);

    // Calculate zone and frost info
    const zone = coords ? getHardinessZone(coords.lat) : '7b';
    const frostInfo = getLastFrostInfo(zone);
    const currentMonth = new Date().getMonth() + 1; // 1-12

    // Calculate growing week (weeks since last frost)
    const growingWeek = Math.max(1, Math.floor(frostInfo.daysSince / 7));

    // Generate tasks
    const allTasks = generateTasks(plants, weather, location, zone, currentMonth);
    const tasks = allTasks.slice(0, limit);

    // Build response context
    const context = {
      location: displayName,
      weather: weather ? {
        temperature: weather.temperature,
        conditions: weather.conditions,
        soilMoisture: weather.humidity > 70 ? 'Wet' : weather.humidity > 40 ? 'Moderate' : 'Dry',
      } : {
        temperature: 20, // Celsius fallback (68°F)
        conditions: 'Clear',
        soilMoisture: 'Moderate',
      },
      lastFrostDate: frostInfo.date,
      daysSinceFrost: frostInfo.daysSince,
      zone,
      growingWeek,
      coordinates: coords ? { lat: coords.lat, lon: coords.lon } : undefined,
    };

    return res.status(200).json({
      tasks,
      context,
      realWeatherAvailable: weatherData !== null,
    });
  } catch (error) {
    console.error('Error generating garden tasks:', error);
    return res.status(500).json({
      error: 'Failed to generate garden tasks',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    });
  }
}
