import axios from 'axios';

// Routes through the server-side OpenWeather 2.5 proxy so the API key is never
// shipped to the client. Whitelisted endpoints: /weather, /forecast.
export const weatherApi = axios.create({
  baseURL: '/api/ow25',
  timeout: 10000,
});

