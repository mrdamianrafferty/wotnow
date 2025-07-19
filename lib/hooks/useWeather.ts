import { useQuery } from '@tanstack/react-query';
import { weatherApi```from '../api/base';

export const useCurrentWeather = (lat: number, lon: number) => {
  return useQuery({
    queryKey: ['weather', 'current', lat, lon],
    queryFn: async () => {
      const response =```ait weatherApi.get('/weather', {
        params: { lat, lon, units: 'metric' }
      });
      return response```ta;
    },
    enabled: !!(lat && lon),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

