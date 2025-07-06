import type { Activity } from '../types';

export const activities: Activity[] = [
  {
    id: 'running',
    name: 'Running',
    icon: '🏃',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['sport', 'cardio', 'exercise'],
    poorConditionIndicator: (w) =>
      w.temp < 5 || w.temp > 30 || w.wind_speed > 10 || w.rain > 5 || w.humidity > 80,
    goodConditionIndicator: (w) =>
      w.temp >= 10 && w.temp <= 15 &&
      w.wind_speed < 5 &&
      w.clouds >= 25 && w.clouds <= 75 &&
      w.humidity < 60,
    perfectConditionIndicator: (w) =>
      w.temp >= 10 && w.temp <= 15 &&
      w.wind_speed < 3 &&
      w.clouds === 50 &&
      w.humidity >= 40 && w.humidity <= 50 &&
      w.visibility > 10,
  },
  {
    id: 'trail_running',
    name: 'Trail Running',
    icon: '🏞️',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['sport', 'cardio', 'trail', 'nature'],
    poorConditionIndicator: (w) =>
      w.temp < 0 || w.temp > 25 || w.wind_speed > 15 || w.rain > 2 || w.visibility < 5,
    goodConditionIndicator: (w) =>
      w.temp >= 7 && w.temp <= 18 &&
      w.wind_speed < 8 &&
      w.clouds >= 0 && w.clouds <= 50 &&
      w.rain === 0,
    perfectConditionIndicator: (w) =>
      w.temp >= 10 && w.temp <= 15 &&
      w.wind_speed < 5 &&
      w.weatherMain === 'Clear' &&
      w.visibility > 10 &&
      w.humidity < 50,
  },
  {
    id: 'road_cycling',
    name: 'Road Cycling',
    icon: '🚴',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['sport', 'cycling', 'cardio'],
    poorConditionIndicator: (w) =>
      w.temp < 5 || w.temp > 35 || w.wind_speed > 15 || w.rain > 1 || w.visibility < 5,
    goodConditionIndicator: (w) =>
      w.temp >= 15 && w.temp <= 27 &&
      w.wind_speed < 10 &&
      w.clouds >= 0 && w.clouds <= 25 &&
      w.humidity < 60,
    perfectConditionIndicator: (w) =>
      w.temp >= 18 && w.temp <= 24 &&
      w.wind_speed < 5 &&
      w.weatherMain === 'Clear' &&
      w.humidity >= 40 && w.humidity <= 50,
  },
  {
    id: 'mountain_biking',
    name: 'Mountain Biking',
    icon: '🚵',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['sport', 'cycling', 'trail', 'adventure'],
    poorConditionIndicator: (w) =>
      w.temp < 0 || w.temp > 30 || w.wind_speed > 20 || w.rain > 3,
    goodConditionIndicator: (w) =>
      w.temp >= 13 && w.temp <= 24 &&
      w.wind_speed < 12 &&
      w.clouds >= 25 && w.clouds <= 75 &&
      w.rain === 0,
    perfectConditionIndicator: (w) =>
      w.temp >= 16 && w.temp <= 21 &&
      w.wind_speed < 8 &&
      w.clouds >= 25 && w.clouds <= 50 &&
      w.visibility > 10,
  },
  {
    id: 'football_soccer',
    name: 'Football (Soccer)',
    icon: '⚽',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['sport', 'team', 'ball'],
    poorConditionIndicator: (w) =>
      w.temp < 0 || w.temp > 35 || w.wind_speed > 20 || w.rain > 8,
    goodConditionIndicator: (w) =>
      w.temp >= 18 && w.temp <= 24 &&
      w.wind_speed < 15 &&
      w.clouds >= 50 && w.clouds <= 75 &&
      w.rain <= 2,
    perfectConditionIndicator: (w) =>
      w.temp >= 20 && w.temp <= 22 &&
      w.wind_speed < 10 &&
      w.clouds >= 80 && w.clouds <= 90 &&
      w.humidity >= 50 && w.humidity <= 60,
  },
  {
    id: 'tennis',
    name: 'Tennis',
    icon: '🎾',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['sport', 'racquet', 'ball'],
    poorConditionIndicator: (w) =>
      w.temp < 5 || w.temp > 35 || w.wind_speed > 15 || w.rain > 0,
    goodConditionIndicator: (w) =>
      w.temp >= 18 && w.temp <= 27 &&
      w.wind_speed < 10 &&
      w.clouds >= 0 && w.clouds <= 50 &&
      w.humidity < 70,
    perfectConditionIndicator: (w) =>
      w.temp >= 21 && w.temp <= 24 &&
      w.wind_speed < 5 &&
      w.clouds >= 25 && w.clouds <= 50 &&
      w.humidity >= 50 && w.humidity <= 60,
  },
  {
    id: 'golf',
    name: 'Golf',
    icon: '⛳',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['sport', 'precision', 'ball'],
    poorConditionIndicator: (w) =>
      w.temp < 0 || w.temp > 35 || w.wind_speed > 25 || w.rain > 5,
    goodConditionIndicator: (w) =>
      w.temp >= 15 && w.temp <= 24 &&
      w.wind_speed >= 5 && w.wind_speed <= 15 &&
      w.clouds >= 25 && w.clouds <= 75 &&
      w.rain <= 1,
    perfectConditionIndicator: (w) =>
      w.temp >= 18 && w.temp <= 21 &&
      w.wind_speed >= 8 && w.wind_speed <= 12 &&
      w.clouds >= 25 && w.clouds <= 50 &&
      w.humidity >= 50 && w.humidity <= 60,
  },
  {
    id: 'surfing',
    name: 'Surfing',
    icon: '🏄',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['water', 'sport', 'waves'],
    poorConditionIndicator: (w) =>
      w.wind_speed > 20 || w.rain > 10 || w.temp < 10,
    goodConditionIndicator: (w) =>
      w.wind_speed >= 5 && w.wind_speed <= 15 &&
      w.temp > 16,
    perfectConditionIndicator: (w) =>
      w.wind_speed >= 8 && w.wind_speed <= 12 &&
      w.temp > 18 &&
      w.weatherMain === 'Clear',
  },
  {
    id: 'stand_up_paddleboarding',
    name: 'Stand-up Paddleboarding',
    icon: '🛶',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['water', 'sport', 'balance'],
    poorConditionIndicator: (w) =>
      w.wind_speed > 15 || w.rain > 5 || w.temp < 15,
    goodConditionIndicator: (w) =>
      w.wind_speed < 10 && w.temp > 21,
    perfectConditionIndicator: (w) =>
      w.wind_speed < 5 && w.temp > 24 &&
      w.visibility > 10,
  },
  {
    id: 'sailing',
    name: 'Sailing',
    icon: '⛵',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['water', 'sport', 'wind'],
    poorConditionIndicator: (w) =>
      w.wind_speed < 2 || w.wind_speed > 25 || w.rain > 8,
    goodConditionIndicator: (w) =>
      w.wind_speed >= 4 && w.wind_speed <= 10 &&
      w.clouds >= 25 && w.clouds <= 75,
    perfectConditionIndicator: (w) =>
      w.wind_speed >= 6 && w.wind_speed <= 8 &&
      w.temp >= 18 && w.temp <= 24 &&
      w.visibility > 10,
  },
  {
    id: 'windsurfing',
    name: 'Windsurfing',
    icon: '🌊',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['water', 'sport', 'wind'],
    poorConditionIndicator: (w) =>
      w.wind_speed < 6 || w.wind_speed > 30,
    goodConditionIndicator: (w) =>
      w.wind_speed >= 12 && w.wind_speed <= 25,
    perfectConditionIndicator: (w) =>
      w.wind_speed >= 15 && w.wind_speed <= 20 &&
      w.weatherMain === 'Clear',
  },
  {
    id: 'kayaking',
    name: 'Kayaking',
    icon: '🛶',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['water', 'sport', 'paddle'],
    poorConditionIndicator: (w) =>
      w.wind_speed > 15 || w.rain > 8,
    goodConditionIndicator: (w) =>
      w.wind_speed < 10 && w.temp > 16,
    perfectConditionIndicator: (w) =>
      w.wind_speed < 5 && w.temp > 18,
  },
  {
    id: 'open_water_swimming',
    name: 'Open Water Swimming',
    icon: '🏊',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['water', 'sport', 'endurance'],
    poorConditionIndicator: (w) =>
      w.temp < 16 || w.wind_speed > 15,
    goodConditionIndicator: (w) =>
      w.temp >= 16 && w.temp <= 26 &&
      w.wind_speed < 8,
    perfectConditionIndicator: (w) =>
      w.temp >= 18 && w.temp <= 22 &&
      w.wind_speed < 5,
  },
  {
    id: 'rock_climbing',
    name: 'Rock Climbing',
    icon: '🧗',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['adventure', 'sport', 'strength'],
    poorConditionIndicator: (w) =>
      w.temp < 0 || w.temp > 30 || w.rain > 0,
    goodConditionIndicator: (w) =>
      w.temp >= 10 && w.temp <= 21 &&
      w.wind_speed < 15,
    perfectConditionIndicator: (w) =>
      w.temp >= 15 && w.temp <= 18 &&
      w.wind_speed < 8 &&
      w.visibility > 10,
  },
  {
    id: 'hiking',
    name: 'Hiking',
    icon: '🥾',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['nature', 'walking', 'exercise'],
    poorConditionIndicator: (w) =>
      w.temp < -5 || w.temp > 35,
    goodConditionIndicator: (w) =>
      w.temp >= 10 && w.temp <= 21,
    perfectConditionIndicator: (w) =>
      w.temp >= 15 && w.temp <= 18 &&
      w.visibility > 10,
  },
  {
    id: 'skiing',
    name: 'Skiing',
    icon: '⛷️',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['winter', 'sport', 'snow'],
    poorConditionIndicator: (w) =>
      w.temp > 2,
    goodConditionIndicator: (w) =>
      w.temp >= -7 && w.temp <= 2,
    perfectConditionIndicator: (w) =>
      w.temp >= -4 && w.temp <= 0,
  },
  {
    id: 'snowboarding',
    name: 'Snowboarding',
    icon: '🏂',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['winter', 'sport', 'snow'],
    poorConditionIndicator: (w) =>
      w.temp > 2,
    goodConditionIndicator: (w) =>
      w.temp >= -4 && w.temp <= 2,
    perfectConditionIndicator: (w) =>
      w.temp >= -2 && w.temp <= 1,
  },
  {
    id: 'coarse_fishing',
    name: 'Coarse Fishing',
    icon: '🎣',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['fishing', 'freshwater', 'patience'],
    poorConditionIndicator: (w) =>
      w.temp < 0 || w.rain > 15,
    goodConditionIndicator: (w) =>
      w.temp >= 15 && w.temp <= 25,
    perfectConditionIndicator: (w) =>
      w.temp >= 18 && w.temp <= 22,
  },
  {
    id: 'fly_fishing_freshwater',
    name: 'Fly Fishing (Freshwater)',
    icon: '🐠',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['fishing', 'freshwater'],
    poorConditionIndicator: (w) =>
      w.temp < 7 || w.temp > 18,
    goodConditionIndicator: (w) =>
      w.temp >= 7 && w.temp <= 18,
    perfectConditionIndicator: (w) =>
      w.temp >= 12 && w.temp <= 16,
  },
  {
    id: 'fly_fishing_saltwater',
    name: 'Fly Fishing (Saltwater)',
    icon: '🐟',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['fishing', 'saltwater'],
    poorConditionIndicator: (w) =>
      w.wind_speed > 20,
    goodConditionIndicator: (w) =>
      w.wind_speed >= 8 && w.wind_speed <= 15,
    perfectConditionIndicator: (w) =>
      w.wind_speed >= 10 && w.wind_speed <= 12,
  },
  {
    id: 'sea_fishing_shore',
    name: 'Sea Fishing (Shore)',
    icon: '🏖️',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['fishing', 'shore'],
    poorConditionIndicator: (w) =>
      w.wind_speed > 25,
    goodConditionIndicator: (w) =>
      w.wind_speed >= 10 && w.wind_speed <= 20,
    perfectConditionIndicator: (w) =>
      w.wind_speed >= 12 && w.wind_speed <= 18,
  },
  {
    id: 'sea_fishing_boat',
    name: 'Sea Fishing (Boat)',
    icon: '🚤',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['fishing', 'boat'],
    poorConditionIndicator: (w) =>
      w.wind_speed > 25,
    goodConditionIndicator: (w) =>
      w.wind_speed < 20,
    perfectConditionIndicator: (w) =>
      w.wind_speed >= 8 && w.wind_speed <= 15,
  },
  {
    id: 'carp_fishing',
    name: 'Carp Fishing',
    icon: '🐟',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['fishing', 'freshwater'],
    poorConditionIndicator: (w) =>
      w.temp < 5,
    goodConditionIndicator: (w) =>
      w.temp >= 18 && w.temp <= 27,
    perfectConditionIndicator: (w) =>
      w.temp >= 20 && w.temp <= 24,
  },
  {
    id: 'birdwatching',
    name: 'Birdwatching',
    icon: '🐦',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['nature', 'quiet'],
    poorConditionIndicator: (w) =>
      w.rain > 5,
    goodConditionIndicator: (w) =>
      w.temp >= 10 && w.temp <= 22,
    perfectConditionIndicator: (w) =>
      w.temp >= 14 && w.temp <= 18,
  },
  {
    id: 'photography',
    name: 'Photography (Outdoor)',
    icon: '📷',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['art'],
    poorConditionIndicator: (w) =>
      w.rain > 5,
    goodConditionIndicator: (w) =>
      w.temp >= 8 && w.temp <= 25,
    perfectConditionIndicator: (w) =>
      w.weatherMain === 'Clear',
  },
  {
    id: 'stargazing',
    name: 'Stargazing',
    icon: '🔭',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['night'],
    poorConditionIndicator: (w) =>
      w.clouds > 30,
    goodConditionIndicator: (w) =>
      w.clouds <= 20,
    perfectConditionIndicator: (w) =>
      w.clouds === 0,
  },
  {
    id: 'basketball_outdoor',
    name: 'Basketball (Outdoor)',
    icon: '🏀',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['sport', 'team'],
    poorConditionIndicator: (w) =>
      w.temp < 5,
    goodConditionIndicator: (w) =>
      w.temp >= 15 && w.temp <= 25,
    perfectConditionIndicator: (w) =>
      w.temp >= 18 && w.temp <= 22,
  },
  {
    id: 'cricket',
    name: 'Cricket',
    icon: '🏏',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['sport', 'team'],
    poorConditionIndicator: (w) =>
      w.temp < 10,
    goodConditionIndicator: (w) =>
      w.temp >= 18 && w.temp <= 28,
    perfectConditionIndicator: (w) =>
      w.temp >= 20 && w.temp <= 25,
  },
  {
    id: 'rugby',
    name: 'Rugby',
    icon: '🏉',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['sport', 'team'],
    poorConditionIndicator: (w) =>
      w.temp < 0,
    goodConditionIndicator: (w) =>
      w.temp >= 10 && w.temp <= 20,
    perfectConditionIndicator: (w) =>
      w.temp >= 14 && w.temp <= 18,
  },
  {
    id: 'skateboarding',
    name: 'Skateboarding',
    icon: '🛹',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['sport', 'urban'],
    poorConditionIndicator: (w) =>
      w.rain > 0,
    goodConditionIndicator: (w) =>
      w.temp >= 15 && w.temp <= 25,
    perfectConditionIndicator: (w) =>
      w.weatherMain === 'Clear',
  },
  {
    id: 'horse_riding',
    name: 'Horse Riding',
    icon: '🐎',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['animal', 'sport'],
    poorConditionIndicator: (w) =>
      w.temp < 0,
    goodConditionIndicator: (w) =>
      w.temp >= 12 && w.temp <= 22,
    perfectConditionIndicator: (w) =>
      w.temp >= 16 && w.temp <= 19,
  },
  {
    id: 'orienteering',
    name: 'Orienteering',
    icon: '🧭',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['navigation'],
    poorConditionIndicator: (w) => w.temp < 0,
    goodConditionIndicator: (w) => w.temp >= 10 && w.temp <= 20,
    perfectConditionIndicator: (w) => w.temp >= 14 && w.temp <= 18,
  },
  {
    id: 'frisbee',
    name: 'Frisbee (Disc Sports)',
    icon: '🥏',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['sport'],
    poorConditionIndicator: (w) => w.temp < 5,
    goodConditionIndicator: (w) => w.temp >= 15 && w.temp <= 25,
    perfectConditionIndicator: (w) => w.temp >= 18 && w.temp <= 22,
  },
  {
    id: 'beach_volleyball',
    name: 'Beach Volleyball',
    icon: '🏐',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['sport', 'sand'],
    poorConditionIndicator: (w) => w.temp < 15,
    goodConditionIndicator: (w) => w.temp >= 20 && w.temp <= 30,
    perfectConditionIndicator: (w) => w.temp >= 22 && w.temp <= 28,
  },
  {
    id: 'outdoor_yoga',
    name: 'Outdoor Yoga',
    icon: '🧘',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['wellness'],
    poorConditionIndicator: (w) => w.temp < 8,
    goodConditionIndicator: (w) => w.temp >= 15 && w.temp <= 25,
    perfectConditionIndicator: (w) => w.temp >= 18 && w.temp <= 22,
  },
  {
    id: 'outdoor_gym',
    name: 'Outdoor Gym/Calisthenics',
    icon: '💪',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['exercise'],
    poorConditionIndicator: (w) => w.temp < 5,
    goodConditionIndicator: (w) => w.temp >= 15 && w.temp <= 25,
    perfectConditionIndicator: (w) => w.temp >= 18 && w.temp <= 22,
  },
  {
    id: 'rollerblading',
    name: 'Rollerblading',
    icon: '🛼',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['sport'], 
    poorConditionIndicator: (w) => w.temp < 8,
    goodConditionIndicator: (w) => w.temp >= 15 && w.temp <= 25,
    perfectConditionIndicator: (w) => w.temp >= 18 && w.temp <= 22,
  },
  {
    id: 'outdoor_painting',
    name: 'Outdoor Painting/Sketching',
    icon: '🎨',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['art'],
    poorConditionIndicator: (w) => w.rain > 0,
    goodConditionIndicator: (w) => w.temp >= 15 && w.temp <= 25,
    perfectConditionIndicator: (w) => w.temp >= 18 && w.temp <= 22,
  },
  {
    id: 'dog_walking',
    name: 'Dog Walking',
    icon: '🐕',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['pets'],
    poorConditionIndicator: (w) => w.temp < -5,
    goodConditionIndicator: (w) => w.temp >= 10 && w.temp <= 25,
    perfectConditionIndicator: (w) => w.temp >= 15 && w.temp <= 20,
  },
  {
    id: 'outdoor_picnic',
    name: 'Outdoor Picnic',
    icon: '🥪',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['leisure'],
    poorConditionIndicator: (w) => w.temp < 10,
    goodConditionIndicator: (w) => w.temp >= 16 && w.temp <= 25,
    perfectConditionIndicator: (w) => w.temp >= 18 && w.temp <= 22,
  },
  {
    id: 'outdoor_chess',
    name: 'Outdoor Chess/Board Games',
    icon: '♟️',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['games'],
    poorConditionIndicator: (w) => w.rain > 0,
    goodConditionIndicator: (w) => w.temp >= 15 && w.temp <= 25,
    perfectConditionIndicator: (w) => w.temp >= 18 && w.temp <= 22,
  },
  {
    id: 'outdoor_reading',
    name: 'Outdoor Reading',
    icon: '📖',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['relaxation'],
    poorConditionIndicator: (w) => w.rain > 0,
    goodConditionIndicator: (w) => w.temp >= 16 && w.temp <= 25,
    perfectConditionIndicator: (w) => w.temp >= 18 && w.temp <= 22,
  },
  {
    id: 'outdoor_meditation',
    name: 'Outdoor Meditation',
    icon: '🧘‍♀️',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['wellness'],
    poorConditionIndicator: (w) => w.rain > 0,
    goodConditionIndicator: (w) => w.temp >= 15 && w.temp <= 25,
    perfectConditionIndicator: (w) => w.temp >= 18 && w.temp <= 22,
  },
  {
    id: 'outdoor_music',
    name: 'Outdoor Music/Busking',
    icon: '🎵',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['music'],
    poorConditionIndicator: (w) => w.rain > 0,
    goodConditionIndicator: (w) => w.temp >= 16 && w.temp <= 25,
    perfectConditionIndicator: (w) => w.temp >= 18 && w.temp <= 22,
  },
  {
    id: 'geocaching',
    name: 'Geocaching',
    icon: '📍',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['adventure'],
    poorConditionIndicator: (w) => w.temp < 0,
    goodConditionIndicator: (w) => w.temp >= 10 && w.temp <= 25,
    perfectConditionIndicator: (w) => w.temp >= 15 && w.temp <= 20,
  },
  {
    id: 'outdoor_running_with_stroller',
    name: 'Running with Stroller',
    icon: '👶🏃',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['family', 'exercise'],
    poorConditionIndicator: (w) => w.temp < 8,
    goodConditionIndicator: (w) => w.temp >= 15 && w.temp <= 22,
    perfectConditionIndicator: (w) => w.temp >= 18 && w.temp <= 20,
  },
  {
    id: 'outdoor_playground',
    name: 'Playground Activities',
    icon: '🛝',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['kids', 'play'],
    poorConditionIndicator: (w) => w.temp < 5,
    goodConditionIndicator: (w) => w.temp >= 16 && w.temp <= 25,
    perfectConditionIndicator: (w) => w.temp >= 18 && w.temp <= 22,
  },
  {
    id: 'outdoor_gardening',
    name: 'Gardening',
    icon: '🌱',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['plants'],
    poorConditionIndicator: (w) => w.temp < 5,
    goodConditionIndicator: (w) => w.temp >= 15 && w.temp <= 25,
    perfectConditionIndicator: (w) => w.temp >= 18 && w.temp <= 22,
  },
  {
    id: 'outdoor_barbecue',
    name: 'Barbecue',
    icon: '🍖',
    category: 'Outdoor',
    weatherSensitive: true,
    tags: ['food'],
    poorConditionIndicator: (w) => w.temp < 12,
    goodConditionIndicator: (w) => w.temp >= 18 && w.temp <= 28,
    perfectConditionIndicator: (w) => w.temp >= 20 && w.temp <= 24,
  },
];
