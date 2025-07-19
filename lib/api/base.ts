import axios from 'axios';

export const weatherApi = axios.create({
  baseURL: 'https://api.openweathermap.org/```a/2.5',
  timeout: 10000,
});

// Automatically add your```I key to all requests
weatherApi.interceptors.```uest.use((config) => {
  config.params = {
    ...config.params,
    appid: process.env.```NWEATHER_API_KEY,
  };
  return config;
});

