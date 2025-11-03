// __tests__/fixtures/mockData.ts
/**
 * Mock data fixtures for testing
 */

export const mockSpecies = {
  COD: {
    species_code: 'COD',
    name_en: 'Atlantic Cod',
    name_scientific: 'Gadus morhua',
    family: 'Gadidae',
    inaturalist_url: 'https://www.inaturalist.org/taxa/47368',
    image_url: 'https://example.com/cod.jpg',
    min_legal_size_cm: 35,
    max_size_cm: 150,
  },
  BSS: {
    species_code: 'BSS',
    name_en: 'European Bass',
    name_scientific: 'Dicentrarchus labrax',
    family: 'Moronidae',
    inaturalist_url: 'https://www.inaturalist.org/taxa/65258',
    image_url: 'https://example.com/bass.jpg',
    min_legal_size_cm: 42,
    max_size_cm: 100,
  },
  MAC: {
    species_code: 'MAC',
    name_en: 'Atlantic Mackerel',
    name_scientific: 'Scomber scombrus',
    family: 'Scombridae',
    inaturalist_url: 'https://www.inaturalist.org/taxa/47805',
    image_url: 'https://example.com/mackerel.jpg',
    min_legal_size_cm: 20,
    max_size_cm: 60,
  },
};

export const mockTechniques = {
  COD: [
    {
      species_code: 'COD',
      technique: 'Jigging',
      effectiveness_score: 9,
      notes: 'Vertical jigging works excellent for cod',
    },
    {
      species_code: 'COD',
      technique: 'Bottom Fishing',
      effectiveness_score: 8,
      notes: 'Traditional method with good results',
    },
  ],
};

export const mockBait = {
  COD: [
    {
      species_code: 'COD',
      bait: 'Mackerel',
      effectiveness_score: 9,
      notes: 'Top choice for cod',
    },
    {
      species_code: 'COD',
      bait: 'Squid',
      effectiveness_score: 8,
      notes: 'Reliable option',
    },
  ],
};

export const mockSubstrates = {
  COD: [
    {
      species_code: 'COD',
      substrate: 'Rock',
      preference_score: 9,
    },
    {
      species_code: 'COD',
      substrate: 'Sand',
      preference_score: 7,
    },
  ],
};

export const mockPredictions = [
  {
    species_code: 'COD',
    species_name_en: 'Atlantic Cod',
    rectangle_code: '31E5',
    prediction_date: '2025-10-19',
    bite_score: 85,
    confidence_pct: 78,
    substrate_score: 8,
    bio_score: 7,
    weather_score: 9,
    techniques_json: ['Jigging', 'Bottom Fishing'],
    bait_json: ['Mackerel', 'Squid'],
    image_url: 'https://example.com/cod.jpg',
  },
  {
    species_code: 'BSS',
    species_name_en: 'European Bass',
    rectangle_code: '31E5',
    prediction_date: '2025-10-19',
    bite_score: 72,
    confidence_pct: 65,
    substrate_score: 7,
    bio_score: 8,
    weather_score: 7,
    techniques_json: ['Spinning', 'Float Fishing'],
    bait_json: ['Lure', 'Ragworm'],
    image_url: 'https://example.com/bass.jpg',
  },
];

export const mockRectangle = {
  code: '31E5',
  name: 'Falmouth & South Cornwall',
  region: 'English Channel',
  center_lat: 50.15,
  center_lon: -5.07,
  bounds: {
    south: 50.0,
    north: 50.3,
    west: -5.2,
    east: -4.9,
  },
};

export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  created_at: '2025-01-01T00:00:00Z',
};

export const mockSession = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: mockUser,
};

export const mockCatchLog = {
  id: 'catch-123',
  user_id: 'test-user-123',
  species_code: 'COD',
  rectangle_code: '31E5',
  caught: true,
  weight_kg: 2.5,
  length_cm: 45,
  technique: 'Jigging',
  bait: 'Mackerel',
  latitude: 50.15,
  longitude: -5.07,
  caught_at: '2025-10-19T10:30:00Z',
  created_at: '2025-10-19T10:35:00Z',
};
