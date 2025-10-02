import { applySnowRecommendationScoring, type WeatherData, type MinimalActivity } from '../utils/activitySuitability';
import { getSnowActivityRecommendation } from '../utils/snowRecommendations';

// Basic fixtures
const baseActivity: MinimalActivity = {
  id: 'running',
  name: 'Running',
  category: 'Fitness & Wellness',
  weatherSensitive: true,
  tags: [],
};

const snowSport: MinimalActivity = {
  id: 'skiing',
  name: 'Skiing',
  category: 'Snow Sports',
  weatherSensitive: true,
  tags: ['snow'],
};

const clearWeather: WeatherData = {
  temperature: 5,
  precipitation: 0,
  windSpeed: 3,
  snowDepthCm: 0,
  snowfallRateMmH: 0,
};

describe('Snow-aware activity scoring', () => {
  test('non-snow activity gets penalty when snow depth is significant', () => {
    const weather: WeatherData = { ...clearWeather, snowDepthCm: 6 };
    const { score } = applySnowRecommendationScoring(baseActivity, weather, 70);
    expect(score).toBeLessThan(70);
  });

  test('non-snow activity unaffected when no snow', () => {
    const { score } = applySnowRecommendationScoring(baseActivity, clearWeather, 70);
    expect(score).toBe(70);
  });

  test('snow sport gets boosted with adequate snow', () => {
    const weather: WeatherData = { ...clearWeather, snowDepthCm: 60 };
    const { score } = applySnowRecommendationScoring(snowSport, weather, 50);
    expect(score).toBeGreaterThanOrEqual(65);
  });

  test('snowfall caution triggers cap on snow sport', () => {
    const weather: WeatherData = { ...clearWeather, snowDepthCm: 60, snowfallRateMmH: 12 };
    const { score } = applySnowRecommendationScoring(snowSport, weather, 90);
    expect(score).toBeLessThanOrEqual(89);
  });

  test('recommendation API returns unknown for unlisted activity', () => {
    const rec = getSnowActivityRecommendation('nonexistent', 10, 0);
    expect(rec.level).toBe('unknown');
  });
});
